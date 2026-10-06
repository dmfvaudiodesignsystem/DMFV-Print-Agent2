const { app, BrowserWindow, Tray, Menu, nativeImage, shell, clipboard, Notification, ipcMain } = require('electron');
const path = require('path');
const { loadConfig, saveConfig, configPath } = require('./src/config');
const { startServer } = require('./src/server');
const printer = require('./src/printer');
const { testPage, SIZES } = require('./src/testpage');

if (!app.requestSingleInstanceLock()) app.quit();

// Sem janelas visíveis: o app vive na bandeja e não pode fechar sozinho.
app.on('window-all-closed', () => {});
if (app.dock) app.dock.hide();

let tray = null;
let dashboard = null;
let server = null;
let config = null;
let printers = [];
const state = { online: false, error: '', jobs: [], queue: [] };
let printChain = Promise.resolve();
let nextJobId = 1;

function enqueuePrint(opts) {
  const job = { id: nextJobId++, printer: opts.printer, kind: 'Impressão', time: new Date().toLocaleTimeString('pt-BR') };
  state.queue.push(job);
  const execute = async () => {
    try {
      await printer.printHtml(opts);
    } finally {
      state.queue = state.queue.filter((item) => item.id !== job.id);
    }
  };
  const result = printChain.then(execute, execute);
  printChain = result.catch(() => {});
  return result;
}

const queuedPrinter = { listPrinters: printer.listPrinters, printHtml: enqueuePrint };

function publicState() {
  return {
    online: state.online,
    error: state.error,
    jobs: state.jobs,
    queue: state.queue,
    printers,
    config,
    version: app.getVersion(),
    address: `http://127.0.0.1:${config.port}`
  };
}

function openDashboard() {
  if (dashboard && !dashboard.isDestroyed()) {
    dashboard.show();
    dashboard.focus();
    return;
  }
  dashboard = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 880,
    minHeight: 650,
    title: 'DMFV Print Agent',
    backgroundColor: '#07101c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  dashboard.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  dashboard.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboard.hide();
    }
  });
}

function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}

function pushJob(job) {
  const time = new Date().toLocaleTimeString('pt-BR');
  state.jobs.unshift({ ...job, time });
  state.jobs = state.jobs.slice(0, 8);
  if (!job.ok) notify('Falha na impressão', job.error || 'Erro desconhecido');
  buildMenu();
  if (dashboard && !dashboard.isDestroyed()) dashboard.webContents.send('dashboard:changed');
}

async function runTest(name, kind) {
  try {
    const t = testPage(name, kind);
    await queuedPrinter.printHtml({ printer: name, html: t.html, widthMm: t.widthMm, heightMm: t.heightMm });
    pushJob({ printer: name, ok: true, kind: 'Teste' });
  } catch (e) {
    pushJob({ printer: name, ok: false, error: e.message });
  }
}

async function refreshPrinters() {
  try {
    printers = await printer.listPrinters();
    if (config?.autoDetect && printers.length) {
      const text = (p) => `${p.name} ${p.displayName}`.toLowerCase();
      const find = (...terms) => printers.find((p) => terms.some((term) => text(p).includes(term)));
      const choose = (profile, candidate) => {
        if (!config.profiles[profile].printer && candidate) config.profiles[profile].printer = candidate.name;
      };
      choose('label', find('zebra', 'zpl', 'tspl', 'etiqueta', 'label'));
      choose('receipt58', find('58mm', '58 mm', 'mp-4200', 'tm-t88'));
      choose('receipt80', find('80mm', '80 mm', 'tm-t20', 'daruma', 'bematech'));
      choose('a4', find('laserjet', 'deskjet', 'epson l', 'canon', 'a4', 'pdf'));
      saveConfig(config);
    }
  } catch (e) {
    printers = [];
  }
  buildMenu();
}

function buildMenu() {
  if (!tray) return;
  const address = `http://127.0.0.1:${config.port}`;
  const statusLabel = state.online ? 'Conectado e pronto' : 'Parado: ' + (state.error || 'servidor local não iniciou');

  const testItems = printers.length
    ? printers.map((p) => ({
        label: p.displayName + (p.isDefault ? ' (padrão)' : ''),
        submenu: Object.keys(SIZES).map((k) => ({ label: SIZES[k].label, click: () => runTest(p.name, k) }))
      }))
    : [{ label: 'Nenhuma impressora encontrada', enabled: false }];

  const jobItems = state.jobs.length
    ? state.jobs.map((j) => ({
        label: `${j.time}  ${j.ok ? 'OK' : 'ERRO'}  ${j.printer || ''}`,
        enabled: false
      }))
    : [{ label: 'Nada impresso ainda', enabled: false }];

  const menu = Menu.buildFromTemplate([
    { label: 'Agente DMFV', enabled: false },
    { label: statusLabel, enabled: false },
    { label: `Impressoras encontradas: ${printers.length}`, enabled: false },
    { type: 'separator' },
    { label: 'Abrir painel', click: openDashboard },
    { label: 'Imprimir teste', submenu: testItems },
    { label: 'Últimas impressões', submenu: jobItems },
    { label: 'Atualizar lista de impressoras', click: refreshPrinters },
    { type: 'separator' },
    { label: 'Copiar endereço do agente', click: () => clipboard.writeText(address) },
    { label: 'Abrir pasta de configuração', click: () => shell.showItemInFolder(configPath()) },
    {
      label: 'Iniciar com o Windows',
      type: 'checkbox',
      checked: !!config.autostart,
      click: (item) => {
        config.autostart = item.checked;
        saveConfig(config);
        app.setLoginItemSettings({ openAtLogin: config.autostart });
      }
    },
    { type: 'separator' },
    { label: 'Sair', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('DMFV Print Agent - ' + (state.online ? 'conectado' : 'parado'));
}

app.whenReady().then(async () => {
  config = loadConfig();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!config.autostart });

  const icon = nativeImage
    .createFromPath(path.join(__dirname, 'assets', 'icon.png'))
    .resize({ width: 32, height: 32, quality: 'best' });
  tray = new Tray(icon);

  try {
    server = await startServer({ config, printer: queuedPrinter, testPage, version: app.getVersion(), onJob: pushJob });
    state.online = true;
  } catch (e) {
    state.error = e.code === 'EADDRINUSE' ? `porta ${config.port} já está em uso` : e.message;
    notify('DMFV Print Agent', 'Não foi possível iniciar: ' + state.error);
  }

  await refreshPrinters();
  if (!app.isPackaged) openDashboard();
});

ipcMain.handle('dashboard:get-state', () => publicState());
ipcMain.handle('dashboard:refresh-printers', async () => {
  await refreshPrinters();
  return publicState();
});
ipcMain.handle('dashboard:save-config', async (_event, patch) => {
  config = {
    ...config,
    ...patch,
    appearance: { ...config.appearance, ...(patch.appearance || {}) },
    profiles: { ...config.profiles, ...(patch.profiles || {}) }
  };
  saveConfig(config);
  app.setLoginItemSettings({ openAtLogin: !!config.autostart });
  buildMenu();
  return publicState();
});
ipcMain.handle('dashboard:test-profile', async (_event, key) => {
  const profile = config.profiles[key];
  if (!profile?.printer) throw new Error('Selecione uma impressora para este perfil');
  const kind = key === 'receipt80' ? 'cupom80' : key === 'receipt58' ? 'cupom58' : key === 'label' ? 'etiqueta' : 'a4';
  await runTest(profile.printer, kind);
  return publicState();
});
ipcMain.handle('dashboard:open-config-folder', () => shell.showItemInFolder(configPath()));

app.on('second-instance', () => openDashboard());
app.on('before-quit', () => { app.isQuitting = true; });
