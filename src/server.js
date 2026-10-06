const http = require('http');

const MAX_BODY = 5 * 1024 * 1024;

function startServer({ config, printer, testPage, version, onJob }) {
  const originAllowed = (origin) => {
    if (!origin) return true; // chamadas sem origem (curl, testes locais)
    if (!config.allowedOrigins || !config.allowedOrigins.length) return true;
    return config.allowedOrigins.includes(origin);
  };

  const send = (res, status, body, headers) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(new Error('Conteúdo grande demais'));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
        } catch (e) {
          reject(new Error('JSON inválido'));
        }
      });
      req.on('error', reject);
    });

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = {
      'Access-Control-Allow-Origin': origin || '*',
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-DMFV-Token',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600'
    };

    if (!originAllowed(origin)) return send(res, 403, { ok: false, error: 'Origem não permitida' }, cors);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }

    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    let jobPrinter = '';

    try {
      if (req.method === 'GET' && path === '/status') {
        return send(res, 200, { ok: true, name: 'DMFV Print Agent', version, tokenRequired: !!config.token }, cors);
      }

      if (config.token && req.headers['x-dmfv-token'] !== config.token) {
        return send(res, 401, { ok: false, error: 'Token inválido' }, cors);
      }

      if (req.method === 'GET' && path === '/printers') {
        return send(res, 200, { ok: true, printers: await printer.listPrinters() }, cors);
      }

      if (req.method === 'POST' && path === '/print') {
        const b = await readBody(req);
        jobPrinter = b.printer;
        await printer.printHtml(b);
        onJob({ printer: b.printer, ok: true, kind: 'Impressão' });
        return send(res, 200, { ok: true }, cors);
      }

      if (req.method === 'POST' && path === '/test') {
        const b = await readBody(req);
        jobPrinter = b.printer;
        const t = testPage(b.printer, b.kind);
        await printer.printHtml({ printer: b.printer, html: t.html, widthMm: t.widthMm, heightMm: t.heightMm });
        onJob({ printer: b.printer, ok: true, kind: 'Teste' });
        return send(res, 200, { ok: true }, cors);
      }

      return send(res, 404, { ok: false, error: 'Rota não encontrada' }, cors);
    } catch (e) {
      onJob({ printer: jobPrinter, ok: false, error: e.message });
      return send(res, 500, { ok: false, error: e.message }, cors);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = { startServer };
