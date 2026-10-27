const { getEnv } = require('./_env');

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
