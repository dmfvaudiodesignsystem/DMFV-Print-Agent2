// Cliente do agente DMFV para usar dentro do seu sistema web.
// Copie este arquivo para o projeto (ex.: src/lib/dmfv-printer.js).

let BASE = 'http://127.0.0.1:9101';
let TOKEN = '';

export function configure({ port = 9101, token = '' } = {}) {
  BASE = `http://127.0.0.1:${port}`;
  TOKEN = token;
}

async function call(path, { method = 'GET', body, timeout = 5000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { 'X-DMFV-Token': TOKEN } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Erro ao falar com o agente');
    return data;
  } catch (e) {
    if (e.name === 'AbortError' || e instanceof TypeError) {
      throw new Error('Agente de impressão não encontrado. Verifique se o DMFV Print Agent está aberto neste computador.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// true se o agente está rodando neste computador
export async function isOnline() {
  try {
    await call('/status', { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

// [{ name, displayName, isDefault, status }]
export async function listPrinters() {
  return (await call('/printers')).printers;
}

// kind: 'cupom80' | 'cupom58' | 'etiqueta' | 'a4'
export function printTest(printer, kind = 'cupom80') {
  return call('/test', { method: 'POST', body: { printer, kind } });
}

// widthMm: 80, 58, 40... (bobina/etiqueta). Sem widthMm = folha A4.
// heightMm: opcional; se vazio, o agente mede o conteúdo (bom para cupom).
export function printHtml({ printer, html, copies = 1, widthMm, heightMm }) {
  return call('/print', { method: 'POST', body: { printer, html, copies, widthMm, heightMm }, timeout: 20000 });
}
