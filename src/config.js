const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { DEFAULT_API_BASE_URL } = require('./constants');

const DEFAULTS = {
  port: 9101,
  // Endereços do seu sistema que podem usar o agente. Vazio = qualquer site (bom só para testes).
  // Exemplo: ["https://app.seudominio.com.br"]
  allowedOrigins: [],
  // Se preencher, o sistema precisa mandar o mesmo valor no cabeçalho X-DMFV-Token.
  token: '',
  autostart: true,
  apiBaseUrl: DEFAULT_API_BASE_URL,
  autoDetect: true,
  silentPrinting: true,
  fallbackToBrowser: true,
  appearance: {
    theme: 'dark',
    accent: '#2f7df6'
  },
  profiles: {
    receipt80: { printer: '', widthMm: 80 },
    receipt58: { printer: '', widthMm: 58 },
    label: { printer: '', widthMm: 40, heightMm: 25 },
    a4: { printer: '' }
  }
};

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

function loadConfig() {
  try {
    if (!fs.existsSync(configPath())) {
      saveConfig(DEFAULTS);
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return {
      ...DEFAULTS,
      ...parsed,
      appearance: { ...DEFAULTS.appearance, ...(parsed.appearance || {}) },
      profiles: {
        receipt80: { ...DEFAULTS.profiles.receipt80, ...(parsed.profiles?.receipt80 || {}) },
        receipt58: { ...DEFAULTS.profiles.receipt58, ...(parsed.profiles?.receipt58 || {}) },
        label: { ...DEFAULTS.profiles.label, ...(parsed.profiles?.label || {}) },
        a4: { ...DEFAULTS.profiles.a4, ...(parsed.profiles?.a4 || {}) }
      }
    };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

module.exports = { loadConfig, saveConfig, configPath };
