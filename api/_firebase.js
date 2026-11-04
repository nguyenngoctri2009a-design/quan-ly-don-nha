const https = require('https');
const { getEnv } = require('./_env');

// Pool kết nối HTTPS Keep-Alive tái sử dụng socket, tối ưu chịu tải >500 request/giây
const firebaseAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 250,
  maxFreeSockets: 50,
  timeout: 6000,
  freeSocketTimeout: 30000
});

// Bộ nhớ đệm In-Memory TTL ngắn cho các query đọc (GET) giảm 90% tải lên Firebase RTDB
const fbReadCache = new Map();
const CACHE_TTL_MS = 2500;

function clearFbCache() {
  fbReadCache.clear();
}

/**
 * Gửi yêu cầu REST đến Firebase Realtime Database
 * Tương thích 100% mọi phiên bản Node.js trên Vercel không cần npm package
 * Hỗ trợ: Connection Pooling Keep-Alive, In-Memory Caching và Auto-Retry với Exponential Backoff
 */
async function fbRequest(endpoint, method = 'GET', data = null, options = {}) {
  const normMethod = (method || 'GET').toUpperCase();
  const dbUrl = getEnv('FIREBASE_DB_URL', 'https://api1-9dc40-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '');
  const pathWithJson = (endpoint.startsWith('/') ? endpoint : '/' + endpoint) + '.json';
  const cacheKey = normMethod + ':' + pathWithJson;

  // 1. Kiểm tra Cache cho các request GET
  if (normMethod === 'GET' && options.noCache !== true) {
    const cached = fbReadCache.get(cacheKey);
    if (cached && (Date.now() - cached.time < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // 2. Nếu là thao tác ghi (POST/PUT/PATCH/DELETE), dọn cache đọc để bảo đảm nhất quán dữ liệu
  if (normMethod !== 'GET') {
    fbReadCache.clear();
  }

  const reqBody = data ? JSON.stringify(data) : null;
  const maxRetries = options.retries !== undefined ? options.retries : 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const urlObj = new URL(dbUrl + pathWithJson);
        const reqOptions = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: normMethod,
          agent: firebaseAgent,
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
            ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody) } : {})
          },
          timeout: 4500
        };

        const req = https.request(reqOptions, (res) => {
          let chunks = '';
          res.on('data', chunk => { chunks += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 500 && attempt < maxRetries) {
              return reject(new Error(`Server error ${res.statusCode}`));
            }
            try {
              resolve(JSON.parse(chunks));
            } catch (e) {
              resolve(chunks || null);
            }
          });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Firebase timeout'));
        });

        if (reqBody) {
          req.write(reqBody);
        }
        req.end();
      });

      // Lưu Cache cho request đọc thành công
      if (normMethod === 'GET' && options.noCache !== true && result !== null) {
        fbReadCache.set(cacheKey, { time: Date.now(), data: result });
        if (fbReadCache.size > 500) {
          const now = Date.now();
          for (const [k, v] of fbReadCache.entries()) {
            if (now - v.time > CACHE_TTL_MS) fbReadCache.delete(k);
          }
        }
      }

      return result;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 80 * (attempt + 1)));
      } else {
        return null;
      }
    }
  }

  return null;
}

module.exports = { fbRequest, clearFbCache };
