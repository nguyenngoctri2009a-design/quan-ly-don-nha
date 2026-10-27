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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const unlockKey = (body.unlockKey || body.key || body.password || '').trim();
  const deviceId = (body.deviceId || '').trim();
  const clientIp = (body.ip || getClientIp(req)).trim();

  // MẬT KHẨU MỞ KHÓA HỢP LỆ: 01062009, mật khẩu Đại ca (tri123456@) hoặc mật khẩu Admin mới (vit123456@)
  const adminPass = getEnv('ADMIN_PASS', 'vit123456@').trim();
  const triPass = getEnv('ADMIN_TRI_PASS', 'tri123456@').trim();
  const masterUnlockKey = getEnv('MASTER_UNLOCK_KEY', '01062009').trim();

  const validKeys = [masterUnlockKey, '01062009', adminPass, 'vit123456@', triPass];

  if (!validKeys.includes(unlockKey)) {
    return res.status(403).json({
      success: false,
      message: '❌ Sai mật khẩu mở khóa khẩn cấp! Thao tác bị từ chối.'
    });
  }

  const safeMid = sanitizeKey(deviceId);
  const cleanMid = safeMid.replace(/^dev_/, '');
  const safeIp = sanitizeKey(clientIp);

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
