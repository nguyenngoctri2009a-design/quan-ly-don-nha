/**
 * ==============================================================================
 * MODULE BẢO MẬT: CHỐNG FAKE IP & QUẢN LÝ BAN MÁY (MACHINE SECURITY)
 * ==============================================================================
 * Cơ chế: Khóa theo Mã Vân Tay Phần Cứng Máy (Hardware Fingerprint) + IP Máy.
 * Kẻ gian dùng VPN, Fake IP, đổi proxy hay Tab ẩn danh đều bị vô hiệu hóa vì 
 * vân tay phần cứng (Canvas 2D, Screen, WebGL, Cores, Memory) không thay đổi.
 * ==============================================================================
 */

(function(window) {
  'use strict';

  // Helper lấy Firebase Realtime Database đảm bảo luôn sẵn sàng
  function getRTDB() {
    if (typeof window !== 'undefined' && window.db) return window.db;
    if (typeof firebase === 'undefined') return null;
    if (!firebase.apps || !firebase.apps.length) {
      try {
        firebase.initializeApp({
          databaseURL: "https://tiktok-46d94-default-rtdb.asia-southeast1.firebasedatabase.app"
        });
      } catch (e) {}
    }
    try {
      if (firebase.database) {
        window.db = firebase.database();
        return window.db;
      }
    } catch (e) {}
    return null;
  }

  // 1. TẠO VÂN TAY PHẦN CỨNG MÁY (HARDWARE CANVAS & SYSTEM HASH)
  function generateHardwareHash() {
    const components = [];
    try {
      // 1. Thông số màn hình vật lý
      components.push(
        window.screen.width,
        window.screen.height,
        window.screen.availWidth,
        window.screen.availHeight,
        window.screen.colorDepth,
        window.devicePixelRatio || 1
      );
      // 2. Cấu hình CPU & RAM
      components.push(
        navigator.hardwareConcurrency || 4,
        navigator.deviceMemory || 8,
        navigator.platform || 'unknown'
      );
      // 3. Múi giờ hệ thống
      components.push(
        new Date().getTimezoneOffset(),
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
      );
      // 4. Ngôn ngữ & Trình duyệt
      components.push(
        navigator.language || 'vi',
        (navigator.languages || []).join(',')
      );
      // 5. Canvas Fingerprint (Đồ họa phần cứng GPU)
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(100, 5, 80, 25);
        ctx.fillStyle = '#0f172a';
        ctx.fillText('Lưới Búa Anti-Ban Máy v2026', 4, 16);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.fillText('Lưới Búa Anti-Ban Máy v2026', 6, 18);
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      components.push('fallback_hw_seed');
    }

    const rawStr = components.join('|||');
    let hash = 0;
    for (let i = 0; i < rawStr.length; i++) {
      hash = ((hash << 5) - hash) + rawStr.charCodeAt(i);
      hash |= 0;
    }
    return 'hw_' + Math.abs(hash).toString(16);
  }

  // 2. QUẢN LÝ MÃ MÁY ĐỘC NHẤT (MACHINE ID)
  function getMachineId() {
    const hwHash = generateHardwareHash();
    
    // Đọc từ Cookie trước (sống dai nhất)
    let cookieMid = '';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.startsWith('luoibua_mid=')) {
        cookieMid = c.substring('luoibua_mid='.length);
        break;
      }
    }

    // Đọc từ localStorage
    let localMid = '';
    try { localMid = localStorage.getItem('luoibua_machine_id') || ''; } catch (e) {}

    let chosenId = cookieMid || localMid;

    // Nếu chưa có, tạo mã máy mới kết hợp Hardware Hash
    if (!chosenId || !chosenId.includes(hwHash)) {
      const seed = Math.random().toString(36).substring(2, 8);
      chosenId = 'dev_' + hwHash + '_' + seed;
    }

    // Đồng bộ lại vào cả localStorage lẫn Cookie 10 năm
    try { localStorage.setItem('luoibua_machine_id', chosenId); } catch (e) {}
    try { sessionStorage.setItem('luoibua_machine_id', chosenId); } catch (e) {}
    try {
      document.cookie = `luoibua_mid=${chosenId}; path=/; max-age=315360000; SameSite=Lax`;
    } catch (e) {}

    return chosenId;
  }

  const CURRENT_MACHINE_ID = getMachineId();
  const CURRENT_HARDWARE_HASH = generateHardwareHash();
  let CURRENT_CLIENT_IP = '127.0.0.1';

  // DANH SÁCH THIẾT BỊ ĐƯỢC BẢO VỆ TUYỆT ĐỐI CỦA ĐẠI CA NGUYỄN TRÍ
  const WHITELIST_MACHINES = [];

  function isWhitelisted(machineId, ip) {
    const mLower = String(machineId || CURRENT_MACHINE_ID).toLowerCase().trim();
    for (const wl of WHITELIST_MACHINES) {
      if (wl && (mLower === wl.toLowerCase() || mLower.includes(wl.toLowerCase()))) {
        return true;
      }
    }
    // Chỉ miễn trừ nếu Đại ca Nguyễn Trí hoặc Quản trị viên THỰC SỰ ĐÃ ĐĂNG NHẬP THÀNH CÔNG
    if (typeof sessionStorage !== 'undefined') {
      const isAuth = sessionStorage.getItem('luoibua_admin_authenticated') === 'true';
      const aName = sessionStorage.getItem('luoibua_admin_name') || '';
      const aRole = sessionStorage.getItem('luoibua_admin_role') || '';
      if (isAuth && (aName.includes('Trí') || aName.includes('tri') || aName.includes('Muội') || aName.includes('muoi')) && (aRole === 'owner' || aRole === 'admin')) {
        return true;
      }
    }
    return false;
  }

  // Tự động giải phóng khóa local nếu máy hiện tại đang có phiên Admin đăng nhập hợp lệ
  if (isWhitelisted(CURRENT_MACHINE_ID)) {
    try {
      localStorage.removeItem('luoibua_login_lock');
      localStorage.removeItem('luoibua_admin_locked');
      localStorage.removeItem('luoibua_machine_ban_state');
    } catch (e) {}
  }

  // Tự động đăng ký thông tin thiết bị và IP vào Firebase để tra cứu khi ban (Có throttle 15 phút chống nghẽn DB khi 500+ người vào cùng lúc)
  function registerDeviceToCloud(machineId, ip) {
    if (!machineId || isWhitelisted(machineId)) return;
    const rtdb = getRTDB();
    if (!rtdb) return;

    try {
      const now = Date.now();
      const lastReg = Number(sessionStorage.getItem('luoibua_last_reg_time') || localStorage.getItem('luoibua_last_reg_time') || 0);
      // Chỉ đăng ký lại sau mỗi 15 phút để bảo vệ Firebase RTDB không bị nghẽn khi có hàng trăm lượt truy cập đồng thời
      if (lastReg > 0 && (now - lastReg) < 15 * 60 * 1000) {
        return;
      }
      sessionStorage.setItem('luoibua_last_reg_time', now.toString());
      localStorage.setItem('luoibua_last_reg_time', now.toString());

      const safeMid = machineId.replace(/[^a-zA-Z0-9_-]/g, '_');
      rtdb.ref(`device_registry/${safeMid}`).update({
        machineId: machineId,
        ip: ip || 'unknown',
        lastSeen: now,
        userAgent: navigator.userAgent || ''
      });
      if (ip && ip !== '127.0.0.1' && ip !== 'unknown') {
        const safeIp = ip.replace(/[^a-zA-Z0-9_-]/g, '_');
        rtdb.ref(`ip_registry/${safeIp}`).update({
          ip: ip,
          lastMachineId: machineId,
          lastSeen: now
        });
      }
    } catch (e) {}
  }

  // Lấy địa chỉ IP thật của máy (Phân luồng ưu tiên Vercel Edge Serverless <10ms + Cache siêu tốc chống sập)
  async function detectClientIp() {
    try {
      // 1. Kiểm tra cache cục bộ (Phản hồi tức thì 0ms, tiết kiệm 100% băng thông)
      const cached = sessionStorage.getItem('luoibua_detected_ip') || localStorage.getItem('luoibua_detected_ip');
      if (cached && cached !== '127.0.0.1' && cached !== 'unknown') {
        CURRENT_CLIENT_IP = cached;
        registerDeviceToCloud(CURRENT_MACHINE_ID, cached);
        return cached;
      }

      // 2. Ưu tiên gọi Vercel Edge API nội bộ (chịu tải hàng ngàn request/s, không bị giới hạn quota của bên thứ ba)
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        const edgeRes = await fetch('/api/config', { signal: ctrl.signal });
        clearTimeout(tid);
        if (edgeRes.ok) {
          const cfg = await edgeRes.json();
          if (cfg && cfg.clientIp && cfg.clientIp !== '127.0.0.1' && cfg.clientIp !== 'unknown') {
            CURRENT_CLIENT_IP = cfg.clientIp;
            sessionStorage.setItem('luoibua_detected_ip', cfg.clientIp);
            localStorage.setItem('luoibua_detected_ip', cfg.clientIp);
            registerDeviceToCloud(CURRENT_MACHINE_ID, cfg.clientIp);
            if (window.BANNED_DEVICES_CACHE) {
              checkBanList(window.BANNED_DEVICES_CACHE);
            }
            return cfg.clientIp;
          }
        }
      } catch (edgeErr) {}

      // 3. Fallback gọi dịch vụ công cộng nếu chạy môi trường khác
      const endpoints = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipapi.co/json/'
      ];

      for (const ep of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(ep, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const ipFound = data.ip || data.query;
            if (ipFound) {
              CURRENT_CLIENT_IP = ipFound;
              sessionStorage.setItem('luoibua_detected_ip', ipFound);
              localStorage.setItem('luoibua_detected_ip', ipFound);
              registerDeviceToCloud(CURRENT_MACHINE_ID, ipFound);

              // Tái kiểm tra ngay lập tức khi phát hiện IP thật (chặn ngay nếu chuyển sang Chrome/trình duyệt khác)
              if (window.BANNED_DEVICES_CACHE) {
                checkBanList(window.BANNED_DEVICES_CACHE);
              }
              return ipFound;
            }
          }
        } catch (err) {}
      }
    } catch (e) {
      CURRENT_CLIENT_IP = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? '127.0.0.1' : 'unknown';
    }
    registerDeviceToCloud(CURRENT_MACHINE_ID, CURRENT_CLIENT_IP);
    return CURRENT_CLIENT_IP;
  }

  // Khởi động lấy IP ngầm ngay lập tức
  detectClientIp();

  // Định dạng thời gian còn lại
  function formatRemainingDuration(ms) {
    if (ms >= 365 * 24 * 3600 * 1000) {
      return 'Vĩnh Viễn (Không thời hạn)';
    }
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days} ngày ${remHours} giờ ${mins} phút ${secs} giây`;
    }
    if (hours > 0) return `${hours} giờ ${mins} phút ${secs} giây`;
    if (mins > 0) return `${mins} phút ${secs} giây`;
    return `${secs} giây`;
  }

  let banCountdownInterval = null;

  // 3. HIỂN THỊ MÀN HÌNH KHÓA MÁY CHẶN TOÀN DIỆN (CHẶN KHÔNG CHO VÀO WEB)
  function showBannedScreen(banRecord) {
    // MIỄN TRỪ TUYỆT ĐỐI CHO ĐẠI CA NGUYỄN TRÍ
    if (isWhitelisted(CURRENT_MACHINE_ID, CURRENT_CLIENT_IP)) {
      hideBannedScreen();
      return;
    }

    let shield = document.getElementById('bannedMachineShield');
    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'bannedMachineShield';
      document.body.appendChild(shield);
    }

    const lockedUntil = Number(banRecord.bannedUntil) || (Date.now() + 24 * 3600 * 1000);
    const isPermanent = lockedUntil >= 9999999999999;
    const reason = banRecord.reason || 'Vi phạm chính sách bảo mật hệ thống';
    const bannedBy = banRecord.bannedBy || 'Hệ Thống Tự Động';
    const displayTarget = banRecord.target || CURRENT_MACHINE_ID;
    const displayIp = banRecord.ip || CURRENT_CLIENT_IP;

    shield.innerHTML = `
      <div class="ban-shield-card">
        <div class="ban-shield-glow"></div>
        <div class="ban-shield-icon">
          <svg viewBox="0 0 24 24" width="68" height="68" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            <line x1="8" y1="16" x2="16" y2="16"></line>
          </svg>
        </div>
        <h1 class="ban-shield-title">MÁY NÀY ĐÃ BỊ BAN KHỎI HỆ THỐNG!</h1>
        <p class="ban-shield-subtitle">
          Hệ thống đã nhận diện mã phần cứng thiết bị &amp; IP mạng của bạn có hành vi vi phạm và kích hoạt lệnh khóa máy triệt để.
        </p>

        <div class="ban-shield-details">
          <div class="ban-detail-row">
            <span class="detail-label">💻 Mã Máy (Thiết Bị):</span>
            <span class="detail-value text-gold" id="banShieldMachineId">${displayTarget}</span>
          </div>
          <div class="ban-detail-row">
            <span class="detail-label">🌐 Địa Chỉ IP Máy:</span>
            <span class="detail-value text-mono">${displayIp}</span>
          </div>
          <div class="ban-detail-row">
            <span class="detail-label">⛔ Lý Do Khóa Máy:</span>
            <span class="detail-value text-danger font-bold">${reason}</span>
          </div>
          <div class="ban-detail-row">
            <span class="detail-label">⏳ Thời Hạn Còn Lại:</span>
            <span class="detail-value text-countdown" id="banShieldCountdown">Đang tính toán...</span>
          </div>
          <div class="ban-detail-row">
            <span class="detail-label">🛡️ Người Thực Hiện:</span>
            <span class="detail-value">${bannedBy}</span>
          </div>
        </div>

        <div class="ban-shield-notice">
          <p>⚠️ <strong>Lưu ý chống Fake IP &amp; Đổi Trình Duyệt:</strong> Cả Mã Máy phần cứng lẫn Địa Chỉ IP đều đã được khóa trong hệ thống. Đổi sang Chrome, Cốc Cốc, Edge hay Tab Ẩn Danh đều bị chặn ngay tại cửa.</p>
          <p>Nếu có nhầm lẫn, vui lòng liên hệ <strong>Admin Nguyễn Trí</strong> để được xem xét mở khóa máy.</p>
        </div>

        <div class="ban-shield-actions" style="margin-top: 22px; text-align: center;">
          <button type="button" id="btnEmergencyUnlock" onclick="window.MachineSecurity.emergencyUnlock()" style="padding: 12px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; font-weight: 900; border: 2px solid #fbbf24; border-radius: 10px; cursor: pointer; font-size: 14px; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.45); transition: all 0.2s; letter-spacing: 0.3px;">
            🔑 Mở Khóa Khẩn Cấp
          </button>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Dành riêng cho Quản trị viên cấp cao mở khóa thiết bị</div>
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';

    // Cập nhật đồng hồ đếm ngược từng giây
    if (banCountdownInterval) clearInterval(banCountdownInterval);
    const updateCountdown = () => {
      const remainingMs = lockedUntil - Date.now();
      const el = document.getElementById('banShieldCountdown');
      if (el) {
        if (isPermanent) {
          el.textContent = '⛔ VĨNH VIỄN (Cấm tiệt vào web)';
        } else if (remainingMs <= 0) {
          el.textContent = '✅ Đã hết hạn khóa! Đang mở khóa máy...';
          clearInterval(banCountdownInterval);
          setTimeout(() => {
            hideBannedScreen();
            location.reload();
          }, 1500);
        } else {
          el.textContent = formatRemainingDuration(remainingMs);
        }
      }
    };
    updateCountdown();
    banCountdownInterval = setInterval(updateCountdown, 1000);

    // Vô hiệu hóa chuột phải và phím tắt F12 trên màn hình khóa
    shield.oncontextmenu = e => e.preventDefault();
    document.addEventListener('keydown', blockDevKeys, true);
  }

  function blockDevKeys(e) {
    if (document.getElementById('bannedMachineShield')) {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.ctrlKey && e.key.toUpperCase() === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }

  // 4. GỠ MÀN HÌNH KHÓA MÁY
  function hideBannedScreen() {
    const shield = document.getElementById('bannedMachineShield');
    if (shield) {
      shield.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', blockDevKeys, true);
    }
    if (banCountdownInterval) {
      clearInterval(banCountdownInterval);
      banCountdownInterval = null;
    }
  }

  async function sha256Hex(str) {
    try {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return '';
    }
  }

  // Danh sách băm SHA-256 của các mật khẩu mở khóa hợp lệ: Master Key, Admin Mới, Đại ca Nguyễn Trí
  const VALID_UNLOCK_HASHES = [
    '96ebbe2f08f57b9b32f5d6c16504b4a2c02b9ec7143c785a7dfcc2ebc9b6f069', // Hash Master Key (01062009)
    'de7e385f47e963d724758f6168d432baf82884ee225c8527bdba96c272bed89d', // Hash Admin Mới (vit123456@)
    '0009af23da4322e5106f7d9f8778c451fede93ff145171cd18c8859cf6cbfa79'  // Hash Đại ca Nguyễn Trí (tri123456@)
  ];

  async function isValidUnlockKey(p) {
    if (!p) return false;
    const clean = p.trim();
    if (!clean) return false;
    const h = await sha256Hex(clean);
    return VALID_UNLOCK_HASHES.includes(h);
  }

  // Mở Khóa Khẩn Cấp dành riêng cho Đại ca
  async function emergencyUnlock() {
    const enteredPass = prompt('🔑 NHẬP MẬT KHẨU MỞ KHÓA KHẨN CẤP:\n(Vui lòng nhập mật khẩu quản trị cấp cao để gỡ khóa máy ngay lập tức):');
    if (!enteredPass) return;
    const pTrim = enteredPass.trim();
    const isKeyValid = await isValidUnlockKey(pTrim);
    if (isKeyValid) {
      try {
        // Đặt ngay unlock flag để ngăn chặn tuyệt đối tình trạng màn hình khóa nháy lên 1s sau khi tải lại
        const unlockNow = Date.now().toString();
        try {
          localStorage.setItem('luoibua_unlocked_flag', unlockNow);
          sessionStorage.setItem('luoibua_unlocked_flag', unlockNow);
        } catch (e) {}

        // 1. Xóa sạch mọi key khóa máy và mật khẩu đã lưu trên máy
        localStorage.removeItem('luoibua_login_lock');
        localStorage.removeItem('luoibua_admin_lock');
        localStorage.removeItem('luoibua_admin_locked');
        localStorage.removeItem('luoibua_machine_ban_state');
        localStorage.removeItem('luoibua_saved_pass');
        sessionStorage.removeItem('luoibua_login_lock');
        sessionStorage.removeItem('luoibua_admin_lock');
        sessionStorage.removeItem('luoibua_admin_locked');
        sessionStorage.removeItem('luoibua_machine_ban_state');

        // 2. Ẩn thông báo lỗi trên form và xóa sạch ô mật khẩu
        const errBox = document.getElementById('loginErrorMsg');
        if (errBox) errBox.style.display = 'none';
        const passIn = document.getElementById('passwordInput');
        if (passIn) passIn.value = '';

        // 3. Xóa trực tiếp trên Firebase RTDB client-side
        const rtdb = getRTDB();
        if (rtdb) {
          const safeMid = CURRENT_MACHINE_ID.replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanMid = safeMid.replace(/^dev_/, '');

          const deleteList = [
            rtdb.ref(`banned_devices/ban_${safeMid}`).remove().catch(() => {}),
            rtdb.ref(`banned_devices/ban_dev_${cleanMid}`).remove().catch(() => {}),
            rtdb.ref(`banned_devices/ban_${cleanMid}`).remove().catch(() => {}),
            rtdb.ref(`security/locks/dev_${safeMid}`).remove().catch(() => {}),
            rtdb.ref(`security/locks/dev_${cleanMid}`).remove().catch(() => {}),
            rtdb.ref(`security/locks/${safeMid}`).remove().catch(() => {})
          ];

          if (CURRENT_CLIENT_IP && CURRENT_CLIENT_IP !== 'unknown' && CURRENT_CLIENT_IP !== '127.0.0.1') {
            const safeIp = CURRENT_CLIENT_IP.replace(/[^a-zA-Z0-9_-]/g, '_');
            deleteList.push(
              rtdb.ref(`banned_devices/ban_ip_${safeIp}`).remove().catch(() => {}),
              rtdb.ref(`banned_devices/ban_${safeIp}`).remove().catch(() => {}),
              rtdb.ref(`security/locks/ip_${safeIp}`).remove().catch(() => {})
            );
          }
          deleteList.push(
            rtdb.ref(`banned_devices/ban_ip_127_0_0_1`).remove().catch(() => {}),
            rtdb.ref(`security/locks/ip_127_0_0_1`).remove().catch(() => {})
          );

          await Promise.all(deleteList);

          // Quét và xóa toàn bộ các bản ghi khớp với thiết bị hoặc IP này
          try {
            const snap = await rtdb.ref('banned_devices').once('value');
            const data = snap.val();
            if (data) {
              const myMid = CURRENT_MACHINE_ID.toLowerCase().trim();
              const myHw = CURRENT_HARDWARE_HASH.toLowerCase().trim();
              const myIp = (CURRENT_CLIENT_IP || '').toLowerCase().trim();
              for (const k of Object.keys(data)) {
                const rec = data[k];
                if (!rec) continue;
                const recMid = String(rec.machineId || rec.target || '').toLowerCase().trim();
                const recIp = String(rec.ip || rec.target || '').toLowerCase().trim();
                const matchMid = recMid && (recMid === myMid || myMid.includes(recMid) || recMid.includes(myHw) || myMid.includes(myHw));
                const matchIp = (myIp && myIp !== '127.0.0.1' && recIp && (recIp === myIp || myIp.includes(recIp)));
                if (matchMid || matchIp) {
                  await rtdb.ref(`banned_devices/${k}`).remove().catch(() => {});
                }
              }
            }
          } catch (scanErr) {}
        }

        // 4. Gọi API mở khóa máy chủ nếu có
        try {
          await fetch('/api/unban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unlockKey: pTrim,
              deviceId: CURRENT_MACHINE_ID,
              ip: CURRENT_CLIENT_IP
            })
          }).catch(() => {});
        } catch (apiErr) {}

        hideBannedScreen();
        alert('✅ XÁC THỰC MẬT KHẨU THÀNH CÔNG!\nĐã gỡ khóa hoàn toàn cho máy & IP của Đại ca.');
        setTimeout(() => location.reload(), 200);
      } catch (err) {
        hideBannedScreen();
        setTimeout(() => location.reload(), 200);
      }
    } else {
      alert('❌ Sai mật khẩu mở khóa! Thiết bị vẫn tiếp tục bị khóa.');
    }
  }

  // 5. KIỂM TRA XEM MÁY HOẶC IP HIỆN TẠI CÓ ĐANG BỊ BAN KHÔNG (CHẶN CẢ KHI QUA CHROME KHÁC)
  function checkBanList(bannedData) {
    // 0. Miễn trừ tuyệt đối nếu vừa mở khóa khẩn cấp thành công trong 30 phút qua (Tránh giật/nháy 1s)
    try {
      const unlockTime = Number(sessionStorage.getItem('luoibua_unlocked_flag') || localStorage.getItem('luoibua_unlocked_flag') || 0);
      if (unlockTime > 0 && (Date.now() - unlockTime) < 30 * 60 * 1000) {
        hideBannedScreen();
        return null;
      }
    } catch (e) {}

    // 1. Kiểm tra trạng thái khóa client-side (luoibua_admin_lock & luoibua_login_lock)
    let localLockInfo = null;
    try {
      const rawLock = localStorage.getItem('luoibua_admin_lock') || localStorage.getItem('luoibua_login_lock') || '{}';
      const lockData = JSON.parse(rawLock);
      if (lockData.lockedUntil && Date.now() < lockData.lockedUntil) {
        localLockInfo = lockData;
      }
    } catch (e) {}

    // 2. Miễn trừ nếu đang có phiên đăng nhập hợp lệ
    if (isWhitelisted(CURRENT_MACHINE_ID, CURRENT_CLIENT_IP)) {
      hideBannedScreen();
      return null;
    }

    const now = Date.now();
    const myMid = CURRENT_MACHINE_ID.toLowerCase().trim();
    const myHw = CURRENT_HARDWARE_HASH.toLowerCase().trim();
    const myIp = (CURRENT_CLIENT_IP || '').toLowerCase().trim();

    let matchedItem = null;

    if (bannedData && typeof bannedData === 'object') {
      for (const key of Object.keys(bannedData)) {
        const item = bannedData[key];
        if (!item) continue;

        const lockedUntil = Number(item.bannedUntil) || 0;
        if (lockedUntil > 0 && lockedUntil < 9999999999999 && now >= lockedUntil) {
          continue;
        }

        const target = String(item.target || '').toLowerCase().trim();
        const ip = String(item.ip || '').toLowerCase().trim();
        const machineId = String(item.machineId || '').toLowerCase().trim();

        // 1. Khớp theo Machine ID hoặc Hardware Hash
        const matchMachine = (machineId && (machineId === myMid || myMid.includes(machineId) || machineId.includes(myHw) || myMid.includes(myHw)));
        const matchTargetMid = (target && (target === myMid || myMid.includes(target) || target.includes(myHw)));

        // 2. Khớp theo IP (Khóa nếu kẻ gian chuyển sang Chrome, Cốc Cốc, Edge, Firefox, hay Tab Ẩn Danh)
        const validClientIp = (myIp && myIp !== '127.0.0.1' && myIp !== 'unknown');
        const matchIp = validClientIp && ip && (ip === myIp || ip.includes(myIp) || myIp.includes(ip));
        const matchTargetIp = validClientIp && target && (target === myIp || target.includes(myIp) || myIp.includes(target));

        if (matchMachine || matchTargetMid || matchIp || matchTargetIp) {
          matchedItem = item;
          break;
        }
      }
    }

    if (matchedItem) {
      showBannedScreen(matchedItem);
      return matchedItem;
    }

    // NẾU TRÊN SERVER FIREBASE KHÔNG KHÓA MÁY NÀY:
    // (Admin đã gỡ ban / mở khóa máy thành công trên Firebase RTDB)
    // -> BẮT BUỘC DỌN SẠCH MỌI LOCK CỤC BỘ ĐỂ KHÔNG TỰ ĐỘNG KHÓA LẠI!
    if (localLockInfo) {
      localStorage.removeItem('luoibua_login_lock');
      localStorage.removeItem('luoibua_admin_lock');
      localStorage.removeItem('luoibua_admin_locked');
      localStorage.removeItem('luoibua_machine_ban_state');
      sessionStorage.removeItem('luoibua_login_lock');
      sessionStorage.removeItem('luoibua_admin_lock');
      sessionStorage.removeItem('luoibua_admin_locked');
      sessionStorage.removeItem('luoibua_machine_ban_state');
      localLockInfo = null;
    }

    hideBannedScreen();
    return null;
  }

  // 6. LẮNG NGHE REAL-TIME TỪ FIREBASE REALTIME DATABASE
  function initBanListener() {
    const rtdb = getRTDB();
    if (rtdb) {
      try {
        const bannedRef = rtdb.ref('banned_devices');
        bannedRef.on('value', snapshot => {
          const val = snapshot.val();
          window.BANNED_DEVICES_CACHE = val || {};
          checkBanList(val);
          if (typeof window.renderBannedListUI === 'function') {
            window.renderBannedListUI();
          }
        });
      } catch (err) {
        console.warn('Lỗi kết nối Firebase banned_devices:', err);
      }
    }
  }

  // Khởi động sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanListener);
  } else {
    setTimeout(initBanListener, 50);
  }

  // ==============================================================================
  // CÁC HÀM XỬ LÝ QUẢN LÝ DÀNH RIÊNG CHO TAB ADMIN (ADMIN.HTML)
  // ==============================================================================

  // Thực hiện Ban Máy (LƯU CẢ MÃ MÁY VÀ ĐỊA CHỈ IP VÀO JSON ĐỂ CHẶN CẢ KHI QUA CHROME KHÁC)
  async function banMachine(target, durationHours, reason, customIp) {
    if (!target || !target.trim()) {
      alert('Vui lòng nhập Mã Máy hoặc IP Thiết Bị cần ban!');
      return false;
    }

    const cleanTarget = target.trim();
    const cleanReason = (reason || 'Khóa máy do quản trị viên chỉ định').trim();
    const now = Date.now();
    const isAutoBan = cleanReason.includes('Nhập sai') || cleanReason.includes('tự động');

    // Không cho phép ban thiết bị của Đại ca nếu đang là thao tác thủ công và thiết bị đang được bảo vệ
    if (!isAutoBan && isWhitelisted(cleanTarget)) {
      alert('⛔ Thiết bị này thuộc danh sách bảo vệ của Đại ca Nguyễn Trí, không thể khóa!');
      return false;
    }

    let durationMs = 24 * 3600 * 1000; // 1 ngày mặc định
    let durationText = '1 Ngày (24 giờ)';

    if (durationHours === 'permanent' || durationHours === 'inf') {
      durationMs = 9999999999999;
      durationText = 'Vĩnh Viễn';
    } else {
      const h = Number(durationHours) || 24;
      durationMs = h * 3600 * 1000;
      durationText = h >= 24 ? `${Math.floor(h / 24)} Ngày (${h} giờ)` : `${h} giờ`;
    }

    const lockedUntil = durationHours === 'permanent' ? 9999999999999 : (now + durationMs);
    const adminName = (typeof getCurrentAdminName === 'function') ? getCurrentAdminName() : (window.CURRENT_ADMIN_NAME || 'Nguyễn Trí');

    // Xác định machineId và IP
    let targetMachineId = cleanTarget.startsWith('dev_') ? cleanTarget : '';
    let targetIp = (customIp || '').trim();
    if (!targetIp && !cleanTarget.startsWith('dev_') && cleanTarget.includes('.')) {
      targetIp = cleanTarget;
    }

    // Tự động tra cứu IP từ device_registry nếu thiếu IP
    if (targetMachineId && !targetIp) {
      const rtdb = getRTDB();
      if (rtdb) {
        try {
          const safeMid = targetMachineId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const snap = await rtdb.ref(`device_registry/${safeMid}`).once('value');
          const reg = snap.val();
          if (reg && reg.ip && reg.ip !== 'unknown' && reg.ip !== '127.0.0.1') {
            targetIp = reg.ip;
          }
        } catch (e) {}
      }
    }

    // Tự động tra cứu MachineId từ ip_registry nếu thiếu MachineId
    if (targetIp && !targetMachineId) {
      const rtdb = getRTDB();
      if (rtdb) {
        try {
          const safeIp = targetIp.replace(/[^a-zA-Z0-9_-]/g, '_');
          const snap = await rtdb.ref(`ip_registry/${safeIp}`).once('value');
          const reg = snap.val();
          if (reg && reg.lastMachineId) {
            targetMachineId = reg.lastMachineId;
          }
        } catch (e) {}
      }
    }

    // Nếu vẫn chưa có IP và cleanTarget là máy hiện tại thì lấy CURRENT_CLIENT_IP
    if (!targetIp && targetMachineId === CURRENT_MACHINE_ID && CURRENT_CLIENT_IP !== '127.0.0.1' && CURRENT_CLIENT_IP !== 'unknown') {
      targetIp = CURRENT_CLIENT_IP;
    }

    // Khóa an toàn: Ngăn admin tự ban nhầm chính máy của mình nếu không cố ý (bỏ qua nếu là khóa tự động do nhập sai mật khẩu)
    if (!isAutoBan && (cleanTarget === CURRENT_MACHINE_ID || (CURRENT_CLIENT_IP !== '127.0.0.1' && cleanTarget === CURRENT_CLIENT_IP))) {
      const confirmSelf = (typeof showConfirmModal === 'function')
        ? await showConfirmModal({
            title: 'CẢNH BÁO: KHÓA MÁY HIỆN TẠI',
            targetName: cleanTarget,
            targetType: 'Thiết bị quản trị hiện tại',
            type: 'danger',
            icon: '⚠️',
            message: 'Thiết bị này trùng khớp với chính <b>MÁY HIỆN TẠI</b> của Đại ca!<br><span style="color:#dc2626;font-size:12.5px;font-weight:700;">Nếu thực hiện ban, máy này sẽ bị khóa không vào được web ngay lập tức. Đại ca có chắc chắn muốn khóa không?</span>',
            confirmText: '⚠️ Vẫn Khóa Máy',
            cancelText: '✕ Hủy Ngay'
          })
        : confirm(`⚠️ CẢNH BÁO: Thiết bị "${cleanTarget}" trùng khớp với chính MÁY HIỆN TẠI của Đại ca!\nNếu thực hiện ban, máy này sẽ bị khóa không vào được web ngay lập tức.\nĐại ca có thực sự muốn khóa máy này không?`);
      if (!confirmSelf) return false;
    }

    // Key lưu trữ Firebase RTDB cho Machine ID
    const safeKey = 'ban_' + cleanTarget.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 70);

    const banPayload = {
      key: safeKey,
      target: cleanTarget,
      machineId: targetMachineId,
      ip: targetIp,
      reason: cleanReason,
      bannedAt: now,
      bannedUntil: lockedUntil,
      durationText: durationText,
      bannedBy: adminName,
      status: 'active'
    };

    try {
      const rtdb = getRTDB();
      if (rtdb) {
        // 1. Lưu bản ghi chính vào JSON Firebase RTDB
        await rtdb.ref(`banned_devices/${safeKey}`).set(banPayload);

        // 2. NẾU CÓ IP: Lưu thêm bản ghi ban IP để khóa triệt để khi kẻ gian chuyển sang Chrome / Cốc Cốc / Ẩn Danh
        if (targetIp && targetIp !== '127.0.0.1' && targetIp !== 'unknown') {
          const safeIpKey = 'ban_ip_' + targetIp.replace(/[^a-zA-Z0-9_-]/g, '_');
          const ipBanPayload = {
            ...banPayload,
            key: safeIpKey,
            target: targetIp
          };
          await rtdb.ref(`banned_devices/${safeIpKey}`).set(ipBanPayload);
        }
      }

      if (typeof logAudit === 'function') {
        const extraIpText = targetIp ? ` [IP: ${targetIp}]` : '';
        const extraMidText = targetMachineId ? ` [Số máy: ${targetMachineId}]` : '';
        logAudit('BAN_MACHINE', 'Khóa Thiết Bị Máy', `Đã ban máy "${cleanTarget}"${extraMidText}${extraIpText} - Thời hạn: ${durationText} - Lý do: ${cleanReason}`, adminName);
      }

      if (!isAutoBan) {
        const ipNotice = targetIp ? `\n🌐 Đã khóa kèm Địa Chỉ IP: ${targetIp}\n(Khóa cả IP để kẻ gian đổi sang Chrome, Cốc Cốc hay Tab Ẩn Danh đều bị chặn đứng!).` : '';
        alert(`✅ ĐÃ KHÓA MÁY THÀNH CÔNG!\nThiết bị "${cleanTarget}" đã bị cấm truy cập vào toàn bộ website.${ipNotice}`);
      }
      return true;
    } catch (err) {
      if (!isAutoBan) {
        alert('❌ Lỗi khi thực hiện ban máy: ' + err.message);
      }
      return false;
    }
  }

  // Gỡ Ban / Mở Khóa Máy (Gỡ cả Mã Máy và IP liên quan)
  async function unbanMachine(keyOrKeys) {
    if (!keyOrKeys) return;
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (keys.length === 0) return;
    const adminName = (typeof getCurrentAdminName === 'function') ? getCurrentAdminName() : (window.CURRENT_ADMIN_NAME || 'Nguyễn Trí');

    const ok = (typeof showConfirmModal === 'function')
      ? await showConfirmModal({
          title: 'Mở Khóa Thiết Bị',
          targetName: keys.length === 1 ? (keys[0].replace('ban_ip_', 'IP: ').replace('ban_', 'Máy: ')) : `${keys.length} thiết bị`,
          targetType: 'Thiết bị đang bị chặn',
          type: 'success',
          icon: '🔓',
          message: 'Đại ca có chắc chắn muốn mở khóa ngay cho thiết bị này để tiếp tục truy cập website không?',
          confirmText: '🔓 Mở Khóa Ngay',
          cancelText: '✕ Giữ Khóa'
        })
      : confirm('Đại ca có chắc chắn muốn mở khóa ngay cho thiết bị này không?');

    if (!ok) return;

    try {
      const bannedData = window.BANNED_DEVICES_CACHE || {};
      const rtdb = getRTDB();

      const targetMids = [];
      const targetIps = [];

      for (const k of keys) {
        const item = bannedData[k];
        if (item) {
          if (item.machineId) targetMids.push(item.machineId);
          if (item.target && item.target.startsWith('dev_')) targetMids.push(item.target);
          if (item.ip && item.ip !== '127.0.0.1' && item.ip !== 'unknown') targetIps.push(item.ip);
          if (item.target && item.target.includes('.')) targetIps.push(item.target);
        } else {
          const raw = k.replace(/^ban_/, '');
          if (raw.startsWith('dev_')) targetMids.push(raw);
          else if (raw.startsWith('ip_')) targetIps.push(raw.replace(/^ip_/, '').replace(/_/g, '.'));
        }
      }

      if (rtdb) {
        // 1. Xóa trực tiếp tất cả keys đã chọn khỏi Firebase
        for (const k of keys) {
          await rtdb.ref(`banned_devices/${k}`).remove().catch(() => {});
        }

        // 2. Xóa các biến thể ban_ / ban_dev_ / ban_ip_ / locks
        for (const mid of targetMids) {
          const safeMid = mid.replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanMid = safeMid.replace(/^dev_/, '');
          await rtdb.ref(`banned_devices/ban_${safeMid}`).remove().catch(() => {});
          await rtdb.ref(`banned_devices/ban_dev_${cleanMid}`).remove().catch(() => {});
          await rtdb.ref(`banned_devices/ban_${cleanMid}`).remove().catch(() => {});
          await rtdb.ref(`security/locks/dev_${safeMid}`).remove().catch(() => {});
          await rtdb.ref(`security/locks/dev_${cleanMid}`).remove().catch(() => {});
        }

        for (const ip of targetIps) {
          const safeIp = ip.replace(/[^a-zA-Z0-9_-]/g, '_');
          await rtdb.ref(`banned_devices/ban_ip_${safeIp}`).remove().catch(() => {});
          await rtdb.ref(`banned_devices/ban_${safeIp}`).remove().catch(() => {});
          await rtdb.ref(`security/locks/ip_${safeIp}`).remove().catch(() => {});
        }

        // 3. Quét toàn bộ banned_devices trên Firebase để xóa sạch bất kỳ bản ghi nào trùng Mid hoặc Ip
        try {
          const snap = await rtdb.ref('banned_devices').once('value');
          const allBanned = snap.val() || {};
          for (const bKey of Object.keys(allBanned)) {
            const bRec = allBanned[bKey];
            if (!bRec) continue;
            const bMid = (bRec.machineId || bRec.target || '').toLowerCase();
            const bIp = (bRec.ip || bRec.target || '').toLowerCase();
            const matchM = targetMids.some(m => m.toLowerCase() === bMid || bMid.includes(m.toLowerCase()) || m.toLowerCase().includes(bMid));
            const matchI = targetIps.some(i => i.toLowerCase() === bIp || bIp.includes(i.toLowerCase()));
            if (matchM || matchI) {
              await rtdb.ref(`banned_devices/${bKey}`).remove().catch(() => {});
              delete bannedData[bKey];
            }
          }
        } catch (e) {}
      }

      // 4. Luôn xóa sạch mọi lock trong localStorage & sessionStorage của trình duyệt hiện tại
      localStorage.removeItem('luoibua_login_lock');
      localStorage.removeItem('luoibua_admin_lock');
      localStorage.removeItem('luoibua_admin_locked');
      localStorage.removeItem('luoibua_machine_ban_state');
      localStorage.removeItem('luoibua_saved_pass');
      sessionStorage.removeItem('luoibua_login_lock');
      sessionStorage.removeItem('luoibua_admin_lock');
      sessionStorage.removeItem('luoibua_admin_locked');
      sessionStorage.removeItem('luoibua_machine_ban_state');
      localStorage.setItem('luoibua_unlocked_flag', Date.now().toString());
      sessionStorage.setItem('luoibua_unlocked_flag', Date.now().toString());
      hideBannedScreen();

      // 5. Cập nhật Cache và cập nhật UI ngay lập tức
      for (const k of keys) {
        delete bannedData[k];
      }
      window.BANNED_DEVICES_CACHE = bannedData;
      renderBannedListUI();

      if (typeof logAudit === 'function') {
        logAudit('UNBAN_MACHINE', 'Mở Khóa Máy', `Đã gỡ khóa máy (Unban) cho thiết bị: ${keys.join(', ')}`, adminName);
      }

      alert('✅ ĐÃ MỞ KHÓA MÁY THÀNH CÔNG!\nThiết bị và IP liên quan đã có thể truy cập website bình thường.');
    } catch (err) {
      alert('❌ Lỗi khi mở khóa máy: ' + err.message);
    }
  }

  // 7. RENDER GIAO DIỆN TAB QUẢN LÝ BAN MÁY (ADMIN.HTML)
  function renderBannedListUI() {
    const tableBody = document.getElementById('bannedTableBody');
    if (!tableBody) return; // Không phải trang admin

    const bannedData = window.BANNED_DEVICES_CACHE || {};
    const now = Date.now();

    // Cập nhật Mã Máy hiện tại của Admin trên thẻ Card
    const myMidEl = document.getElementById('statMyMachineId');
    if (myMidEl) myMidEl.textContent = CURRENT_MACHINE_ID;

    // GỘP TẤT CẢ BẢN GHI THEO THIẾT BỊ (MÃ MÁY + IP CÙNG 1 MÁY GỘP LÀM 1 DÒNG DUY NHẤT)
    const deviceGroups = [];

    for (const key of Object.keys(bannedData)) {
      const item = bannedData[key];
      if (!item) continue;

      const rawTarget = String(item.target || '').trim();
      let mid = String(item.machineId || (rawTarget.startsWith('dev_') ? rawTarget : '')).trim();
      let ip = String(item.ip || (!rawTarget.startsWith('dev_') && rawTarget.includes('.') ? rawTarget : '')).trim();

      const midLower = mid.toLowerCase();
      const ipLower = ip.toLowerCase();

      // Tìm trong các nhóm đã có xem có nhóm nào khớp cùng thiết bị này không
      let group = deviceGroups.find(g => {
        const gMid = (g.machineId || '').toLowerCase();
        const gIp = (g.ip || '').toLowerCase();

        // 1. Khớp theo Machine ID (mã phần cứng)
        if (midLower && gMid && (midLower === gMid || midLower.includes(gMid) || gMid.includes(midLower))) {
          return true;
        }
        // 2. Khớp theo IP hợp lệ (không phải localhost)
        if (ipLower && gIp && ipLower !== '127.0.0.1' && ipLower !== 'unknown' && ipLower === gIp) {
          return true;
        }
        return false;
      });

      if (group) {
        if (!group.keys.includes(key)) {
          group.keys.push(key);
        }
        if (!group.machineId && mid) group.machineId = mid;
        if ((!group.ip || group.ip === '127.0.0.1' || group.ip === 'unknown') && ip && ip !== '127.0.0.1' && ip !== 'unknown') {
          group.ip = ip;
        }
        if (Number(item.bannedUntil) > Number(group.bannedUntil)) {
          group.bannedUntil = item.bannedUntil;
          group.durationText = item.durationText || group.durationText;
        }
      } else {
        deviceGroups.push({
          ...item,
          key: key,
          keys: [key],
          machineId: mid,
          ip: (ip && ip !== '127.0.0.1' && ip !== 'unknown') ? ip : '',
          target: mid || ip || rawTarget || key
        });
      }
    }

    const records = deviceGroups;

    // Sắp xếp bản ghi mới nhất lên đầu
    records.sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0));

    // Thống kê
    let activeCount = 0;
    let autoCount = 0;
    let manualCount = 0;

    records.forEach(r => {
      const isAct = !r.bannedUntil || r.bannedUntil >= 9999999999999 || now < Number(r.bannedUntil);
      if (isAct) {
        activeCount++;
        if (r.bannedBy && r.bannedBy.includes('Hệ Thống')) autoCount++;
        else manualCount++;
      }
    });

    const statActiveEl = document.getElementById('statBannedActiveCount');
    const statAutoEl = document.getElementById('statBannedAutoCount');
    const statManualEl = document.getElementById('statBannedManualCount');
    const badgeBannedEl = document.getElementById('badgeBanned');
    const countEl = document.getElementById('bannedListCount');

    if (statActiveEl) statActiveEl.textContent = activeCount;
    if (statAutoEl) statAutoEl.textContent = autoCount;
    if (statManualEl) statManualEl.textContent = manualCount;
    if (badgeBannedEl) badgeBannedEl.textContent = activeCount;
    if (countEl) countEl.textContent = `Tổng ${records.length} máy (${activeCount} máy đang bị khóa)`;

    // Áp dụng bộ lọc tìm kiếm & trạng thái
    const searchVal = (document.getElementById('searchBannedInput')?.value || '').toLowerCase().trim();
    const filterStatus = document.getElementById('filterBannedStatus')?.value || 'all';

    const filtered = records.filter(r => {
      const isAct = !r.bannedUntil || r.bannedUntil >= 9999999999999 || now < Number(r.bannedUntil);
      if (filterStatus === 'active' && !isAct) return false;
      if (filterStatus === 'expired' && isAct) return false;

      if (searchVal) {
        const t = (r.target || '').toLowerCase();
        const ip = (r.ip || '').toLowerCase();
        const mid = (r.machineId || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        if (!t.includes(searchVal) && !ip.includes(searchVal) && !mid.includes(searchVal) && !reason.includes(searchVal)) {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">🛡️</div>
              <div class="empty-state-title">Không tìm thấy máy nào phù hợp</div>
              <div class="empty-state-desc">Danh sách đang trống hoặc không có kết quả khớp với bộ lọc tìm kiếm</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    filtered.forEach((r, idx) => {
      const isAct = !r.bannedUntil || r.bannedUntil >= 9999999999999 || now < Number(r.bannedUntil);
      const remainingMs = r.bannedUntil ? (Number(r.bannedUntil) - now) : 0;
      const remText = isAct ? formatRemainingDuration(remainingMs) : 'Đã hết hạn';
      
      const timeStr = r.bannedAt ? new Date(r.bannedAt).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
      }) : '—';

      const statusBadge = isAct
        ? '<span class="badge-status-danger"><span class="status-pulse-red"></span>🔴 Đang Bị Khóa</span>'
        : '<span class="badge-status-muted">⚪ Đã Hết Hạn</span>';

      const actorBadge = (r.bannedBy && r.bannedBy.includes('Nguyễn Trí'))
        ? `<span class="badge-admin-tri">👑 ${escapeHtml(r.bannedBy)}</span>`
        : (r.bannedBy && r.bannedBy.includes('Cửu Muội'))
          ? `<span class="badge-admin-cuumuoi">🌸 ${escapeHtml(r.bannedBy)}</span>`
          : `<span class="badge-admin-system">🤖 ${escapeHtml(r.bannedBy || 'Hệ Thống')}</span>`;

      const hasMid = Boolean(r.machineId && r.machineId.startsWith('dev_'));
      const hasIp = Boolean(r.ip && r.ip !== '127.0.0.1' && r.ip !== 'unknown');

      let deviceHtml = '';
      if (hasMid) {
        const ipBadge = hasIp ? `<div class="sub-ip" style="display:flex; align-items:center; gap:4px; font-size:12px; color:#0284c7; font-weight:700; margin-top:2px;"><span>🌐 IP:</span><span style="font-family:monospace;">${escapeHtml(r.ip)}</span></div>` : '';
        deviceHtml = `
          <strong class="device-target-text" style="font-family: monospace; font-size: 13.5px; color: #0f172a;">${escapeHtml(r.machineId)}</strong>
          ${ipBadge}
        `;
      } else if (hasIp) {
        deviceHtml = `
          <strong class="device-target-text" style="font-family: monospace; font-size: 13.5px; color: #0f172a;">🌐 IP: ${escapeHtml(r.ip)}</strong>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">💻 (Chưa định danh mã máy)</div>
        `;
      } else {
        deviceHtml = `<strong class="device-target-text" style="font-family: monospace; font-size: 13.5px; color: #0f172a;">${escapeHtml(r.target || r.key)}</strong>`;
      }

      const keysParam = (r.keys || [r.key]).join('|||');

      html += `
        <tr class="${isAct ? 'row-banned-active' : 'row-banned-expired'}">
          <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
          <td>
            <div class="device-cell" style="display: flex; align-items: center; gap: 8px;">
              <span class="device-icon" style="font-size: 20px;">💻</span>
              <div>
                ${deviceHtml}
              </div>
            </div>
          </td>
          <td><span class="reason-tag">${escapeHtml(r.reason || 'Khóa máy do vi phạm')}</span></td>
          <td style="font-size: 12.5px; color: #475569;">${timeStr}</td>
          <td>
            <div class="duration-cell">
              <strong style="color: ${isAct ? '#dc2626' : '#64748b'};">${escapeHtml(remText)}</strong>
              <small style="color: #64748b; display: block;">Khóa: ${escapeHtml(r.durationText || '1 Ngày')}</small>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>${actorBadge}</td>
          <td style="text-align: center;">
            <button type="button" class="btn-action-unban" onclick="window.MachineSecurity.unbanMachine('${keysParam}'.split('|||'))" title="Mở khóa thiết bị này">
              🔓 Mở Khóa Máy
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initAdminBannedControls() {
    // Form Ban Máy Submit
    const formAdd = document.getElementById('formAddBan');
    if (formAdd) {
      formAdd.addEventListener('submit', async function(e) {
        e.preventDefault();
        const target = document.getElementById('banTargetInput')?.value;
        const customIp = document.getElementById('banIpInput')?.value;
        const duration = document.getElementById('banDurationSelect')?.value;
        const reason = document.getElementById('banReasonInput')?.value;

        const success = await banMachine(target, duration, reason, customIp);
        if (success) {
          formAdd.reset();
        }
      });
    }

    // Tự động điền IP khi nhập Mã Máy từ registry
    const targetInp = document.getElementById('banTargetInput');
    const ipInp = document.getElementById('banIpInput');
    if (targetInp && ipInp) {
      targetInp.addEventListener('blur', async function() {
        const val = (targetInp.value || '').trim();
        if (val.startsWith('dev_') && !ipInp.value) {
          const rtdb = getRTDB();
          if (rtdb) {
            try {
              const safeMid = val.replace(/[^a-zA-Z0-9_-]/g, '_');
              const snap = await rtdb.ref(`device_registry/${safeMid}`).once('value');
              const reg = snap.val();
              if (reg && reg.ip && reg.ip !== 'unknown' && reg.ip !== '127.0.0.1') {
                ipInp.value = reg.ip;
              }
            } catch (e) {}
          }
        } else if (val.includes('.') && !val.startsWith('dev_') && !ipInp.value) {
          ipInp.value = val;
        }
      });
    }

    // Nút Copy Mã Máy
    const btnCopy = document.getElementById('btnCopyMyMid');
    if (btnCopy) {
      btnCopy.addEventListener('click', function() {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(CURRENT_MACHINE_ID).then(() => {
            alert('📋 Đã sao chép Mã Máy vào bộ nhớ đệm:\n' + CURRENT_MACHINE_ID);
          });
        } else {
          prompt('Mã máy của Đại ca:', CURRENT_MACHINE_ID);
        }
      });
    }

    // Nút Làm Mới
    const btnRef = document.getElementById('btnRefreshBanned');
    if (btnRef) {
      btnRef.addEventListener('click', function() {
        const rtdb = getRTDB();
        if (rtdb) {
          rtdb.ref('banned_devices').once('value').then(snap => {
            window.BANNED_DEVICES_CACHE = snap.val() || {};
            renderBannedListUI();
          });
        }
      });
    }

    // Ô tìm kiếm & lọc
    document.getElementById('searchBannedInput')?.addEventListener('input', renderBannedListUI);
    document.getElementById('filterBannedStatus')?.addEventListener('change', renderBannedListUI);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminBannedControls);
  } else {
    setTimeout(initAdminBannedControls, 60);
  }

  // Xuất API ra global window
  window.MachineSecurity = {
    getMachineId,
    generateHardwareHash,
    detectClientIp,
    formatRemainingDuration,
    banMachine,
    unbanMachine,
    showBannedScreen,
    hideBannedScreen,
    emergencyUnlock,
    checkBanList,
    renderBannedListUI,
    CURRENT_MACHINE_ID,
    CURRENT_HARDWARE_HASH,
    get CURRENT_CLIENT_IP() { return CURRENT_CLIENT_IP; }
  };
  window.renderBannedListUI = renderBannedListUI;

})(window);
