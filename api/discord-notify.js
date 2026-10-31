const https = require('https');
const { getEnv } = require('./_env');

// Discord Bot Token & Channel IDs theo yêu cầu của Đại ca
const DEFAULT_BOT_TOKEN = Buffer.from('TVRVMk1UazROREkzTlRVNE5UTXdNall4T1EuR2VsaEdwLmNRWllJRFBic0pCU2lyeDdqWmhrLUlSVnNqOGpLZW51M0FqaFE0', 'base64').toString('utf-8');
const DEFAULT_CHANNEL_DAILY = '1561985181802569761';
const DEFAULT_CHANNEL_WEEKLY = '1561985096943276042';
const DEFAULT_CHANNEL_FUND = '1561985235422281760';
const DEFAULT_CHANNEL_BACKUP = '1562063584496844841';
const DEFAULT_CHANNEL_CERT = '1566023759343779871';

const BOT_CLIENT_ID = '1561984275585302619';
const BOT_INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot`;

/**
 * Gửi tin nhắn và file ảnh lên Discord REST API v10 sử dụng Buffer và https native của Node.js
 */
function sendToDiscordChannel({ botToken, channelId, content, embeds, imageBase64, filename = 'report.png', extraFile }) {
  return new Promise((resolve) => {
    try {
      const boundary = '----CrewDiscordBoundary' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      let imageBuffer = null;
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(cleanBase64, 'base64');
      }

      const payload = {
        content: content || '',
        embeds: embeds || []
      };
      payload.attachments = [];

      let attachIdx = 0;
      if (imageBuffer) {
        payload.attachments.push({ id: attachIdx, filename: filename, description: 'Bản báo cáo chính thức' });
        attachIdx++;
      }
      if (extraFile && extraFile.content) {
        payload.attachments.push({ id: attachIdx, filename: extraFile.filename || 'du-lieu.csv', description: 'File dữ liệu' });
        attachIdx++;
      }

      const payloadJson = JSON.stringify(payload);
      const bodyBuffers = [];

      // Phần 1: payload_json
      bodyBuffers.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="payload_json"\r\n` +
        `Content-Type: application/json; charset=utf-8\r\n\r\n` +
        `${payloadJson}\r\n`
      ));

      // Phần 2: files[0] (nếu có đính kèm ảnh)
      let fileCount = 0;
      if (imageBuffer) {
        bodyBuffers.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files[${fileCount}]"; filename="${filename}"\r\n` +
          `Content-Type: image/png\r\n\r\n`
        ));
        bodyBuffers.push(imageBuffer);
        bodyBuffers.push(Buffer.from('\r\n'));
        fileCount++;
      }

      // Phần 3: extraFile (nếu có đính kèm file CSV/Excel)
      if (extraFile && extraFile.content) {
        const extraBuffer = Buffer.from(extraFile.content, 'utf-8');
        const extraName = extraFile.filename || 'du-lieu.csv';
        bodyBuffers.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files[${fileCount}]"; filename="${extraName}"\r\n` +
          `Content-Type: ${extraFile.type || 'text/csv; charset=utf-8'}\r\n\r\n`
        ));
        bodyBuffers.push(extraBuffer);
        bodyBuffers.push(Buffer.from('\r\n'));
        fileCount++;
      }

      bodyBuffers.push(Buffer.from(`--${boundary}--\r\n`));
      const totalBody = Buffer.concat(bodyBuffers);

      const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v10/channels/${channelId}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalBody.length,
          'User-Agent': 'CrewLuoiBua-Bot/2.0'
        },
        timeout: 20000
      };

      const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', chunk => { rawData += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = { raw: rawData };
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, status: res.statusCode, data: parsed });
          } else {
            let errorMsg = parsed.message || `Lỗi HTTP ${res.statusCode}`;
            if (res.statusCode === 403 || parsed.code === 50001) {
              errorMsg = `Bot "THÔNG BÁO" chưa có trong Server hoặc chưa có quyền gửi tin nhắn trong kênh ID ${channelId}! Vui lòng bấm vào liên kết sau để thêm Bot vào Server: ${BOT_INVITE_URL}`;
            } else if (res.statusCode === 404 || parsed.code === 10003) {
              errorMsg = `Không tìm thấy kênh Discord ID ${channelId}. Vui lòng kiểm tra lại ID kênh!`;
            }
            resolve({
              success: false,
              status: res.statusCode,
              code: parsed.code,
              error: parsed,
              message: errorMsg,
              inviteUrl: BOT_INVITE_URL
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message, message: 'Lỗi kết nối tới máy chủ Discord: ' + err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request Timeout', message: 'Hết thời gian chờ phản hồi từ Discord (Timeout)' });
      });

      req.write(totalBody);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message, message: 'Lỗi chuẩn bị dữ liệu gửi Discord: ' + err.message });
    }
  });
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
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ (Chỉ chấp nhận POST)' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const { type = 'daily', customChannelId, imageBase64, title, date, stats, customContent, description } = body;

    const botToken = getEnv('DISCORD_BOT_TOKEN', DEFAULT_BOT_TOKEN);
    let targetChannelId = customChannelId;

    if (!targetChannelId) {
      if (type === 'cert' || type === 'award' || type === 'vinh_danh') {
        targetChannelId = getEnv('DISCORD_CHANNEL_CERT', DEFAULT_CHANNEL_CERT);
      } else if (type === 'daily' || type === 'records_daily') {
        targetChannelId = getEnv('DISCORD_CHANNEL_DAILY', DEFAULT_CHANNEL_DAILY);
      } else if (type === 'weekly' || type === 'records_weekly') {
        targetChannelId = getEnv('DISCORD_CHANNEL_WEEKLY', DEFAULT_CHANNEL_WEEKLY);
      } else if (type === 'fund' || type === 'fund_weekly') {
        targetChannelId = getEnv('DISCORD_CHANNEL_FUND', DEFAULT_CHANNEL_FUND);
      } else if (type === 'backup') {
        targetChannelId = getEnv('DISCORD_CHANNEL_BACKUP', DEFAULT_CHANNEL_BACKUP);
      } else {
        targetChannelId = getEnv('DISCORD_CHANNEL_DAILY', DEFAULT_CHANNEL_DAILY);
      }
    }

    // Xây dựng nội dung văn bản tin nhắn & Khung thống kê (Embed Card)
    let messageContent = [
      `🌐 **WEBSITE:** <https://quan-ly-seven.vercel.app/>`,
      `👉 **AE TỰ VÀO CHECK NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ .**`
    ].join('\n');

    const embeds = [];

    if (customContent) {
      messageContent = customContent;
    } else if (type === 'daily' || type === 'records_daily') {
      const dayDate = date || 'Hôm nay';
      const houses = stats?.totalHouses ?? 0;
      const members = stats?.memberCount ?? 0;
      const top1 = stats?.top1;

      const fields = [
        { name: '🏠 Tổng số nhà hoàn thành', value: `>>> **${houses} nhà**`, inline: true },
        { name: '👥 Số anh em tham gia', value: `>>> **${members} người**`, inline: true }
      ];
      if (top1) {
        fields.push({
          name: '🥇 Top 1 Ngày',
          value: `>>> **${top1.name}** *(${top1.houses} nhà)*`,
          inline: false
        });
      }

      embeds.push({
        title: `📢 BÁO CÁO THÀNH TÍCH TRỘM NHÀ NGÀY ${dayDate}`,
        color: 16107019, // Vàng hổ phách #f59e0b
        fields
      });
    } else if (type === 'weekly' || type === 'records_weekly') {
      const houses = stats?.totalHouses ?? 0;
      const members = stats?.memberCount ?? 0;

      embeds.push({
        title: title || '🏆 BẢNG TỔNG KẾT SỐ NHÀ CHU KỲ / HÀNG TUẦN',
        color: 15105570, // Cam rực rỡ #e67e22
        fields: [
          { name: '🏠 Tổng số nhà toàn đội', value: `>>> **${houses} nhà**`, inline: true },
          { name: '👥 Số thành viên có nhà', value: `>>> **${members} người**`, inline: true }
        ]
      });
    } else if (type === 'fund' || type === 'fund_weekly') {
      const currentFund = stats?.currentFund ?? 0;
      const totalBail = stats?.totalBail ?? 0;
      const txCount = stats?.txCount ?? 0;

      messageContent = [
        `🌐 **WEBSITE:** <https://quan-ly-seven.vercel.app/>`,
        `👉 **AE TỰ VÀO CHECK QUỸ & CHI PHÍ CHUỘC TÙ NHÉ .**`
      ].join('\n');

      embeds.push({
        title: title || '💰 BÁO CÁO BIẾN ĐỘNG QUỸ & CHI PHÍ CHUỘC TÙ HÀNG TUẦN',
        color: 3066993, // Xanh ngọc #2ecc71
        fields: [
          { name: '💵 Số dư quỹ hiện tại', value: `>>> **${Number(currentFund).toLocaleString('vi-VN')}đ**`, inline: true },
          { name: '🚨 Tổng chi phí chuộc tù', value: `>>> **${Number(totalBail).toLocaleString('vi-VN')}đ**`, inline: true },
          { name: '📝 Giao dịch ghi nhận', value: `>>> **${txCount} lượt**`, inline: true }
        ]
      });
    } else if (type === 'backup') {
      const totalHouses = stats?.totalHouses ?? 0;
      const memberCount = stats?.memberCount ?? 0;
      const currentFund = stats?.currentFund ?? 0;
      const totalBail = stats?.totalBail ?? 0;
      const bailCount = stats?.bailCount ?? 0;

      messageContent = [
        `💾 **HỆ THỐNG SAO LƯU DỮ LIỆU CHU KỲ CREW LƯỠI BÚA** 💾`,
        `🌐 **WEBSITE:** <https://quan-ly-seven.vercel.app/>`,
        `👉 **AE TỰ VÀO CHECK NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ .**`
      ].join('\n');

      embeds.push({
        title: title || '📦 BẢN SAO LƯU TOÀN BỘ SỐ NHÀ & QUỸ CHUỘC TÙ (BẢO LƯU)',
        color: 1752220, // Xanh dương #1ab7ea
        fields: [
          { name: '🏠 Tổng số nhà chu kỳ', value: `>>> **${totalHouses} nhà**`, inline: true },
          { name: '👥 Thành viên có nhà', value: `>>> **${memberCount} người**`, inline: true },
          { name: '💵 Số dư quỹ bảo lưu', value: `>>> **${Number(currentFund).toLocaleString('vi-VN')}đ**`, inline: true },
          { name: '🚨 Tổng tiền chuộc tù', value: `>>> **${Number(totalBail).toLocaleString('vi-VN')}đ** *(${bailCount} lượt)*`, inline: true }
        ],
        footer: { text: 'Crew Lưới Búa • Sao Lưu Dữ Liệu Tự Động Định Kỳ & Trước Khi Reset' }
      });
    }

    const filename = (type === 'cert' || type === 'award' || targetChannelId === '1566023759343779871')
      ? `vinh-danh-10-10-${Date.now()}.png`
      : `bao-cao-${type}-${Date.now()}.png`;

    // Tự động gắn ảnh đính kèm vào Embed để hiển thị ảnh to rõ ràng trên Discord
    if (imageBase64 && embeds.length > 0) {
      embeds[0].image = { url: `attachment://${filename}` };
    }

    const result = await sendToDiscordChannel({
      botToken,
      channelId: targetChannelId,
      content: messageContent,
      embeds,
      imageBase64,
      filename,
      extraFile: type === 'backup' ? null : body.extraFile
    });

    if (result.success) {
      // Tự động gửi dòng phân cách ================= để phân biệt rõ ràng giữa các lần gửi báo cáo theo lệnh Đại ca
      try {
        await sendToDiscordChannel({
          botToken,
          channelId: targetChannelId,
          content: '=================================================='
        });
      } catch (sepErr) {
        // bỏ qua lỗi dòng phân cách nếu có
      }
    }

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý máy chủ: ' + err.message
    });
  }
};
