/**
 * ==============================================================================
 * CREW LƯỠI BÚA - ULTRA LUXURY CONFIRM & ALERT MODAL SYSTEM
 * Thiết kế giao diện hộp thoại xác nhận đẳng cấp, kính mờ (Glassmorphism),
 * viền ánh kim và nút bấm phản hồi siêu mượt thay thế hoàn toàn hộp thoại mặc định
 * ==============================================================================
 */
(function() {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Hiển thị hộp thoại Xác nhận (Custom Confirm Modal)
   * @param {Object} opts
   * @param {string} opts.title Tiêu đề hộp thoại
   * @param {string} opts.targetName Tên đối tượng cần thao tác (thành viên, bản ghi,...)
   * @param {string} opts.targetType Loại đối tượng (Thành viên Crew, Bản ghi số nhà,...)
   * @param {string} opts.message Thông điệp chi tiết hoặc cảnh báo
   * @param {string} opts.confirmText Nhãn nút xác nhận (vd: "🗑️ Xoá Thành Viên", "⚡ Xác Nhận")
   * @param {string} opts.cancelText Nhãn nút hủy bỏ (vd: "✕ Hủy Bỏ")
   * @param {string} opts.type Loại: 'danger' | 'warning' | 'success' | 'primary'
   * @param {string} opts.icon Icon biểu tượng (vd: '🗑️', '⚠️', '🔓', '🔄')
   * @returns {Promise<boolean>} Trả về true nếu Đại ca bấm Đồng ý, false nếu Hủy bỏ
   */
  function showConfirmModal(opts) {
    return new Promise((resolve) => {
      const title = opts.title || 'Xác Nhận Thao Tác';
      const targetName = opts.targetName || '';
      const targetType = opts.targetType || '';
      const message = opts.message || 'Đại ca có chắc chắn muốn thực hiện thao tác này không?';
      const confirmText = opts.confirmText || '⚡ Xác Nhận';
      const cancelText = opts.cancelText || '✕ Hủy Bỏ';
      const type = opts.type || 'primary';
      const icon = opts.icon || (type === 'danger' ? '🗑️' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '⚡');

      // Tạo overlay backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'custom-modal-backdrop';

      let targetBoxHtml = '';
      if (targetName) {
        const avatarIcon = type === 'danger' ? '👤' : '📦';
        targetBoxHtml = `
          <div class="custom-modal-target-box">
            <span class="target-avatar">${avatarIcon}</span>
            <div style="flex: 1; text-align: left;">
              <div class="target-name">${escapeHtml(targetName)}</div>
              ${targetType ? `<div class="target-sub">${escapeHtml(targetType)}</div>` : ''}
            </div>
          </div>
        `;
      }

      backdrop.innerHTML = `
        <div class="custom-modal-card type-${type}" role="dialog" aria-modal="true">
          <div class="custom-modal-header">
            <div class="custom-modal-icon-badge">${icon}</div>
            <div style="text-align: left;">
              <h3 class="custom-modal-title">${escapeHtml(title)}</h3>
              <div class="custom-modal-subtitle">Crew Lưới Búa • Xác nhận quản trị</div>
            </div>
          </div>

          ${targetBoxHtml}

          <div class="custom-modal-message">
            ${message}
          </div>

          <div class="custom-modal-actions">
            <button type="button" class="btn-custom-cancel" id="btnCustomModalCancel">
              ${cancelText}
            </button>
            <button type="button" class="btn-custom-confirm ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : ''}" id="btnCustomModalConfirm">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      function cleanUp(result) {
        window.removeEventListener('keydown', handleKey);
        backdrop.style.opacity = '0';
        setTimeout(() => {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 150);
        resolve(result);
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanUp(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanUp(true);
        }
      }

      backdrop.querySelector('#btnCustomModalCancel')?.addEventListener('click', () => cleanUp(false));
      backdrop.querySelector('#btnCustomModalConfirm')?.addEventListener('click', () => cleanUp(true));

      // Click vào vùng mờ bên ngoài để đóng (hủy)
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanUp(false);
      });

      window.addEventListener('keydown', handleKey);
      document.body.appendChild(backdrop);

      // Tự động focus nút xác nhận để tiện bấm Enter
      setTimeout(() => {
        backdrop.querySelector('#btnCustomModalConfirm')?.focus();
      }, 50);
    });
  }

  /**
   * Hiển thị hộp thoại Thông Báo (Custom Alert Modal)
   * @param {Object|string} opts Hoặc chuỗi text trực tiếp
   */
  function showAlertModal(opts) {
    return new Promise((resolve) => {
      let options = typeof opts === 'string' ? { message: opts } : (opts || {});
      const rawMsg = options.message || '';
      const isDanger = rawMsg.includes('❌') || rawMsg.includes('⛔') || rawMsg.toLowerCase().includes('lỗi');
      const isSuccess = rawMsg.includes('✅') || rawMsg.includes('🎉') || rawMsg.toLowerCase().includes('thành công');
      const isWarning = rawMsg.includes('⚠️') || rawMsg.includes('cảnh báo');

      const title = options.title || (isDanger ? 'Lỗi Thao Tác' : isSuccess ? 'Thành Công' : isWarning ? 'Cảnh Báo' : 'Thông Báo Hệ Thống');
      const type = options.type || (isDanger ? 'danger' : isSuccess ? 'success' : isWarning ? 'warning' : 'primary');
      const icon = options.icon || (isDanger ? '❌' : isSuccess ? '✅' : isWarning ? '⚠️' : '🔔');
      const btnText = options.btnText || '✨ Đã Hiểu';

      const cleanMsg = rawMsg
        .replace(/[❌⛔✅🎉⚠️🔔]/g, '')
        .trim()
        .replace(/\n/g, '<br>');

      const backdrop = document.createElement('div');
      backdrop.className = 'custom-modal-backdrop';

      backdrop.innerHTML = `
        <div class="custom-modal-card type-${type}" role="dialog" aria-modal="true" style="max-width: 420px;">
          <div class="custom-modal-header">
            <div class="custom-modal-icon-badge">${icon}</div>
            <div style="text-align: left;">
              <h3 class="custom-modal-title">${escapeHtml(title)}</h3>
              <div class="custom-modal-subtitle">Crew Lưới Búa • Thông báo</div>
            </div>
          </div>

          <div class="custom-modal-message" style="margin-bottom: 22px;">
            ${cleanMsg || escapeHtml(rawMsg)}
          </div>

          <div class="custom-modal-actions" style="justify-content: stretch;">
            <button type="button" class="btn-custom-confirm ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : ''}" id="btnCustomAlertOk" style="width: 100%; flex: 1;">
              ${btnText}
            </button>
          </div>
        </div>
      `;

      function cleanUp() {
        window.removeEventListener('keydown', handleKey);
        backdrop.style.opacity = '0';
        setTimeout(() => {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 150);
        resolve();
      }

      function handleKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          cleanUp();
        }
      }

      backdrop.querySelector('#btnCustomAlertOk')?.addEventListener('click', cleanUp);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanUp();
      });

      window.addEventListener('keydown', handleKey);
      document.body.appendChild(backdrop);

      setTimeout(() => {
        backdrop.querySelector('#btnCustomAlertOk')?.focus();
      }, 50);
    });
  }

  /**
   * Hiển thị hộp thoại Nhập Liệu (Custom Prompt Modal)
   * @param {Object|string} opts Hoặc chuỗi thông điệp
   * @param {string} [defaultVal] Giá trị mặc định nếu opts là string
   * @returns {Promise<string|null>} Trả về chuỗi nhập vào hoặc null nếu Hủy bỏ
   */
  function showPromptModal(opts, defaultVal) {
    return new Promise((resolve) => {
      let options = typeof opts === 'string' ? { message: opts, defaultValue: defaultVal || '' } : (opts || {});
      const title = options.title || 'Nhập Thông Tin';
      const message = options.message || '';
      const defaultValue = options.defaultValue || '';
      const placeholder = options.placeholder || 'Nhập nội dung tại đây...';
      const confirmText = options.confirmText || '⚡ Xác Nhận';
      const cancelText = options.cancelText || '✕ Hủy Bỏ';
      const type = options.type || 'primary';
      const icon = options.icon || '✏️';

      const backdrop = document.createElement('div');
      backdrop.className = 'custom-modal-backdrop';

      backdrop.innerHTML = `
        <div class="custom-modal-card type-${type}" role="dialog" aria-modal="true" style="max-width: 440px;">
          <div class="custom-modal-header">
            <div class="custom-modal-icon-badge">${icon}</div>
            <div style="text-align: left;">
              <h3 class="custom-modal-title">${escapeHtml(title)}</h3>
              <div class="custom-modal-subtitle">Crew Lưới Búa • Xác thực thao tác</div>
            </div>
          </div>

          ${message ? `<div class="custom-modal-message" style="margin-bottom: 14px;">${escapeHtml(message).replace(/\n/g, '<br>')}</div>` : ''}

          <input type="text" class="custom-modal-input" id="customPromptInput" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />

          <div class="custom-modal-actions">
            <button type="button" class="btn-custom-cancel" id="btnCustomPromptCancel">
              ${cancelText}
            </button>
            <button type="button" class="btn-custom-confirm ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : ''}" id="btnCustomPromptConfirm">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      const input = backdrop.querySelector('#customPromptInput');

      function cleanUp(val) {
        window.removeEventListener('keydown', handleKey);
        backdrop.style.opacity = '0';
        setTimeout(() => {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 150);
        resolve(val);
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanUp(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanUp(input ? input.value : null);
        }
      }

      backdrop.querySelector('#btnCustomPromptCancel')?.addEventListener('click', () => cleanUp(null));
      backdrop.querySelector('#btnCustomPromptConfirm')?.addEventListener('click', () => cleanUp(input ? input.value : null));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanUp(null);
      });

      window.addEventListener('keydown', handleKey);
      document.body.appendChild(backdrop);

      setTimeout(() => {
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
    });
  }

  // Đăng ký toàn cục
  window.showConfirmModal = showConfirmModal;
  window.showAlertModal = showAlertModal;
  window.showPromptModal = showPromptModal;

  // Ghi đè window.alert mặc định của trình duyệt để toàn bộ thông báo đều biến thành Modal siêu đẹp
  window.alert = function(msg) {
    showAlertModal(msg);
  };

})();
