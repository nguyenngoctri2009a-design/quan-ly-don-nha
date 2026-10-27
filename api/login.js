const { getEnv } = require('./_env');
const { fbRequest } = require('./_firebase');

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 giờ (1 ngày)
const MAX_ATTEMPTS = 3; // Tối đa 3 lần nhập sai

/**
 * Lấy địa chỉ IP thật của người dùng và chống Fake IP:
 * Vercel Edge Proxy cung cấp header x-real-ip đã được xác thực ở tầng mạng (Layer 7 Cloudflare/Vercel)
 */
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

function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  if (mins > 0) return `${mins} phút ${secs} giây`;
  return `${secs} giây`;
}

// Bộ giới hạn tốc độ truy cập trượt (Sliding-window Rate Limiter) chống bão request & DDOS
const loginRateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Cửa sổ 1 phút
const MAX_REQUESTS_PER_WINDOW = 30; // Tối đa 30 request/phút trên mỗi IP

function isRateLimited(ip) {
  const now = Date.now();
  const history = loginRateMap.get(ip) || [];
  const recent = history.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  recent.push(now);
  loginRateMap.set(ip, recent);
  if (loginRateMap.size > 2000) {
    for (const [k, v] of loginRateMap.entries()) {
      if (v.every(ts => now - ts >= RATE_LIMIT_WINDOW_MS)) {
        loginRateMap.delete(k);
      }
    }
  }
  return false;
}

module.exports = async (req, res) => {
  // CORS Headers
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

  // Phân luồng chống quá tải / DDOS khi 500+ người cùng lúc vào spam
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: '⚠️ Hệ thống đang ghi nhận quá nhiều lượt thử đăng nhập từ mạng này! Vui lòng chờ 1 phút để tiếp tục.'
    });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  const deviceId = (body.deviceId || '').trim();

  const ipKey = 'ip_' + sanitizeKey(clientIp);
  const cleanDevId = deviceId ? sanitizeKey(deviceId).replace(/^dev_/, '') : '';
  const devKey = cleanDevId ? 'dev_' + cleanDevId : null;

  const now = Date.now();

  // 1. KIỂM TRA TRẠNG THÁI KHÓA TRÊN FIREBASE (KHÓA KÉP IP + DEVICE ID)
  const [ipData, devData] = await Promise.all([
    fbRequest(`security/locks/${ipKey}`),
    devKey ? fbRequest(`security/locks/${devKey}`) : Promise.resolve(null)
  ]);

  const activeLock = [ipData, devData].find(d => d && d.lockedUntil && now < d.lockedUntil);
  if (activeLock) {
    const remainingMs = activeLock.lockedUntil - now;
    return res.status(403).json({
      success: false,
      locked: true,
      remainingMs: remainingMs,
      message: `🚫 Thiết bị này đã bị KHÓA 1 NGÀY (còn lại: ${formatRemainingTime(remainingMs)}) do nhập sai mật khẩu 3 lần!`
    });
  }

  // 2. TÍNH TOÁN SỐ LẦN ĐÃ THỬ SAI HIỆN TẠI
  const ipAttempts = (ipData && (!ipData.lockedUntil || now >= ipData.lockedUntil)) ? (Number(ipData.attempts) || 0) : 0;
  const devAttempts = (devData && (!devData.lockedUntil || now >= devData.lockedUntil)) ? (Number(devData.attempts) || 0) : 0;
  const currentFails = Math.max(ipAttempts, devAttempts);

  // 3. ĐỌC CẤU HÌNH ADMIN TỪ BIẾN MÔI TRƯỜNG (.ENV)
  const newAdminUser = getEnv('ADMIN_NEW_USER', 'admin').trim();
  const newAdminPass = getEnv('ADMIN_NEW_PASS', 'vit123456@').trim();

  const triUser = getEnv('ADMIN_TRI_USER', 'admin').trim();
  const triPass = getEnv('ADMIN_TRI_PASS', 'tri123456@').trim();
  const triName = getEnv('ADMIN_TRI_NAME', 'Nguyễn Trí').trim();
  const triRole = getEnv('ADMIN_TRI_ROLE', 'owner').trim();

  const fallbackUser = getEnv('ADMIN_USER', 'admin').trim();
  const fallbackPass = getEnv('ADMIN_PASS', 'tri123456@').trim();

  const AUTH_SECRET = getEnv('AUTH_SECRET', 'luoibua_super_secret_jwt_key_2026');

  // Danh sách tài khoản admin: Đại ca Nguyễn Trí (tri123456@) và Admin mới (vit123456@)
  const ADMIN_ACCOUNTS = [
    {
      usernames: [triUser.toLowerCase(), 'nguyentri'],
      password: triPass,
      name: triName,
      role: triRole
    },
    {
      usernames: ['admin', newAdminUser.toLowerCase()],
      password: newAdminPass,
      name: 'Admin',
      role: 'owner'
    },
    {
      usernames: [fallbackUser.toLowerCase()],
      password: fallbackPass,
      name: triName,
      role: 'owner'
    }
  ];

  const inputUser = username.toLowerCase();
  const matchedAdmin = ADMIN_ACCOUNTS.find(acc =>
    acc.usernames.includes(inputUser) && acc.password === password
  );

  // 4. KIỂM TRA THÔNG TIN ĐĂNG NHẬP
  if (matchedAdmin) {
    // Đăng nhập thành công -> Xóa sạch lịch sử nhập sai của IP và thiết bị này
    Promise.all([
      fbRequest(`security/locks/${ipKey}`, 'DELETE'),
      devKey ? fbRequest(`security/locks/${devKey}`, 'DELETE') : Promise.resolve()
    ]).catch(() => {});

    const payload = `${username}:${matchedAdmin.name}:${matchedAdmin.role}:${now}:${AUTH_SECRET}`;
    const token = Buffer.from(payload).toString('base64');

    return res.status(200).json({
      success: true,
      message: `Chào mừng ${matchedAdmin.name} đã đăng nhập thành công!`,
      adminName: matchedAdmin.name,
      adminRole: matchedAdmin.role,
      token: token
    });
  }

  // 5. NẾU NHẬP SAI: GHI NHẬN SỐ LẦN SAI VÀ KHÓA KHI ĐẠT 3 LẦN
  const newFails = currentFails + 1;

  if (newFails >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCK_DURATION_MS;
    const lockPayload = {
      ip: clientIp,
      deviceId: deviceId,
      attempts: newFails,
      lockedUntil: lockedUntil,
      lockedAt: now,
      reason: 'Nhập sai mật khẩu quản trị quá 3 lần'
    };


    const banKey = 'ban_' + (devKey || ipKey);
    const banRecord = {
      key: banKey,
      target: deviceId || clientIp,
      machineId: deviceId,
      ip: clientIp,
      reason: 'Nhập sai mật khẩu quản trị quá 3 lần',
      bannedAt: now,
      bannedUntil: lockedUntil,
      durationText: '1 Ngày (24 giờ)',
      bannedBy: 'Hệ Thống Tự Động',
      status: 'active'
    };

    const ipBanRecord = {
      ...banRecord,
      key: `ban_${ipKey}`,
      target: clientIp
    };

    // Khóa đồng thời cả IP và Device ID trên Firebase Realtime Database và thêm vào danh sách Ban Máy (chặn cả khi qua Chrome khác)
    await Promise.all([
      fbRequest(`security/locks/${ipKey}`, 'PUT', lockPayload),
      devKey ? fbRequest(`security/locks/${devKey}`, 'PUT', lockPayload) : Promise.resolve(),
      fbRequest(`banned_devices/${banKey}`, 'PUT', banRecord),
      ipKey ? fbRequest(`banned_devices/ban_${ipKey}`, 'PUT', ipBanRecord) : Promise.resolve()
    ]);

    return res.status(403).json({
      success: false,
      locked: true,
      remainingMs: LOCK_DURATION_MS,
      message: '🚨 Bạn đã nhập sai mật khẩu quá 3 lần! Máy của bạn đã bị KHÓA 1 NGÀY (24 giờ). Không thể truy cập vào website!'
    });
  } else {
    const remainingTries = MAX_ATTEMPTS - newFails;
    const attemptPayload = {
      ip: clientIp,
      deviceId: deviceId,
      attempts: newFails,
      lastAttempt: now
    };

    // Cập nhật số lần thử sai lên Firebase
    await Promise.all([
      fbRequest(`security/locks/${ipKey}`, 'PUT', attemptPayload),
      devKey ? fbRequest(`security/locks/${devKey}`, 'PUT', attemptPayload) : Promise.resolve()
    ]);

    return res.status(401).json({
      success: false,
      locked: false,
      remainingAttempts: remainingTries,
      message: `Tài khoản hoặc mật khẩu không đúng! Cảnh báo: Bạn chỉ còn ${remainingTries} lần thử nữa trước khi bị KHÓA 1 NGÀY.`
    });
  }
};
