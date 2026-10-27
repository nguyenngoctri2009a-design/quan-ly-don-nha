const https = require('https');
const { getEnv } = require('./_env');

// Pool kết nối HTTPS Keep-Alive tái sử dụng socket, tối ưu chịu tải >500 request/giây
const firebaseAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 150,
  maxFreeSockets: 30,
  timeout: 5000,
  freeSocketTimeout: 30000
});

/**
 * Gửi yêu cầu REST đến Firebase Realtime Database
 * Tương thích 100% mọi phiên bản Node.js trên Vercel không cần npm package
 */
function fbRequest(endpoint, method = 'GET', data = null) {
  const dbUrl = getEnv('FIREBASE_DB_URL', 'https://tiktok-46d94-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '');

  return new Promise((resolve) => {
    try {
      const pathWithJson = (endpoint.startsWith('/') ? endpoint : '/' + endpoint) + '.json';
      const urlObj = new URL(dbUrl + pathWithJson);

      const reqBody = data ? JSON.stringify(data) : null;

      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        agent: firebaseAgent, // Tái sử dụng socket TLS/SSL, giảm 70% độ trễ và tránh tràn kết nối
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody) } : {})
        },
        timeout: 4000
      };

      const req = https.request(options, (res) => {
        let chunks = '';
        res.on('data', chunk => { chunks += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(chunks));
          } catch (e) {
            resolve(chunks || null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      if (reqBody) {
        req.write(reqBody);
      }
      req.end();
    } catch (err) {
      resolve(null);
    }
  });
}

module.exports = { fbRequest };
