const { getEnv } = require('./_env');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = req.headers['x-real-ip'] || 
                   (req.headers['x-vercel-forwarded-for'] ? req.headers['x-vercel-forwarded-for'].split(',')[0].trim()) || 
                   (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim()) || 
                   req.socket?.remoteAddress || '127.0.0.1';

  const FIREBASE_DB_URL = getEnv('FIREBASE_DB_URL', 'https://tiktok-46d94-default-rtdb.asia-southeast1.firebasedatabase.app');

  return res.status(200).json({
    firebaseDbUrl: FIREBASE_DB_URL,
    clientIp: clientIp
  });
};
