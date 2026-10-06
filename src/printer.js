const { BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function listPrinters() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  try {
    const list = await win.webContents.getPrintersAsync();
    return list.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: !!p.isDefault,
      status: p.status
    }));
  } finally {
    win.destroy();
  }
}

const PX_TO_MM = 0.2646;

/**
 * Imprime um HTML direto na impressora, sem janela de diálogo.
 * opts: { printer, html, copies, widthMm, heightMm }
 *  - widthMm informado: papel de bobina/etiqueta (altura automática se heightMm vazio)
 *  - sem widthMm: folha A4
 */
async function printHtml(opts) {
  const { printer, html, copies = 1, widthMm, heightMm } = opts || {};
  if (!printer || typeof printer !== 'string') throw new Error('Informe o nome da impressora');
  if (!html || typeof html !== 'string') throw new Error('Informe o conteúdo (html) a imprimir');
  if (Buffer.byteLength(html, 'utf8') > 5 * 1024 * 1024) throw new Error('Conteúdo grande demais');
  const parsedCopies = Math.max(1, Math.min(100, parseInt(copies, 10) || 1));
  if (widthMm && (!Number.isFinite(Number(widthMm)) || Number(widthMm) < 20 || Number(widthMm) > 320)) throw new Error('Largura de papel inválida');
  if (heightMm && (!Number.isFinite(Number(heightMm)) || Number(heightMm) < 10 || Number(heightMm) > 2000)) throw new Error('Altura de papel inválida');

  const installed = await listPrinters();
  if (!installed.some((p) => p.name === printer)) {
    throw new Error('Impressora não encontrada neste computador: ' + printer);
  }

  const css = '<style>@page{margin:0}html,body{margin:0}</style>';
  const doc = widthMm ? css + html : html;
  const tmp = path.join(os.tmpdir(), 'dmfv-print-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, '<meta charset="utf-8">' + doc);

  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });

  try {
    await win.loadFile(tmp);
    await win.webContents.executeJavaScript(`Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      ...Array.from(document.images).map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }))
    ])`);

    let pageSize = 'A4';
    if (widthMm) {
      let h = Number(heightMm);
      if (!h) {
        const px = await win.webContents.executeJavaScript('Math.ceil(document.documentElement.scrollHeight)');
        h = Math.ceil(px * PX_TO_MM) + 2;
      }
      pageSize = { width: Math.round(Number(widthMm) * 1000), height: Math.round(h * 1000) };
    }

    await new Promise((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          deviceName: printer,
          copies: parsedCopies,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize
        },
        (ok, reason) => (ok ? resolve() : reject(new Error(reason || 'Falha ao enviar para a impressora')))
      );
    });
  } finally {
    win.destroy();
    fs.unlink(tmp, () => {});
  }
}

module.exports = { listPrinters, printHtml };
