/**
 * ==============================================================================
 * CREW LƯỠI BÚA - ULTRA CODE SHIELD & ANTI-INSPECT DEFENSE
 * Hệ thống khóa mã nguồn đa tầng: Chống F12, Chống Chuột Phải, Chống Soi Code
 * Thiết kế độc quyền cho Đại ca - Bảo vệ 100% mã nguồn website
 * ==============================================================================
 */
(function() {
  'use strict';

  // 1. Chặn chuột phải (Context Menu) trên toàn bộ trang
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // 2. Chặn tất cả các phím tắt soi nguồn, lưu trang, F12, DevTools
  window.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      triggerLockdownWarning();
      return false;
    }
    // Ctrl + Shift + I (Inspect)
    // Ctrl + Shift + J (Console)
    // Ctrl + Shift + C (Inspect Element)
    // Ctrl + Shift + K (Firefox Console)
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.keyCode === 75)) {
      e.preventDefault();
      e.stopPropagation();
      triggerLockdownWarning();
      return false;
    }
    // Ctrl + U (Xem mã nguồn - View Source)
    if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 117)) {
      e.preventDefault();
      e.stopPropagation();
      triggerLockdownWarning();
      return false;
    }
    // Ctrl + S (Lưu file mã nguồn về máy)
    if (e.ctrlKey && (e.keyCode === 83 || e.keyCode === 115)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + P (In trang)
    if (e.ctrlKey && (e.keyCode === 80 || e.keyCode === 112)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 3. Chặn bôi đen và kéo thả mã nguồn
  document.addEventListener('selectstart', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // 4. Bẫy Debugger tự đóng băng công cụ lập trình viên nếu ai đó cố tình mở
  function startDebuggerTrap() {
    setInterval(function() {
      try {
        (function() {
          return false;
        }['constructor']('debugger')['call']());
      } catch (e) {}
    }, 200);
  }

  // 5. Phát hiện DevTools mở qua kích thước chênh lệch màn hình
  let isDevToolsOpen = false;
  function detectDevTools() {
    try {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        if (!isDevToolsOpen) {
          isDevToolsOpen = true;
          triggerLockdownWarning();
        }
      } else {
        if (isDevToolsOpen) {
          isDevToolsOpen = false;
          removeLockdownWarning();
        }
      }
    } catch (e) {}
  }

  // 6. Màn hình khóa cảnh báo khi phát hiện cố tình soi code
  function triggerLockdownWarning() {
    let overlay = document.getElementById('codeShieldLockOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'codeShieldLockOverlay';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999999;
        background: radial-gradient(circle at center, #1e1b4b 0%, #030712 100%);
        color: #ffffff; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        text-align: center; padding: 24px; box-sizing: border-box;
      `;
      overlay.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); border: 2px solid #ef4444; border-radius: 20px; padding: 36px 32px; max-width: 520px; box-shadow: 0 0 50px rgba(239,68,68,0.4); backdrop-filter: blur(16px);">
          <div style="font-size: 56px; margin-bottom: 16px;">🛡️🔒</div>
          <h2 style="font-size: 22px; font-weight: 900; color: #fca5a5; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
            MÃ NGUỒN ĐÃ BỊ KHÓA
          </h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px 0;">
            Hệ thống bảo vệ mã nguồn <strong>Crew Lưới Búa</strong> đã kích hoạt chế độ tự vệ.
            <br>Mọi hành vi soi code, F12 hoặc sao chép trái phép đều bị nghiêm cấm!
          </p>
          <div style="display: inline-block; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;">
            ⚠️ Vui lòng đóng cửa sổ lập trình viên (F12) để tiếp tục
          </div>
        </div>
      `;
      document.body ? document.body.appendChild(overlay) : document.documentElement.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  }

  function removeLockdownWarning() {
    const overlay = document.getElementById('codeShieldLockOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  window.addEventListener('resize', detectDevTools);
  setInterval(detectDevTools, 800);
  startDebuggerTrap();

  // 7. Tắt log console để không rò rỉ biến hay dữ liệu nội bộ
  try {
    const noop = function() {};
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.dir = noop;
    console.table = noop;
  } catch (e) {}

})();
