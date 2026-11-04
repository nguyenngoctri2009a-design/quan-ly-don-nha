const { getEnv } = require('./_env');

function getClientIp(req) {
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'].trim();
  }
  if (req.headers['x-vercel-forwarded-for']) {
    return req.headers['x-vercel-forwarded-for'].split(',')[0].trim();
  }
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
}

// Bộ Rate Limiting trượt chống brute-force mã Reset (tối đa 15 lần / phút)
const verifyRateMap = new Map();
const VERIFY_WINDOW_MS = 60 * 1000;
const MAX_VERIFY_REQUESTS = 15;

function isVerifyRateLimited(ip) {
  const now = Date.now();
  const history = verifyRateMap.get(ip) || [];
  const recent = history.filter(ts => now - ts < VERIFY_WINDOW_MS);
  if (recent.length >= MAX_VERIFY_REQUESTS) {
    return true;
  }
  recent.push(now);
  verifyRateMap.set(ip, recent);
  if (verifyRateMap.size > 1000) {
    for (const [k, v] of verifyRateMap.entries()) {
      if (v.every(ts => now - ts >= VERIFY_WINDOW_MS)) verifyRateMap.delete(k);
    }
  }
  return false;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const clientIp = getClientIp(req);

  // Chống brute-force spam
  if (isVerifyRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: '⚠️ Bạn đã nhập sai mã bảo mật quá nhiều lần! Vui lòng chờ 1 phút trước khi thử lại.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const key = (body.key || '').trim();
  const validKey = (getEnv('SECURITY_RESET_KEY') || getEnv('RESET_KEY') || '2000').trim();

  if (key === validKey) {
    return res.status(200).json({
      success: true,
      message: 'Mã bảo mật hợp lệ!'
    });
  } else {
    return res.status(403).json({
      success: false,
      message: 'Sai mã bảo mật! Thao tác bị từ chối.'
    });
  }
};
