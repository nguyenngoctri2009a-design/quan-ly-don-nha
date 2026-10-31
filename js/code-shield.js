/**
 * ==============================================================================
 * CREW LƯỠI BÚA - CODE SHIELD (CHẾ ĐỘ NHẸ NHÀNG THEO LỆNH ĐẠI CA)
 * Chỉ chặn phím tắt F12, Ctrl+U, Ctrl+Shift+I và chuột phải.
 * Tuyệt đối không khóa màn hình, không chặn Device Mode / DevTools giả lập.
 * ==============================================================================
 */
(function() {
  'use strict';

  // 1. Dọn dẹp bất kỳ overlay khóa màn hình cũ nào nếu còn sót lại
  function cleanupOldOverlay() {
    try {
      const old = document.getElementById('codeShieldLockOverlay');
      if (old) old.remove();
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupOldOverlay);
  } else {
    cleanupOldOverlay();
  }

  // 2. Chặn chuột phải (Context Menu) nhẹ nhàng
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  }, true);

  // 3. Chỉ chặn các tổ hợp phím F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S
  window.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123 || e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + Shift + I / J / C / K
    if (e.ctrlKey && e.shiftKey && (
      e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.keyCode === 75 ||
      e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'
    )) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + U (Xem mã nguồn)
    if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 117 || e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + S (Lưu file)
    if (e.ctrlKey && (e.keyCode === 83 || e.keyCode === 115 || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + P (In trang)
    if (e.ctrlKey && (e.keyCode === 80 || e.keyCode === 112 || e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 4. Chặn kéo thả mã nguồn
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

})();
