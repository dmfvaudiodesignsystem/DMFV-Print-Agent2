const SIZES = {
  cupom80: { widthMm: 80, label: 'Cupom 80 mm' },
  cupom58: { widthMm: 58, label: 'Cupom 58 mm' },
  etiqueta: { widthMm: 40, heightMm: 25, label: 'Etiqueta 40 x 25 mm' },
  a4: { label: 'Folha A4' }
};

function testPage(printerName, kind) {
  const s = SIZES[kind] || SIZES.cupom80;
  const small = kind === 'etiqueta';
  const pad = small ? '1.5mm' : '4mm';
  const fs = small ? '8px' : '13px';
  const now = new Date().toLocaleString('pt-BR');
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:${fs};padding:${pad};color:#000}
    h1{font-size:${small ? '10px' : '18px'};margin:0 0 4px;text-align:center}
    p{margin:2px 0;text-align:center}
    .l{border-top:1px dashed #000;margin:${small ? '2px' : '6px'} 0}
  </style></head><body>
    <h1>DMFV STORE</h1>
    <p>Teste de impressão</p>
    <div class="l"></div>
    <p>${esc(s.label)}</p>
    <p>${esc(printerName)}</p>
    <p>${esc(now)}</p>
    ${small ? '' : '<div class="l"></div><p>Se você está lendo isto,</p><p>a impressora está conectada.</p>'}
  </body></html>`;
  return { html, widthMm: s.widthMm, heightMm: s.heightMm };
}

module.exports = { testPage, SIZES };
