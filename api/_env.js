const fs = require('fs');
const path = require('path');

let envCached = null;

/**
 * Đọc biến môi trường từ Vercel Dashboard (process.env) 
 * hoặc tự động đọc từ file .env / .env.local trên đĩa.
 */
function getEnv(key, fallback = '') {
  // Ưu tiên 1: Đọc từ biến môi trường hệ thống Vercel
  if (process.env[key] !== undefined && process.env[key] !== '') {
    return process.env[key];
  }

  // Ưu tiên 2: Parse từ file .env nếu có
  if (!envCached) {
    envCached = {};
    const candidatePaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', '.env.local')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          raw.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIndex = trimmed.indexOf('=');
              if (eqIndex > 0) {
                const k = trimmed.slice(0, eqIndex).trim();
                let v = trimmed.slice(eqIndex + 1).trim();
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                  v = v.slice(1, -1);
                }
                envCached[k] = v;
              }
            }
          });
          break;
        } catch (e) {
          // Ignore read errors
        }
      }
    }
  }

  return envCached[key] !== undefined ? envCached[key] : fallback;
}

module.exports = { getEnv };
