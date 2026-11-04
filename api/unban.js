const { getEnv } = require('./_env');
const { fbRequest } = require('./_firebase');

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

function sanitizeKey(str) {
  return String(str || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

// Bộ Rate Limiting trượt chống brute-force mở khóa máy (tối đa 15 lần / phút)
const unbanRateMap = new Map();
const UNBAN_WINDOW_MS = 60 * 1000;
const MAX_UNBAN_REQUESTS = 15;

function isUnbanRateLimited(ip) {
  const now = Date.now();
  const history = unbanRateMap.get(ip) || [];
  const recent = history.filter(ts => now - ts < UNBAN_WINDOW_MS);
  if (recent.length >= MAX_UNBAN_REQUESTS) {
    return true;
  }
  recent.push(now);
  unbanRateMap.set(ip, recent);
  if (unbanRateMap.size > 1000) {
    for (const [k, v] of unbanRateMap.entries()) {
      if (v.every(ts => now - ts >= UNBAN_WINDOW_MS)) unbanRateMap.delete(k);
    }
  }
  return false;
}

module.exports = async (req, res) => {
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

  // Bảo vệ Rate Limit
  if (isUnbanRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: '⚠️ Bạn đã gửi quá nhiều yêu cầu mở khóa! Vui lòng chờ 1 phút trước khi thử lại.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const unlockKey = (body.unlockKey || body.key || body.password || '').trim();
  const deviceId = (body.deviceId || '').trim();
  const targetIp = (body.ip || clientIp).trim();

  // MẬT KHẨU MỞ KHÓA HỢP LỆ: 01062009 hoặc mật khẩu của các Admin
  const triPass = getEnv('ADMIN_TRI_PASS', 'tri123456@').trim();
  const cuuMuoiPass = getEnv('ADMIN_CUUMUOI_PASS', 'cuumuoi123@').trim();
  const masterUnlockKey = getEnv('MASTER_UNLOCK_KEY', '01062009').trim();

  const validKeys = [masterUnlockKey, '01062009', triPass, cuuMuoiPass];

  if (!validKeys.includes(unlockKey)) {
    return res.status(403).json({
      success: false,
      message: '❌ Sai mật khẩu mở khóa khẩn cấp! Thao tác bị từ chối.'
    });
  }

  const safeMid = sanitizeKey(deviceId);
  const cleanMid = safeMid.replace(/^dev_/, '');
  const safeIp = sanitizeKey(targetIp);

  // Xóa sạch toàn bộ bản ghi khóa trên Firebase Realtime Database
  await Promise.all([
    safeMid ? fbRequest(`security/locks/dev_${safeMid}`, 'DELETE') : Promise.resolve(),
    cleanMid ? fbRequest(`security/locks/dev_${cleanMid}`, 'DELETE') : Promise.resolve(),
    safeMid ? fbRequest(`banned_devices/ban_${safeMid}`, 'DELETE') : Promise.resolve(),
    cleanMid ? fbRequest(`banned_devices/ban_dev_${cleanMid}`, 'DELETE') : Promise.resolve(),
    cleanMid ? fbRequest(`banned_devices/ban_${cleanMid}`, 'DELETE') : Promise.resolve(),
    safeIp ? fbRequest(`security/locks/ip_${safeIp}`, 'DELETE') : Promise.resolve(),
    safeIp ? fbRequest(`banned_devices/ban_ip_${safeIp}`, 'DELETE') : Promise.resolve(),
    safeIp ? fbRequest(`banned_devices/ban_${safeIp}`, 'DELETE') : Promise.resolve(),
    fbRequest(`security/locks/ip_127_0_0_1`, 'DELETE'),
    fbRequest(`banned_devices/ban_ip_127_0_0_1`, 'DELETE')
  ]);

  return res.status(200).json({
    success: true,
    message: '✅ Xác thực mật khẩu mở khóa thành công! Đã gỡ lệnh cấm cho thiết bị & IP.'
  });
};
