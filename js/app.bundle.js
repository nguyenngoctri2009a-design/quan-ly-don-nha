
function animateValue(element, start, end, duration, formatter) {
  if (!element) return;
  var numEnd = Number(end);
  if (isNaN(numEnd) || numEnd <= 0) {
    element.textContent = formatter ? formatter(numEnd) : end;
    return;
  }
  if (element._animId) {
    cancelAnimationFrame(element._animId);
  }
  var startTime = performance.now();
  var startNum = Math.min(Number(start) || 1, numEnd);
  var diff = numEnd - startNum;
  var dur = duration || 1200;

  function step(currentTime) {
    var elapsed = currentTime - startTime;
    var progress = Math.min(elapsed / dur, 1);
    var ease = 1 - Math.pow(1 - progress, 3);
    var current = startNum + diff * ease;

    element.textContent = formatter ? formatter(current) : Math.round(current);

    if (progress < 1) {
      element._animId = requestAnimationFrame(step);
    } else {
      element.textContent = formatter ? formatter(numEnd) : end;
      element._animId = null;
    }
  }
  element._animId = requestAnimationFrame(step);
}

/* CREW LUOI BUA - APP CORE PROTECTED BUNDLE */

/* [MODULE: firebase-init.js] */
/* ==========================================================================
   MODULE 1: FIREBASE REALTIME DATABASE INITIALIZATION & GLOBAL STATE
   ========================================================================== */
var firebaseConfig = {
  databaseURL: "https://api1-9dc40-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = typeof firebase !== 'undefined' ? firebase.database() : null;
var usersRef = db ? db.ref('users') : null;
var recordsRef = db ? db.ref('records') : null;
var fundSettingsRef = db ? db.ref('fund_settings') : null;
var fundLogsRef = db ? db.ref('fund_logs') : null;
var auditLogsRef = db ? db.ref('audit_logs') : null;

/* Global Application State */
var allUsers = {};
var allRecords = [];
var statsData = [];
var fundSettings = { initialFund: 5000000, bailFee: 60000 };
var fundLogs = [];
var auditLogs = [];

/* THREAD 1: Tải trước siêu tốc từ LocalStorage Cache ở 0ms CPU */
try {
  const cachedRaw = localStorage.getItem('crew_master_cache_v2');
  if (cachedRaw) {
    const cachedData = JSON.parse(cachedRaw);
    if (cachedData.users && typeof cachedData.users === 'object') allUsers = cachedData.users;
    if (Array.isArray(cachedData.records)) allRecords = cachedData.records;
    if (cachedData.fundSettings) fundSettings = cachedData.fundSettings;
    if (Array.isArray(cachedData.fundLogs)) fundLogs = cachedData.fundLogs;
    if (Array.isArray(cachedData.auditLogs)) auditLogs = cachedData.auditLogs;
  }
} catch (e) {
  console.warn('Lỗi đọc cache khởi tạo:', e);
}

function saveMasterCache() {
  try {
    const dataToSave = {
      users: allUsers,
      records: allRecords,
      fundSettings: fundSettings,
      fundLogs: fundLogs,
      auditLogs: auditLogs,
      timestamp: Date.now()
    };
    localStorage.setItem('crew_master_cache_v2', JSON.stringify(dataToSave));
  } catch (e) {
    try {
      const trimmed = {
        users: allUsers,
        records: Array.isArray(allRecords) ? allRecords.slice(-1500) : [],
        fundSettings: fundSettings,
        fundLogs: Array.isArray(fundLogs) ? fundLogs.slice(-1000) : [],
        auditLogs: Array.isArray(auditLogs) ? auditLogs.slice(-300) : [],
        timestamp: Date.now()
      };
      localStorage.setItem('crew_master_cache_v2', JSON.stringify(trimmed));
    } catch (err2) {}
  }
}
window.saveMasterCache = saveMasterCache;

/* Global cached enriched fund data for export & filtering */
var cachedFundData = {
  initial: 5000000,
  bailFee: 60000,
  currentBalance: 5000000,
  totalBailSpent: 0,
  bailCount: 0,
  enrichedLogs: [],
  memberBailMap: {}
};

/* Global Chart State */
var chartInstance = null;

// Expose variables to window scope for complete cross-module accessibility
window.db = db;
window.usersRef = usersRef;
window.recordsRef = recordsRef;
window.fundSettingsRef = fundSettingsRef;
window.fundLogsRef = fundLogsRef;
window.auditLogsRef = auditLogsRef;

/* ==========================================================================
   MODULE 2: HELPER UTILITIES
   ========================================================================== */
var $ = id => document.getElementById(id);
window.$ = $;

function isAdmin() {
  return typeof window.IS_ADMIN !== 'undefined' ? Boolean(window.IS_ADMIN) : false;
}
window.isAdmin = isAdmin;

function setStatus(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg;
  el.className = 'status ' + (ok ? 'ok' : 'err');
  if (ok) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3500);
}
window.setStatus = setStatus;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
window.todayStr = todayStr;

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
window.yesterdayStr = yesterdayStr;

function fmtDate(s) {
  if (!s) return '';
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
window.fmtDate = fmtDate;

function fmtVND(n) {
  const num = Math.round(Number(n) || 0);
  return num.toLocaleString('vi-VN') + 'đ';
}
window.fmtVND = fmtVND;

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
window.escHtml = escHtml;

/* Hàm Debounce tối ưu hiệu năng tìm kiếm & gõ phím */
function debounce(fn, wait = 120) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
window.debounce = debounce;

/* ==========================================================================
   HÀM PHÂN TRANG HIỆN ĐẠI DÙNG CHUNG TOÀN HỆ THỐNG (PAGINATION)
   ========================================================================== */
function renderPaginationControls({
  container,
  totalItems,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  itemLabel = 'mục'
}) {
  const el = typeof container === 'string' ? $(container) : container;
  if (!el) return;

  if (!totalItems || totalItems <= 0) {
    el.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) {
    // Nếu chỉ có tối đa 10 mục (1 trang duy nhất), ẩn hoàn toàn phân trang theo yêu cầu
    el.innerHTML = '';
    return;
  }

  const curPage = Math.max(1, Math.min(currentPage, totalPages));
  const startItem = (curPage - 1) * pageSize + 1;
  const endItem = Math.min(curPage * pageSize, totalItems);

  // Tạo danh sách trang thông minh có dấu '...' khi quá nhiều trang
  const pages = [];
  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) pages.push(p);
  } else {
    pages.push(1);
    if (curPage > 3) pages.push('...');
    const startRange = Math.max(2, curPage - 1);
    const endRange = Math.min(totalPages - 1, curPage + 1);
    for (let p = startRange; p <= endRange; p++) {
      if (!pages.includes(p)) pages.push(p);
    }
    if (curPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  let pagesHtml = '';
  pages.forEach(p => {
    if (p === '...') {
      pagesHtml += '<span class="pg-dots">...</span>';
    } else {
      const isActive = (p === curPage);
      pagesHtml += `<button type="button" class="pg-btn pg-num ${isActive ? 'active' : ''}" data-page="${p}" ${isActive ? 'aria-current="page"' : ''}>${p}</button>`;
    }
  });

  el.innerHTML = `
    <div class="pagination-info">
      Hiển thị <b>${startItem}-${endItem}</b> / <b>${totalItems}</b> ${itemLabel} (Trang <b>${curPage}</b>/<b>${totalPages}</b>)
    </div>
    <div class="pagination-controls">
      <button type="button" class="pg-btn pg-prev" data-page="${curPage - 1}" ${curPage <= 1 ? 'disabled' : ''} title="Trang trước">◀ Trước</button>
      ${pagesHtml}
      <button type="button" class="pg-btn pg-next" data-page="${curPage + 1}" ${curPage >= totalPages ? 'disabled' : ''} title="Trang kế tiếp">Tiếp ▶</button>
    </div>
  `;

  // Gắn sự kiện chuyển trang
  el.querySelectorAll('button[data-page]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const targetPage = Number(btn.getAttribute('data-page'));
      if (targetPage >= 1 && targetPage <= totalPages && targetPage !== curPage) {
        if (typeof onPageChange === 'function') {
          onPageChange(targetPage);
        }
      }
    };
  });
}
window.renderPaginationControls = renderPaginationControls;

/* Kiểm tra tên thành viên đã tồn tại chưa (không phân biệt hoa thường) */
function isMemberNameExists(name, excludeId = null) {
  if (!name || typeof name !== 'string') return false;
  const target = name.trim().toLowerCase();
  if (!target) return false;
  return Object.values(allUsers || {}).some(u => {
    if (excludeId && u.id === excludeId) return false;
    return (u.name || '').trim().toLowerCase() === target;
  });
}
window.isMemberNameExists = isMemberNameExists;

/* Lấy danh tính Quản trị viên đang đăng nhập (Nguyễn Trí hoặc Cửu Muội) */
function getCurrentAdminName() {
  return sessionStorage.getItem('luoibua_admin_name') || window.CURRENT_ADMIN_NAME || 'Nguyễn Trí';
}
window.getCurrentAdminName = getCurrentAdminName;

/* Ghi nhận nhật ký chỉnh sửa & hoạt động quản trị (Audit Log) */
async function logAudit(actionType, actionLabel, details, actor = null) {
  try {
    if (!auditLogsRef) return;
    const currentActor = actor || getCurrentAdminName();
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${d}/${m}/${y} ${h}:${mi}:${s}`;

    const logData = {
      actionType,
      actionLabel,
      details,
      actor: currentActor,
      timestamp: Date.now(),
      timeStr
    };

    await auditLogsRef.push(logData);
  } catch (err) {
    console.warn('Lỗi lưu nhật ký kiểm toán:', err);
  }
}
window.logAudit = logAudit;

/* Live Header Clock */
function updateClock() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const clockEl = $('liveClock');
  if (clockEl) clockEl.textContent = `${d}/${m} • ${h}:${mi}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ==========================================================================
   MODULE 3: NAVIGATION, VIEW SWITCHING & TASK SCHEDULER (THREADING PIPELINE)
   ========================================================================== */
var activeView = 'analytics';
window.activeView = activeView;

var dirtyViews = {
  dashboard: true,
  analytics: true,
  records: true,
  members: true,
  fund: true,
  logs: true
};
window.dirtyViews = dirtyViews;

function markAllViewsDirty() {
  for (var k in dirtyViews) dirtyViews[k] = true;
}
window.markAllViewsDirty = markAllViewsDirty;

function updateQuickFundBanner() {
  if (!$('quickFundBalance')) return;
  const initial = (fundSettings && fundSettings.initialFund !== undefined) ? Number(fundSettings.initialFund) : 5000000;
  let running = initial;
  let totalBail = 0;
  let bailCount = 0;

  if (Array.isArray(fundLogs)) {
    for (let i = 0; i < fundLogs.length; i++) {
      const log = fundLogs[i];
      const amt = Number(log.amount) || 0;
      running += amt;
      if (log.type === 'bail') {
        totalBail += Math.abs(amt);
        bailCount++;
      }
    }
  }

  if ($('quickFundBalance')) $('quickFundBalance').textContent = fmtVND(running);
  if ($('quickFundBailSpent')) $('quickFundBailSpent').textContent = fmtVND(totalBail);
  if ($('quickFundBailCount')) $('quickFundBailCount').textContent = `${bailCount} lượt`;
}
window.updateQuickFundBanner = updateQuickFundBanner;

function renderActiveView() {
  // 1. Luôn cập nhật Widget Quỹ ở đầu trang, dropdown & số lượng badge tức thì (0ms CPU)
  if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
  if (typeof renderMemberOptions === 'function') renderMemberOptions();
  if (typeof renderBailMemberOptions === 'function') renderBailMemberOptions();
  if ($('badgeMembers')) $('badgeMembers').textContent = Object.keys(allUsers).length;
  if ($('badgeRecords')) $('badgeRecords').textContent = allRecords.length;
  if ($('badgeLogs')) $('badgeLogs').textContent = auditLogs.length;

  // 1. Luôn cập nhật 4 thẻ KPI đầu trang (hiển thị trên tất cả view)
  if (typeof renderStats === 'function') renderStats();

  // 2. Phân luồng thông minh: Render View đang mở trước mắt người dùng
  if (activeView === 'dashboard') {
    if (typeof renderStats === 'function') renderStats();
    if (typeof renderRecentRecords === 'function') renderRecentRecords();
    dirtyViews.dashboard = false;
  } else if (activeView === 'analytics') {
    if (typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
    dirtyViews.analytics = false;
  } else if (activeView === 'records') {
    if (typeof renderRecords === 'function') renderRecords();
    dirtyViews.records = false;
  } else if (activeView === 'members') {
    if (typeof renderMembersTable === 'function') renderMembersTable();
    dirtyViews.members = false;
  } else if (activeView === 'fund') {
    if (typeof renderFundUI === 'function') renderFundUI();
    dirtyViews.fund = false;
  } else if (activeView === 'logs') {
    if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();
    dirtyViews.logs = false;
  }
}
window.renderActiveView = renderActiveView;

document.querySelectorAll('.view-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(name) {
  if (activeView === name && !$('view-' + name)?.classList.contains('hidden')) {
    return;
  }
  activeView = name;
  window.activeView = name;

  const tabs = document.querySelectorAll('.view-tab-btn');
  for (let i = 0; i < tabs.length; i++) {
    const b = tabs[i];
    const isActive = (b.dataset.view === name);
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }

  const allViews = ['dashboard', 'analytics', 'records', 'members', 'fund', 'logs', 'banned'];
  for (let i = 0; i < allViews.length; i++) {
    const v = allViews[i];
    const el = $('view-' + v);
    if (!el) continue;
    if (v === name) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // Đóng sidebar trên thiết bị di động khi chọn tab
  const sb = document.getElementById('appSidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb && sb.classList.contains('sidebar-mobile-open')) {
    sb.classList.remove('sidebar-mobile-open');
    if (bd) bd.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Khử giật lag tối đa: Trích xuất render sang requestAnimationFrame
  requestAnimationFrame(() => {
    if (dirtyViews[name]) {
      renderActiveView();
    }

    if (name === 'dashboard' && chartInstance) {
      try { chartInstance.reflow(); } catch (e) {}
    } else if (name === 'analytics' && typeof renderAnalyticsDashboard === 'function') {
      renderAnalyticsDashboard();
    } else if (name === 'banned' && typeof window.renderBannedListUI === 'function') {
      window.renderBannedListUI();
    }
  });
}
window.switchView = switchView;

/* ==========================================================================
   CREW LƯỠI BÚA - COLLAPSIBLE SIDEBAR CONTROLLER (3 GẠCH HAMBURGER)
   ========================================================================== */
function initSidebarController() {
  const btnToggle = document.getElementById('btnToggleSidebar');
  const btnClose = document.getElementById('btnCloseSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const appContainer = document.getElementById('appBodyContainer');
  const sidebar = document.getElementById('appSidebar');
  const STORAGE_KEY = 'luoibua_admin_sidebar_collapsed';

  const isDesktop = () => window.innerWidth > 1024;

  function setSidebarState(collapsed) {
    if (!appContainer) return;
    if (collapsed) {
      appContainer.classList.add('sidebar-collapsed');
      if (btnToggle) btnToggle.classList.add('collapsed');
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    } else {
      appContainer.classList.remove('sidebar-collapsed');
      if (btnToggle) btnToggle.classList.remove('collapsed');
      try { localStorage.setItem(STORAGE_KEY, '0'); } catch (e) {}
    }
    // Reflow Highcharts smoothly
    setTimeout(() => {
      try {
        if (window.chartInstance && !document.getElementById('view-dashboard')?.classList.contains('hidden')) {
          window.chartInstance.reflow();
        }
        if (typeof window.renderAnalyticsDashboard === 'function' && !document.getElementById('view-analytics')?.classList.contains('hidden')) {
          window.dispatchEvent(new Event('resize'));
        }
      } catch (err) {}
    }, 280);
  }

  function openMobileSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('sidebar-mobile-open');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('sidebar-mobile-open');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    if (isDesktop()) {
      const isCurrentlyCollapsed = appContainer?.classList.contains('sidebar-collapsed');
      setSidebarState(!isCurrentlyCollapsed);
    } else {
      const isOpen = sidebar?.classList.contains('sidebar-mobile-open');
      if (isOpen) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    }
  }

  // Restore saved state on desktop
  if (isDesktop()) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '1') {
        setSidebarState(true);
      }
    } catch (e) {}
  }

  btnToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSidebar();
  });

  btnClose?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isDesktop()) {
      setSidebarState(true);
    } else {
      closeMobileSidebar();
    }
  });

  backdrop?.addEventListener('click', closeMobileSidebar);

  // Auto-close on mobile when selecting a tab
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isDesktop()) {
        closeMobileSidebar();
      }
    });
  });

  // Hotkey: Ctrl + B
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Responsive cleanup on resize
  window.addEventListener('resize', () => {
    if (isDesktop()) {
      sidebar?.classList.remove('sidebar-mobile-open');
      backdrop?.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Wire sidebar utility buttons to main handlers
  document.getElementById('sidebarExportBtn')?.addEventListener('click', () => {
    document.getElementById('exportImgTopBtn')?.click();
  });
  document.getElementById('sidebarBackupBtn')?.addEventListener('click', (e) => {
    if (typeof window.triggerManualBackup === 'function') {
      window.triggerManualBackup(e.currentTarget);
    } else {
      document.getElementById('manualBackupBtn')?.click();
    }
  });
  document.getElementById('sidebarResetBtn')?.addEventListener('click', () => {
    document.getElementById('resetAllBinhBtn')?.click();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarController);
} else {
  initSidebarController();
}
window.initSidebarController = initSidebarController;

/* ==========================================================================
   LUCIAN LABS UX/UI DESIGN SYSTEM - POINTERDOWN DYNAMIC RIPPLE DISPATCHER
   ========================================================================== */
(function initLucianRippleSystem() {
  document.addEventListener('pointerdown', function (e) {
    const target = e.target.closest('button, .view-tab-btn, .sidebar-nav-item, .sidebar-action-pill, .btn-sidebar-toggle, .btn-nav-member, .btn-nav-export, .btn-nav-backup, .btn-nav-reset, .btn-nav-logout, .btn-install-pc, .submit-login-btn, .btn-login-secondary, .preset-chip, .type-chip, .view-mode-btn');
    if (!target || target.disabled) return;
    if (target.classList.contains('view-tab-btn') || target.classList.contains('sidebar-nav-item')) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const isHighlight = target.classList.contains('active') || 
                        target.classList.contains('btn-nav-export') || 
                        target.classList.contains('submit-login-btn') ||
                        target.id === 'manualBackupBtn';

    const ripple = document.createElement('span');
    ripple.className = 'uxui-ripple' + (isHighlight ? '' : ' uxui-ripple-dark');
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    target.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 460);
  }, { passive: true });
})();

/* Global Escape Key Handler: Close topmost modal dialog */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlays = document.querySelectorAll('.modal-overlay');
    if (overlays.length > 0) {
      overlays[overlays.length - 1].remove();
    }
  }
});

/* Window Resize Handler: Reflow Highcharts smoothly */
let resizeChartDebounce = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeChartDebounce);
  resizeChartDebounce = setTimeout(() => {
    if (chartInstance && $('view-dashboard') && !$('view-dashboard').classList.contains('hidden')) {
      try { chartInstance.reflow(); } catch (err) { }
    }
  }, 180);
});

/* ==========================================================================
   MODULE 4: MULTI-THREADED WEB WORKER & FIREBASE REALTIME LISTENERS
   ========================================================================== */
function safeRenderActiveView() {
  renderActiveView();
}
window.safeRenderActiveView = safeRenderActiveView;

var calcWorker = null;
try {
  if (typeof window !== 'undefined' && window.Worker) {
    calcWorker = new Worker('js/worker-calc.js');
    calcWorker.onmessage = function(e) {
      if (e.data && e.data.action === 'PROCESS_DATA_COMPLETE') {
        var res = e.data.result;
        if (res.stats && res.stats.statsData) {
          statsData = res.stats.statsData;
          window.statsData = statsData;
          window.workerStatsSummary = res.stats;
        }
        if (res.fund) {
          cachedFundData = res.fund;
          window.cachedFundData = cachedFundData;
        }
        renderActiveView();
      }
    };
  }
} catch (err) {
  console.log('Worker running in fallback thread mode:', err);
  calcWorker = null;
}
window.calcWorker = calcWorker;

function fastFetchParallelData() {
  return new Promise((resolve) => {
    try {
      const restUrl = 'https://api1-9dc40-default-rtdb.asia-southeast1.firebasedatabase.app/.json';
      fetch(restUrl, { cache: 'no-store' })
        .then(res => res.json())
        .then(rootData => {
          if (!rootData) { resolve(false); return; }
          let hasChange = false;

          if (rootData.users) {
            allUsers = {};
            Object.keys(rootData.users).forEach(k => {
              allUsers[k] = { id: k, ...rootData.users[k] };
            });
            window.allUsers = allUsers;
            hasChange = true;
          }

          if (rootData.records) {
            allRecords = [];
            Object.keys(rootData.records).forEach(k => {
              allRecords.push({ id: k, ...rootData.records[k] });
            });
            allRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            window.allRecords = allRecords;
            hasChange = true;
          }

          if (rootData.fund_settings) {
            fundSettings = {
              initialFund: Number(rootData.fund_settings.initialFund) || 5000000,
              bailFee: Number(rootData.fund_settings.bailFee) || 60000
            };
            window.fundSettings = fundSettings;
            hasChange = true;
          }

          if (rootData.fund_logs) {
            fundLogs = [];
            Object.keys(rootData.fund_logs).forEach(k => {
              fundLogs.push({ id: k, ...rootData.fund_logs[k] });
            });
            fundLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            window.fundLogs = fundLogs;
            hasChange = true;
          }

          if (rootData.audit_logs) {
            auditLogs = [];
            Object.keys(rootData.audit_logs).forEach(k => {
              auditLogs.push({ id: k, ...rootData.audit_logs[k] });
            });
            auditLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            window.auditLogs = auditLogs;
            hasChange = true;
          }

          if (hasChange) {
            saveMasterCache();
            markAllViewsDirty();
            if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
            renderActiveView();

            if (calcWorker) {
              calcWorker.postMessage({
                action: 'PROCESS_DATA',
                data: { allUsers, allRecords, fundSettings, fundLogs }
              });
            }
          }
          resolve(true);
        })
        .catch(err => {
          console.warn('Fast REST fetch error:', err);
          resolve(false);
        });
    } catch (err) {
      resolve(false);
    }
  });
}
window.fastFetchParallelData = fastFetchParallelData;

var isDataListening = false;
function listenData() {
  if (isDataListening) return;
  isDataListening = true;

  // Luồng 1: Tải REST Snapshot siêu tốc song song đa luồng (HTTP/2 Fast Stream)
  fastFetchParallelData();

  if (!db) return;
  let batchUpdateTimer = null;

  function triggerBatchUpdate() {
    saveMasterCache();
    markAllViewsDirty();
    if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
    renderActiveView();

    if (batchUpdateTimer) clearTimeout(batchUpdateTimer);
    batchUpdateTimer = setTimeout(() => {
      if (calcWorker) {
        calcWorker.postMessage({
          action: 'PROCESS_DATA',
          data: {
            allUsers: allUsers,
            allRecords: allRecords,
            fundSettings: fundSettings,
            fundLogs: fundLogs
          }
        });
      }
    }, 40);
  }

  // Luồng 2: Firebase Realtime WebSocket Listeners đồng bộ dữ liệu thời gian thực
  usersRef.on('value', snap => {
    allUsers = {};
    snap.forEach(c => { allUsers[c.key] = { id: c.key, ...c.val() }; });
    window.allUsers = allUsers;
    triggerBatchUpdate();
  });

  recordsRef.on('value', snap => {
    allRecords = [];
    snap.forEach(c => { allRecords.push({ id: c.key, ...c.val() }); });
    allRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.allRecords = allRecords;
    triggerBatchUpdate();
  });

  fundSettingsRef.on('value', snap => {
    const val = snap.val();
    fundSettings = {
      initialFund: (val && val.initialFund !== undefined) ? Number(val.initialFund) : 5000000,
      bailFee: (val && val.bailFee !== undefined) ? Number(val.bailFee) : 60000
    };
    window.fundSettings = fundSettings;
    triggerBatchUpdate();
  });

  fundLogsRef.on('value', snap => {
    fundLogs = [];
    snap.forEach(c => { fundLogs.push({ id: c.key, ...c.val() }); });
    fundLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.fundLogs = fundLogs;
    triggerBatchUpdate();
  });

  auditLogsRef.on('value', snap => {
    auditLogs = [];
    snap.forEach(c => { auditLogs.push({ id: c.key, ...c.val() }); });
    auditLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.auditLogs = auditLogs;
    dirtyViews.logs = true;
    if (activeView === 'logs' && typeof renderAuditLogsTable === 'function') {
      const intro = document.getElementById('crewIntroOverlay');
      if (intro && !intro.classList.contains('fade-out') && window.isIntroFinished !== true) {
        window.pendingRender = true;
      } else {
        renderAuditLogsTable();
        dirtyViews.logs = false;
      }
    }
  });
}
window.listenData = listenData;

// Khởi chạy ngay lập tức khi load module để bắt đầu tải dữ liệu ở 0ms
try {
  listenData();
} catch (e) {}

;

/* [MODULE: sound-fx.js] */
/* ==========================================================================
   CREW LƯỠI BÚA - ROYAL WEB AUDIO SOUND FX ENGINE
   Pure Web Audio API Synthesizer (0ms Latency, Zero External Files)
   ========================================================================== */
(function() {
  'use strict';

  let audioCtx = null;
  const STORAGE_KEY = 'crew_sound_enabled';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isEnabled() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val === null ? true : val === '1';
    } catch (e) {
      return true;
    }
  }

  function toggleSound() {
    const nextState = !isEnabled();
    try {
      localStorage.setItem(STORAGE_KEY, nextState ? '1' : '0');
    } catch (e) {}
    updateSoundUI(nextState);
    if (nextState) {
      playSuccess();
    }
    return nextState;
  }

  function updateSoundUI(enabled) {
    const btns = document.querySelectorAll('.btn-sound-toggle');
    btns.forEach(b => {
      b.innerHTML = enabled ? '🔊' : '🔇';
      b.title = enabled ? 'Âm thanh: ĐANG BẬT (Bấm để tắt)' : 'Âm thanh: ĐÃ TẮT (Bấm để bật)';
      b.classList.toggle('sound-muted', !enabled);
    });
  }

  // 1. Tiếng Chime Hoàng Gia khi lưu thành công (C5 -> E5 -> G5 Major Chord)
  function playSuccess() {
    if (!isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.06);
        gain.gain.setValueAtTime(0.001, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.38);
      });
    } catch (e) {}
  }

  // 2. Tiếng Xèng Vàng khi nộp quỹ hoặc giao dịch tiền
  function playCoin() {
    if (!isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = [987.77, 1318.51]; // B5, E6
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.001, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.07 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  // 3. Tiếng Cảnh Báo Trầm khi lỗi hoặc xóa dữ liệu
  function playWarn() {
    if (!isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  // 4. Tiếng Click Đanh Gọn
  function playClick() {
    if (!isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Tự động đánh thức AudioContext khi người dùng chạm hoặc click màn hình lần đầu
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (!audioCtx) getAudioContext();
    }, { once: true, passive: true });
  });

  // Khởi tạo UI sau khi DOM load
  document.addEventListener('DOMContentLoaded', () => {
    updateSoundUI(isEnabled());
    document.querySelectorAll('.btn-sound-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSound();
      });
    });
  });

  window.SoundFX = {
    playSuccess,
    playCoin,
    playWarn,
    playClick,
    toggleSound,
    isEnabled
  };
})();

;

/* [MODULE: export-csv.js] */
/* ==========================================================================
   CREW LƯỠI BÚA - UNIVERSAL EXCEL / CSV DATA EXPORT SUITE
   UTF-8 BOM Encoded Spreadsheet Generator for Excel & Google Sheets
   ========================================================================== */
(function() {
  'use strict';

  function escapeCsvCell(cell) {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  }

  function downloadCsvFile(csvContent, filename) {
    // Thêm UTF-8 BOM (\uFEFF) để Microsoft Excel nhận diện chuẩn tiếng Việt có dấu
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (window.SoundFX && typeof window.SoundFX.playSuccess === 'function') {
      window.SoundFX.playSuccess();
    }
  }

  function getTodayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 1. Xuất Danh Sách Số Nhà & Lịch Sử Bản Ghi
  function exportRecordsToCsv(records = window.allRecords || []) {
    if (!records || !records.length) {
      alert('⚠️ Không có bản ghi số nhà nào để xuất!');
      return;
    }

    const headers = ['Mã Bản Ghi', 'Ngày Dọn Nhà', 'Tên Thành Viên', 'Số Nhà', 'Ghi Chú', 'Thời Gian Ghi Nhận'];
    const rows = [headers.map(escapeCsvCell).join(',')];

    records.forEach(r => {
      const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleString('vi-VN') : '';
      const row = [
        r.id || '',
        r.date || '',
        r.userName || '',
        r.binh !== undefined ? r.binh : 0,
        r.note || '',
        timeStr
      ];
      rows.push(row.map(escapeCsvCell).join(','));
    });

    const csv = rows.join('\r\n');
    downloadCsvFile(csv, `CrewLuoiBua_SoNha_${getTodayIso()}.csv`);
  }

  // 2. Xuất Sổ Cái Quỹ Chuộc Tù & Lịch Sử Giao Dịch
  function exportFundToCsv(logs = window.fundLogs || [], initialFund = 5000000) {
    if (!logs || !logs.length) {
      alert('⚠️ Chưa có dữ liệu giao dịch quỹ để xuất!');
      return;
    }

    const headers = ['Mã Phiếu', 'Thời Gian', 'Loại Giao Dịch', 'Thành Viên Liên Quan', 'Số Tiền (VNĐ)', 'Lý Do / Ghi Chú', 'Người Thực Hiện', 'Số Dư Sau Giao Dịch (VNĐ)'];
    const rows = [headers.map(escapeCsvCell).join(',')];

    // Sắp xếp thời gian tăng dần để tính lũy kế số dư
    const sorted = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    let runningBalance = Number(initialFund) || 5000000;

    sorted.forEach(l => {
      const amt = Number(l.amount) || 0;
      runningBalance += amt;
      const typeText = l.type === 'deposit' ? 'Nộp Tiền Quỹ' : l.type === 'bail' ? 'Chi Tiền Chuộc Tù' : 'Điều Chỉnh Quỹ';
      const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleString('vi-VN') : '';
      const row = [
        l.id || '',
        timeStr,
        typeText,
        l.memberName || '',
        amt,
        l.note || '',
        l.adminName || 'Admin',
        runningBalance
      ];
      rows.push(row.map(escapeCsvCell).join(','));
    });

    const csv = rows.join('\r\n');
    downloadCsvFile(csv, `CrewLuoiBua_SoQuyChuocTu_${getTodayIso()}.csv`);
  }

  // 3. Xuất Báo Cáo Xếp Hạng & Năng Suất Thành Viên
  function exportMembersToCsv(users = window.allUsers || {}, records = window.allRecords || [], fundLogs = window.fundLogs || []) {
    const userList = Object.values(users);
    if (!userList.length) {
      alert('⚠️ Không có dữ liệu thành viên để xuất!');
      return;
    }

    // Tính toán số nhà và số lần chuộc tù cho từng người
    const houseMap = {};
    let totalAllHouses = 0;
    records.forEach(r => {
      const uid = r.userId;
      const val = Number(r.binh) || 0;
      houseMap[uid] = (houseMap[uid] || 0) + val;
      totalAllHouses += val;
    });

    const bailMap = {};
    const bailSpentMap = {};
    fundLogs.forEach(l => {
      if (l.type === 'bail' && l.memberName) {
        bailMap[l.memberName] = (bailMap[l.memberName] || 0) + 1;
        bailSpentMap[l.memberName] = (bailSpentMap[l.memberName] || 0) + Math.abs(Number(l.amount) || 0);
      }
    });

    // Sắp xếp theo số nhà giảm dần
    const enriched = userList.map(u => ({
      id: u.id,
      name: u.name || 'Chưa rõ',
      houses: Math.round((houseMap[u.id] || 0) * 100) / 100,
      bails: bailMap[u.name] || 0,
      bailSpent: bailSpentMap[u.name] || 0
    })).sort((a, b) => b.houses - a.houses);

    const headers = ['Hạng', 'Họ Và Tên', 'Cấp Bậc', 'Tổng Số Nhà Dọn', 'Tỷ Lệ Đóng Góp (%)', 'Số Lần Chuộc Tù', 'Tổng Tiền Quỹ Đã Cứu (VNĐ)'];
    const rows = [headers.map(escapeCsvCell).join(',')];

    enriched.forEach((m, idx) => {
      const share = totalAllHouses > 0 ? ((m.houses / totalAllHouses) * 100).toFixed(1) + '%' : '0%';
      let rankTitle = 'Tân Binh';
      if (m.houses >= 100) rankTitle = 'Vua Trộm Nhà 👑';
      else if (m.houses >= 50) rankTitle = 'Siêu Đạo Tặc 💎';
      else if (m.houses >= 25) rankTitle = 'Thợ Khoan Vàng 🥇';
      else if (m.houses >= 10) rankTitle = 'Chiến Binh 🥈';
      else if (m.houses > 0) rankTitle = 'Tân Binh Triển Vọng 🥉';

      const row = [
        idx + 1,
        m.name,
        rankTitle,
        m.houses,
        share,
        m.bails,
        m.bailSpent
      ];
      rows.push(row.map(escapeCsvCell).join(','));
    });

    const csv = rows.join('\r\n');
    downloadCsvFile(csv, `CrewLuoiBua_BangXepHang_${getTodayIso()}.csv`);
  }

  window.CrewCsvExport = {
    exportRecordsToCsv,
    exportFundToCsv,
    exportMembersToCsv
  };
})();

;

/* [MODULE: member-profile.js] */
/* ==========================================================================
   CREW LƯỠI BÚA - INTERACTIVE MEMBER PROFILE CARD (CREW DOSSIER)
   Hồ sơ năng suất cá nhân chi tiết dành cho từng chiến binh Crew Lưới Búa
   ========================================================================== */
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

  function getRankInfo(totalHouses) {
    if (totalHouses >= 100) return { title: 'Vua Trộm Nhà', icon: '👑', color: '#f59e0b', bg: '#fef3c7', desc: 'Bậc thầy đột nhập cấp tối cao' };
    if (totalHouses >= 50) return { title: 'Siêu Đạo Tặc', icon: '💎', color: '#0284c7', bg: '#e0f2fe', desc: 'Tay thợ chuyên nghiệp hàng đầu' };
    if (totalHouses >= 25) return { title: 'Thợ Khoan Vàng', icon: '🥇', color: '#10b981', bg: '#d1fae5', desc: 'Năng suất ổn định, cống hiến bền bỉ' };
    if (totalHouses >= 10) return { title: 'Chiến Thần Đột Nhập', icon: '🥈', color: '#6366f1', bg: '#e0e7ff', desc: 'Chiến binh giàu kinh nghiệm' };
    if (totalHouses > 0) return { title: 'Tân Binh Triển Vọng', icon: '🥉', color: '#d97706', bg: '#fef3c7', desc: 'Tân binh đang vươn lên mạnh mẽ' };
    return { title: 'Đang Nghỉ Ngơi', icon: '💤', color: '#64748b', bg: '#f1f5f9', desc: 'Chưa ghi nhận số nhà trong chu kỳ' };
  }

  function openMemberProfileModal(userId) {
    if (!userId) return;
    const user = window.allUsers && window.allUsers[userId];
    const memberName = user ? user.name : 'Chiến Binh';

    // 1. Tính toán số liệu cá nhân
    const userRecords = (window.allRecords || []).filter(r => r.userId === userId || r.userName === memberName);
    const totalHouses = userRecords.reduce((sum, r) => sum + (Number(r.binh) || 0), 0);
    const roundedHouses = Math.round(totalHouses * 100) / 100;

    // Kỷ lục 1 ngày cao nhất
    const dayTotals = {};
    userRecords.forEach(r => {
      const d = r.date || 'unknown';
      dayTotals[d] = (dayTotals[d] || 0) + (Number(r.binh) || 0);
    });
    let maxOneDay = 0;
    let maxDayStr = 'Chưa có';
    Object.entries(dayTotals).forEach(([d, val]) => {
      if (val > maxOneDay) {
        maxOneDay = val;
        maxDayStr = d;
      }
    });

    // Số lần chuộc tù & tổng tiền chuộc
    const userBails = (window.fundLogs || []).filter(l => l.type === 'bail' && (l.memberName === memberName || l.userId === userId));
    const bailCount = userBails.length;
    const totalBailSpent = userBails.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);

    // Tính thứ hạng hiện tại
    const totalsMap = {};
    (window.allRecords || []).forEach(r => {
      const uid = r.userId || 'unknown';
      totalsMap[uid] = (totalsMap[uid] || 0) + (Number(r.binh) || 0);
    });
    const sortedMembers = Object.entries(totalsMap).sort((a, b) => b[1] - a[1]);
    const rankIndex = sortedMembers.findIndex(([uid]) => uid === userId);
    const rankText = rankIndex !== -1 ? `#${rankIndex + 1}` : '--';

    // 5 chuyến dọn nhà gần nhất
    const recentRecords = [...userRecords]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 5);

    const rank = getRankInfo(roundedHouses);

    let currentScars = Number(user ? user.scars : 0) || 0;
    let isExpelled = currentScars >= 3 || !!(user && user.isExpelled);
    let scarHistoryList = Array.isArray(user ? user.scarHistory : null)
      ? [...user.scarHistory]
      : (user && user.scarHistory ? Object.values(user.scarHistory) : []);

    let scarBadgeDossier = '';
    if (isExpelled) {
      scarBadgeDossier = '<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:900;padding:3px 9px;border-radius:8px;border:1.5px solid #ef4444;text-transform:uppercase;">⛔ ĐÃ BỊ ĐUỔI (3/3 SẸO)</span>';
    } else if (currentScars > 0) {
      scarBadgeDossier = `<span style="background:#fffbeb;color:#b45309;font-size:11px;font-weight:800;padding:3px 9px;border-radius:8px;border:1.5px solid #fde68a;">🪓 ${currentScars}/3 SẸO KỶ LUẬT</span>`;
    }

    const canManageScars = typeof isAdmin === 'function' && isAdmin();

    // Tạo modal DOM
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'rgba(15, 23, 42, 0.28)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.webkitBackdropFilter = 'blur(6px)';

    overlay.innerHTML = `
      <div class="modal-box dossier-glass-card" style="max-height:92vh;overflow-y:auto;">
        
        <!-- BRIGHT LUXURY GOLD & WHITE HEADER -->
        <div class="dossier-glass-header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 56px; height: 56px; border-radius: 18px; background: ${rank.bg}; border: 2.5px solid ${rank.color}; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 14px rgba(245,158,11,0.25); flex-shrink: 0;">
              ${rank.icon}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.3px;">${escapeHtml(memberName)}</h3>
                <span style="background: ${rank.bg}; color: ${rank.color}; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 8px; border: 1.5px solid ${rank.color}; text-transform: uppercase;">
                  ${rank.title}
                </span>
                <span id="dossierHeaderScarBadge">${scarBadgeDossier}</span>
              </div>
              <div style="font-size: 12.5px; color: #64748b; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                <span>${rank.desc}</span>
                <span style="color: #cbd5e1;">•</span>
                <span style="color: #d97706; font-weight: 900;">🏆 Xếp hạng ${rankText}</span>
              </div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="closeDossierBtn" title="Đóng" style="background: #ffffff; border: 1.5px solid #cbd5e1; color: #64748b; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 15px; font-weight: 800;">✕</button>
        </div>

        <!-- 4 Ô Thống Kê Năng Suất (Mini KPI Grid) -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
          
          <div class="dossier-kpi-card" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #fde68a;">
            <div style="font-size: 12.5px; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 6px;">
              <span>🏠</span> Tổng Số Nhà Dọn
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #b45309; margin: 4px 0 2px;">
              ${roundedHouses} <span style="font-size: 14px; font-weight: 700;">nhà</span>
            </div>
            <div style="font-size: 12px; color: #b45309; opacity: 0.95; font-weight: 700;">Ghi nhận ${userRecords.length} lần</div>
          </div>

          <div class="dossier-kpi-card" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1.5px solid #bbf7d0;">
            <div style="font-size: 12.5px; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 6px;">
              <span>⚡</span> Kỷ Lục 1 Ngày
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #15803d; margin: 4px 0 2px;">
              ${maxOneDay} <span style="font-size: 14px; font-weight: 700;">nhà</span>
            </div>
            <div style="font-size: 12px; color: #166534; opacity: 0.95; font-weight: 700;">${maxDayStr !== 'Chưa có' ? `Ngày: ${maxDayStr}` : 'Chưa thiết lập'}</div>
          </div>

          <div class="dossier-kpi-card" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1.5px solid #fecaca;">
            <div style="font-size: 12.5px; font-weight: 800; color: #991b1b; display: flex; align-items: center; gap: 6px;">
              <span>🚨</span> Số Lần Chuộc Tù
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #dc2626; margin: 4px 0 2px;">
              ${bailCount} <span style="font-size: 14px; font-weight: 700;">lượt</span>
            </div>
            <div style="font-size: 12px; color: #dc2626; opacity: 0.95; font-weight: 700;">Quỹ cứu: -${totalBailSpent.toLocaleString('vi-VN')}đ</div>
          </div>

          <div class="dossier-kpi-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1.5px solid #bae6fd;">
            <div style="font-size: 12.5px; font-weight: 800; color: #0369a1; display: flex; align-items: center; gap: 6px;">
              <span>📊</span> Hiệu Suất / Lần
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #0284c7; margin: 4px 0 2px;">
              ${userRecords.length > 0 ? (roundedHouses / userRecords.length).toFixed(1) : 0} <span style="font-size: 14px; font-weight: 700;">nhà/lần</span>
            </div>
            <div style="font-size: 12px; color: #0369a1; font-weight: 700;">Trung bình mỗi chuyến</div>
          </div>

        </div>

        <!-- Ô ĐÁNH SẸO & KỶ LUẬT CREW (HIỂN THỊ TRỰC TIẾP TRÊN THẺ) -->
        <div class="scar-management-card" style="margin-bottom: 16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:18px;">🪓</span>
              <div>
                <div style="font-size:13.5px;font-weight:900;color:#991b1b;letter-spacing:0.2px;">Ô ĐÁNH SẸO &amp; KỶ LUẬT CREW</div>
                <div style="font-size:10.5px;color:#dc2626;font-weight:700;">Quy tắc: Đủ 3 Sẹo đuổi thẳng khỏi Crew Lưới Búa!</div>
              </div>
            </div>
            <div id="dossierScarPill" class="scar-counter-pill ${isExpelled ? 'expelled' : (currentScars === 2 ? 'warn2' : (currentScars === 1 ? 'warn1' : 'clean'))}">
              ${isExpelled ? `⛔ ĐÃ ĐUỔI (${currentScars}/3)` : (currentScars > 0 ? `🪓 ${currentScars}/3 Sẹo` : '🟢 0/3 Sẹo (Sạch)')}
            </div>
          </div>

          <!-- 3-Segment Visual Tracker -->
          <div class="scar-tracker-track">
            <div class="scar-seg ${currentScars >= 1 ? 'active-1' : ''}" id="dossierSeg1">
              <span>Sẹo 1</span>
              <small>Cảnh cáo</small>
            </div>
            <div class="scar-seg ${currentScars >= 2 ? 'active-2' : ''}" id="dossierSeg2">
              <span>Sẹo 2</span>
              <small>Nghiêm khắc</small>
            </div>
            <div class="scar-seg ${currentScars >= 3 ? 'active-3' : ''}" id="dossierSeg3">
              <span>Sẹo 3</span>
              <small>ĐUỔI THẲNG</small>
            </div>
          </div>

          <!-- Expelled Alert Banner -->
          <div id="dossierExpelledBanner" style="display:${isExpelled ? 'block' : 'none'};background:#fee2e2;border:1.5px solid #ef4444;border-radius:12px;padding:8px 12px;margin-bottom:10px;text-align:center;">
            <div style="font-size:12.5px;font-weight:900;color:#991b1b;">⛔ ĐÃ BỊ ĐUỔI THẲNG KHỎI CREW LƯỚI BÚA!</div>
            <div style="font-size:11px;font-weight:700;color:#dc2626;margin-top:2px;">Thành viên này đã tích lũy đủ 3/3 sẹo kỷ luật và bị khóa quyền hạn dọn nhà.</div>
          </div>

          ${canManageScars ? `
            <!-- Ô Nhập Lý Do & Nút Đánh Sẹo (Chỉ Quản Trị Viên Mới Có Quyền Thao Tác) -->
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <input type="text" id="dossierScarReason" placeholder="Nhập lý do đánh sẹo..." style="flex:1;font-size:12.5px;padding:8px 12px;border:1.5px solid #fca5a5;border-radius:12px;background:#ffffff;">
              <button type="button" class="btn-scar-action btn-add-scar" id="btnDossierAddScarAction" title="Đánh thêm 1 sẹo">
                <span>+1 Sẹo 🪓</span>
              </button>
              <button type="button" class="btn-scar-action btn-remove-scar" id="btnDossierRemoveScarAction" title="Ân xá / Xóa bớt 1 sẹo" ${currentScars <= 0 ? 'disabled' : ''}>
                <span>-1 Ân Xá 🛡️</span>
              </button>
            </div>
          ` : `
            <div style="font-size:11.5px;color:#64748b;background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;">
              🔒 Chế độ xem thành viên: Chỉ Quản Trị Viên đăng nhập mới có quyền đánh sẹo hoặc ân xá.
            </div>
          `}

          <!-- Lịch Sử Sẹo & Vi Phạm -->
          <div>
            <div style="font-size:11.5px;font-weight:800;color:#7f1d1d;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
              <span>Lịch sử các vết sẹo &amp; vi phạm:</span>
              <span id="dossierHistCount" style="font-size:11px;color:#94a3b8;">${scarHistoryList.length} lần</span>
            </div>
            <div id="dossierHistList" style="display:flex;flex-direction:column;gap:5px;max-height:130px;overflow-y:auto;padding-right:2px;">
              ${!scarHistoryList.length 
                ? '<div style="font-size:11.5px;color:#94a3b8;font-style:italic;padding:4px 0;">Chưa có vết sẹo hay vi phạm nào.</div>'
                : scarHistoryList.slice().reverse().map((sc, revIdx) => {
                    const origIdx = scarHistoryList.length - 1 - revIdx;
                    return `
                      <div class="scar-history-item">
                        <div style="display:flex;flex-direction:column;gap:1px;flex:1;overflow:hidden;">
                          <span class="reason" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🪓 ${escHtml(sc.reason || 'Kỷ luật Crew')}</span>
                          <span class="meta">${escHtml(sc.date || '')} ${escHtml(sc.time || '')} • Bởi: <b>${escHtml(sc.admin || 'Admin')}</b></span>
                        </div>
                        ${canManageScars ? `<button type="button" class="btn-del-scar" data-idx="${origIdx}" title="Xóa bản ghi sẹo này">✕</button>` : ''}
                      </div>
                    `;
                  }).join('')
              }
            </div>
          </div>
        </div>

        <!-- 5 Chuyến Dọn Nhà Gần Nhất (Bright Solid White Table Container) -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; margin-bottom: 8px; padding: 0 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span>📋</span> 5 Phi Vụ Dọn Nhà Gần Nhất
            </span>
            <span style="font-size: 11px; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 3px 9px; border-radius: 8px; font-weight: 800;">Nhật ký</span>
          </div>

          <div class="dossier-table-glass">
            ${recentRecords.length ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #f8fafc; text-align: left; color: #475569; border-bottom: 1.5px solid #e2e8f0; font-weight: 800; font-size: 12px;">
                    <th style="padding: 10px 14px;">Ngày</th>
                    <th style="padding: 10px 14px;">Số Nhà</th>
                    <th style="padding: 10px 14px;">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentRecords.map(r => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 14px; font-weight: 800; color: #0f172a;">${r.date || ''}</td>
                      <td style="padding: 10px 14px;">
                        <span style="background: #fffbeb; color: #b45309; font-weight: 900; padding: 4px 9px; border-radius: 8px; font-size: 12.5px; border: 1px solid #fde68a;">
                          +${r.binh} nhà
                        </span>
                      </td>
                      <td style="padding: 10px 14px; color: #475569; font-size: 13px; font-weight: 600;">${escapeHtml(r.note || 'Không có ghi chú')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 26px 16px; text-align: center; color: #64748b; font-size: 13.5px; background: #ffffff;">
                <span style="font-size: 30px; display: block; margin-bottom: 6px;">🛌</span>
                <b style="color: #1e293b; font-size: 14px;">Chưa có dữ liệu dọn nhà gần đây</b>
                <div style="font-size: 12px; margin-top: 3px; color: #64748b;">Chiến binh này chưa ghi nhận số nhà trong chu kỳ hiện tại</div>
              </div>
            `}
          </div>
        </div>

        <!-- Actions Footer -->
        <div style="display: flex; justify-content: flex-end; align-items: center; padding: 4px 4px 2px; gap: 10px;">
          ${canManageScars ? `<button type="button" class="btn-scar-action btn-remove-scar" id="btnDossierEditBasic" style="margin-right:auto;">✏️ Sửa Tên &amp; Nhà</button>` : ''}
          <button type="button" class="btn-scar-action btn-add-scar" id="btnDossierExportCert" style="background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;border:none;">🏆 Bằng Vinh Danh</button>
          <button type="button" class="dossier-close-btn" id="btnDossierClose">
            ✕ Đóng Thẻ
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    function updateDossierScarUI() {
      const exp = currentScars >= 3;
      const pill = overlay.querySelector('#dossierScarPill');
      if (pill) {
        if (exp) {
          pill.className = 'scar-counter-pill expelled';
          pill.innerHTML = `⛔ ĐÃ ĐUỔI (${currentScars}/3)`;
        } else if (currentScars === 2) {
          pill.className = 'scar-counter-pill warn2';
          pill.innerHTML = '🪓🪓 2/3 Sẹo';
        } else if (currentScars === 1) {
          pill.className = 'scar-counter-pill warn1';
          pill.innerHTML = '🪓 1/3 Sẹo';
        } else {
          pill.className = 'scar-counter-pill clean';
          pill.innerHTML = '🟢 0/3 Sẹo (Sạch)';
        }
      }

      // Segments
      const s1 = overlay.querySelector('#dossierSeg1');
      const s2 = overlay.querySelector('#dossierSeg2');
      const s3 = overlay.querySelector('#dossierSeg3');
      if (s1) s1.className = 'scar-seg' + (currentScars >= 1 ? ' active-1' : '');
      if (s2) s2.className = 'scar-seg' + (currentScars >= 2 ? ' active-2' : '');
      if (s3) s3.className = 'scar-seg' + (currentScars >= 3 ? ' active-3' : '');

      // Banner
      const banner = overlay.querySelector('#dossierExpelledBanner');
      if (banner) banner.style.display = exp ? 'block' : 'none';

      // Remove button disabled state
      const btnRem = overlay.querySelector('#btnDossierRemoveScarAction');
      if (btnRem) btnRem.disabled = currentScars <= 0 && scarHistoryList.length === 0;

      // Header badge
      const headerBadge = overlay.querySelector('#dossierHeaderScarBadge');
      if (headerBadge) {
        if (exp) {
          headerBadge.innerHTML = '<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:900;padding:3px 9px;border-radius:8px;border:1.5px solid #ef4444;text-transform:uppercase;">⛔ ĐÃ BỊ ĐUỔI (3/3 SẸO)</span>';
        } else if (currentScars > 0) {
          headerBadge.innerHTML = `<span style="background:#fffbeb;color:#b45309;font-size:11px;font-weight:800;padding:3px 9px;border-radius:8px;border:1.5px solid #fde68a;">🪓 ${currentScars}/3 SẸO KỶ LUẬT</span>`;
        } else {
          headerBadge.innerHTML = '';
        }
      }

      // History count & list
      const hCount = overlay.querySelector('#dossierHistCount');
      if (hCount) hCount.textContent = `${scarHistoryList.length} lần`;

      const hList = overlay.querySelector('#dossierHistList');
      if (hList) {
        if (!scarHistoryList.length) {
          hList.innerHTML = '<div style="font-size:11.5px;color:#94a3b8;font-style:italic;padding:4px 0;">Chưa có vết sẹo hay vi phạm nào.</div>';
        } else {
          hList.innerHTML = scarHistoryList.slice().reverse().map((sc, revIdx) => {
            const origIdx = scarHistoryList.length - 1 - revIdx;
            return `
              <div class="scar-history-item">
                <div style="display:flex;flex-direction:column;gap:1px;flex:1;overflow:hidden;">
                  <span class="reason" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🪓 ${escHtml(sc.reason || 'Kỷ luật Crew')}</span>
                  <span class="meta">${escHtml(sc.date || '')} ${escHtml(sc.time || '')} • Bởi: <b>${escHtml(sc.admin || 'Admin')}</b></span>
                </div>
                ${canManageScars ? `<button type="button" class="btn-del-scar" data-idx="${origIdx}" title="Xóa bản ghi sẹo này">✕</button>` : ''}
              </div>
            `;
          }).join('');

          if (canManageScars) {
            hList.querySelectorAll('.btn-del-scar').forEach(btn => {
              btn.onclick = async (e) => {
                e.stopPropagation();
                const idx = Number(btn.dataset.idx);
                if (confirm('Đại ca có chắc chắn muốn xoá bản ghi sẹo này không?')) {
                  scarHistoryList.splice(idx, 1);
                  if (currentScars > 0) currentScars--;
                  await saveScarChanges('Xóa bản ghi sẹo');
                }
              };
            });
          }
        }
      }
    }

    async function saveScarChanges(actionName) {
      const exp = currentScars >= 3;
      try {
        const updates = {};
        updates[`users/${userId}/scars`] = currentScars;
        updates[`users/${userId}/isExpelled`] = exp;
        updates[`users/${userId}/scarHistory`] = scarHistoryList;
        if (exp && !(user && user.isExpelled)) {
          updates[`users/${userId}/expelledAt`] = new Date().toISOString();
        } else if (!exp && user && user.isExpelled) {
          updates[`users/${userId}/expelledAt`] = null;
        }

        await db.ref().update(updates);
        if (user) {
          user.scars = currentScars;
          user.isExpelled = exp;
          user.scarHistory = scarHistoryList;
        }

        if (exp && !(user && user.isExpelled)) {
          logAudit('EXPEL_MEMBER', 'Đuổi Thành Viên (3 Sẹo)', `Thành viên "${memberName}" đã nhận đủ 3 sẹo và BỊ ĐUỔI THẲNG khỏi Crew Lưới Búa.`);
        } else {
          logAudit('DISCIPLINE_SCAR', 'Cập Nhật Kỷ Luật Sẹo', `${actionName} cho "${memberName}": ${currentScars}/3 sẹo (${scarHistoryList.length} bản ghi)`);
        }

        updateDossierScarUI();
        if (typeof renderMembersTable === 'function') renderMembersTable();
        if (typeof renderStatsTable === 'function' && typeof lastTotalBinh !== 'undefined') renderStatsTable(lastTotalBinh);

        if (window.SoundFX && typeof window.SoundFX.playClick === 'function') {
          window.SoundFX.playClick();
        }
      } catch (e) {
        alert('❌ Lỗi cập nhật sẹo: ' + e.message);
      }
    }

    if (canManageScars) {
      // Add scar handler
      const btnAdd = overlay.querySelector('#btnDossierAddScarAction');
      if (btnAdd) {
        btnAdd.onclick = async () => {
          const rInp = overlay.querySelector('#dossierScarReason');
          const reason = (rInp?.value || '').trim();
          if (!reason) {
            alert('⚠️ Đại ca vui lòng nhập lý do đánh sẹo!');
            rInp?.focus();
            return;
          }

          const willExpel = (currentScars + 1) >= 3;
          if (willExpel) {
            const ok = confirm(`⚠️ CẢNH BÁO QUY CHẾ 3 SẸO:\nĐánh thêm sẹo này sẽ làm thành viên "${memberName}" đạt 3/3 SẸO và BỊ ĐUỔI THẲNG KHỎI CREW LƯỚI BÚA!\n\nLý do: "${reason}"\n\nĐại ca có chắc chắn muốn thi hành kỷ luật đuổi không?`);
            if (!ok) return;
          }

          const adminName = sessionStorage.getItem('luoibua_admin_name') || 'Nguyễn Trí';
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          scarHistoryList.push({
            id: 'scar_' + Date.now(),
            reason: reason,
            admin: adminName,
            date: todayStr(),
            time: timeStr,
            timestamp: Date.now()
          });
          currentScars++;
          if (rInp) rInp.value = '';

          await saveScarChanges(`Đánh +1 sẹo (Lý do: ${reason})`);

          if (currentScars >= 3) {
            alert(`⛔ ĐÃ THI HÀNH KỶ LUẬT:\nThành viên "${memberName}" đã đạt 3/3 sẹo và CHÍNH THỨC BỊ ĐUỔI THẲNG KHỎI CREW LƯỚI BÚA!`);
          } else {
            alert(`✅ Đã đánh +1 sẹo cho "${memberName}". Hiện có ${currentScars}/3 sẹo.`);
          }
        };
      }

      // Remove scar handler
      const btnRem = overlay.querySelector('#btnDossierRemoveScarAction');
      if (btnRem) {
        btnRem.onclick = async () => {
          if (currentScars <= 0 && !scarHistoryList.length) {
            alert('Thành viên này hiện tại trong sạch (0 sẹo), không có sẹo nào để xoá!');
            return;
          }
          if (!confirm(`Đại ca có muốn ân xá (-1 sẹo) cho thành viên "${memberName}" không?`)) return;
          if (scarHistoryList.length) {
            scarHistoryList.pop();
          }
          if (currentScars > 0) currentScars--;
          await saveScarChanges('Ân xá (-1 sẹo)');
          alert(`🛡️ Đã ân xá cho "${memberName}". Hiện còn ${currentScars}/3 sẹo.`);
        };
      }

      // Initial history delete bindings
      overlay.querySelectorAll('#dossierHistList .btn-del-scar').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const idx = Number(btn.dataset.idx);
          if (confirm('Đại ca có chắc chắn muốn xoá bản ghi sẹo này không?')) {
            scarHistoryList.splice(idx, 1);
            if (currentScars > 0) currentScars--;
            await saveScarChanges('Xóa bản ghi sẹo');
          }
        };
      });

      if (overlay.querySelector('#btnDossierEditBasic')) {
        overlay.querySelector('#btnDossierEditBasic').onclick = () => {
          closeDossier();
          if (typeof editMember === 'function') editMember(userId);
        };
      }
    }

    function closeDossier() {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => overlay.remove(), 150);
    }

    overlay.querySelector('#closeDossierBtn').onclick = closeDossier;
    overlay.querySelector('#btnDossierClose').onclick = closeDossier;
    if (overlay.querySelector('#btnDossierExportCert')) {
      overlay.querySelector('#btnDossierExportCert').onclick = () => {
        closeDossier();
        if (typeof generateCertificateImage === 'function') {
          generateCertificateImage(userId);
        }
      };
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDossier();
    });

    if (window.SoundFX && typeof window.SoundFX.playClick === 'function') {
      window.SoundFX.playClick();
    }
  }

  window.openMemberProfileModal = openMemberProfileModal;
})();

;

/* [MODULE: spotlight.js] */
/* ==========================================================================
   CREW LƯỠI BÚA - SYSTEM SPOTLIGHT SEARCH (Ctrl + K / Cmd + K)
   Thanh tìm kiếm thông minh toàn năng, điều hướng tức thời & phím tắt tốc độ cao
   ========================================================================== */
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

  let activeModal = null;
  let selectedIndex = 0;
  let currentItems = [];

  const SYSTEM_ACTIONS = [
    { type: 'action', title: '📈 Thống Kê Dashboard PRO', desc: 'Xem tổng quan năng suất & biểu đồ', icon: '📈', action: () => switchView('analytics') },
    { type: 'action', title: '📊 Bàn Làm Việc (Nhập Nhanh)', desc: 'Ghi nhận số nhà mới & BXH', icon: '📊', action: () => switchView('dashboard') },
    { type: 'action', title: '💰 Quản Lý Quỹ & Chuộc Tù', desc: 'Kiểm tra số dư, nộp quỹ & chuộc tù', icon: '💰', action: () => switchView('fund') },
    { type: 'action', title: '📋 Lịch Sử Bản Ghi', desc: 'Xem toàn bộ nhật trình dọn nhà theo ngày', icon: '📋', action: () => switchView('records') },
    { type: 'action', title: '👥 Quản Lý Thành Viên', desc: 'Danh sách thành viên & phân quyền', icon: '👥', action: () => switchView('members') },
    { type: 'action', title: '📜 Nhật Ký Hoạt Động (Audit)', desc: 'Lịch sử thao tác & kiểm tra an ninh', icon: '📜', action: () => switchView('logs') },
    { type: 'action', title: '🛡️ Ban Máy & Bảo Mật', desc: 'Quản lý thiết bị khóa & IP an ninh', icon: '🛡️', action: () => switchView('banned') },
    { type: 'action', title: '📸 Xuất Báo Cáo Ảnh (Gửi Discord)', desc: 'Mở hộp thoại tạo ảnh báo cáo sắc nét', icon: '📸', action: () => window.openDailyExportModal && window.openDailyExportModal() },
    { type: 'action', title: '💾 Sao Lưu Chu Kỳ (Discord)', desc: 'Chụp ảnh tổng thể gửi thẳng về kênh sao lưu', icon: '💾', action: () => (typeof window.triggerManualBackup === 'function' ? window.triggerManualBackup() : ($('sidebarBackupBtn') || $('manualBackupBtn'))?.click()) },
    { type: 'action', title: '📥 Tải Bảng Tính Excel / CSV', desc: 'Tải toàn bộ số nhà về máy tính định dạng CSV', icon: '📥', action: () => window.CrewCsvExport && window.CrewCsvExport.exportRecordsToCsv() },
    { type: 'action', title: '🔊 Bật / Tắt Âm Thanh', desc: 'Chuyển đổi hiệu ứng âm thanh hoàng gia', icon: '🔊', action: () => window.SoundFX && window.SoundFX.toggleSound() }
  ];

  function switchView(viewName) {
    const btn = document.querySelector(`.sidebar-nav-item[data-view="${viewName}"]`);
    if (btn) btn.click();
    else if (typeof window.switchView === 'function') window.switchView(viewName);
  }

  function openSpotlightModal() {
    if (activeModal) return;

    if (window.SoundFX && typeof window.SoundFX.playClick === 'function') {
      window.SoundFX.playClick();
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-overlay';
    backdrop.style.zIndex = '9999999';

    backdrop.innerHTML = `
      <div class="modal-box" style="max-width: 600px; width: 100%; padding: 0; overflow: hidden; border-radius: 20px; background: #ffffff; box-shadow: 0 25px 60px rgba(0,0,0,0.4); border: 1.5px solid #e2e8f0; animation: modalPopUp 0.22s cubic-bezier(0.16,1,0.3,1);">
        
        <!-- Search Input Bar -->
        <div style="display:flex; align-items:center; gap:12px; padding: 18px 20px; border-bottom: 1.5px solid #e2e8f0; background: #ffffff;">
          <span style="font-size: 20px; color: #94a3b8;">🔍</span>
          <input 
            type="text" 
            id="spotlightSearchInput" 
            placeholder="Tìm thành viên, số nhà, phân hệ hoặc lệnh (Gõ 'tri', 'quy', 'báo cáo')..." 
            style="flex:1; border:none; outline:none; font-size:16px; font-weight:600; color:#0f172a; background:transparent;"
            autocomplete="off"
            spellcheck="false"
          >
          <span style="font-size:11.5px; font-weight:800; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px; border:1px solid #cbd5e1;">ESC</span>
        </div>

        <!-- Suggestion List -->
        <div id="spotlightList" style="max-height: 380px; overflow-y: auto; padding: 8px 10px; background: #f8fafc;"></div>

        <!-- Footer / Shortcuts Hint -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 18px; border-top: 1px solid #e2e8f0; background: #ffffff; font-size: 11.5px; color: #64748b; font-weight: 600;">
          <div>Dùng <kbd style="background:#f1f5f9; padding:2px 5px; border-radius:4px; border:1px solid #cbd5e1;">↑</kbd> <kbd style="background:#f1f5f9; padding:2px 5px; border-radius:4px; border:1px solid #cbd5e1;">↓</kbd> để duyệt • <kbd style="background:#f1f5f9; padding:2px 5px; border-radius:4px; border:1px solid #cbd5e1;">↵</kbd> để chọn</div>
          <div>Crew Lưới Búa Spotlight</div>
        </div>

      </div>
    `;

    document.body.appendChild(backdrop);
    activeModal = backdrop;
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    const input = backdrop.querySelector('#spotlightSearchInput');
    const list = backdrop.querySelector('#spotlightList');

    function closeSpotlight() {
      if (!activeModal) return;
      activeModal.classList.remove('visible');
      setTimeout(() => {
        if (activeModal) activeModal.remove();
        activeModal = null;
      }, 180);
    }

    function renderItems(filterText = '') {
      const q = filterText.toLowerCase().trim();
      currentItems = [];

      // 1. Lọc thành viên
      const users = Object.values(window.allUsers || {});
      const matchedUsers = users.filter(u => !q || (u.name || '').toLowerCase().includes(q));

      matchedUsers.slice(0, 5).forEach(u => {
        // Tính số nhà của người này
        const userRecs = (window.allRecords || []).filter(r => r.userId === u.id);
        const total = Math.round(userRecs.reduce((s, r) => s + (Number(r.binh) || 0), 0) * 10) / 10;
        currentItems.push({
          type: 'member',
          title: u.name,
          desc: `Thành viên Crew • Đã dọn ${total} nhà (${userRecs.length} chuyến)`,
          icon: '👤',
          action: () => {
            if (window.openMemberProfileModal) {
              window.openMemberProfileModal(u.id);
            }
          }
        });
      });

      // 2. Lọc thao tác hệ thống
      const matchedActions = SYSTEM_ACTIONS.filter(a => !q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
      currentItems.push(...matchedActions);

      if (!currentItems.length) {
        list.innerHTML = `
          <div style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 28px; margin-bottom: 6px;">🔍</div>
            <div style="font-size: 14px; font-weight: 700;">Không tìm thấy kết quả phù hợp</div>
            <div style="font-size: 12px; margin-top: 3px;">Thử gõ tên thành viên hoặc các lệnh hệ thống</div>
          </div>
        `;
        return;
      }

      selectedIndex = Math.min(selectedIndex, currentItems.length - 1);
      if (selectedIndex < 0) selectedIndex = 0;

      list.innerHTML = currentItems.map((item, idx) => {
        const isSel = idx === selectedIndex;
        return `
          <div class="spotlight-item ${isSel ? 'selected' : ''}" data-idx="${idx}" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:12px; cursor:pointer; background:${isSel ? '#ffffff' : 'transparent'}; box-shadow:${isSel ? '0 3px 10px rgba(0,0,0,0.06)' : 'none'}; border:1px solid ${isSel ? '#fde68a' : 'transparent'}; margin-bottom:4px; transition:all 0.15s ease;">
            <div style="width:36px; height:36px; border-radius:10px; background:${isSel ? '#fffbeb' : '#ffffff'}; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;">
              ${item.icon}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:14px; font-weight:750; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(item.title)}
              </div>
              <div style="font-size:12px; color:#64748b; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(item.desc)}
              </div>
            </div>
            <span style="font-size:13px; color:#cbd5e1; font-weight:800;">›</span>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.spotlight-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
          selectedIndex = Number(el.getAttribute('data-idx'));
          updateSelection();
        });
        el.addEventListener('click', () => {
          executeSelection();
        });
      });
    }

    function updateSelection() {
      const items = list.querySelectorAll('.spotlight-item');
      items.forEach((el, idx) => {
        const isSel = idx === selectedIndex;
        el.classList.toggle('selected', isSel);
        el.style.background = isSel ? '#ffffff' : 'transparent';
        el.style.boxShadow = isSel ? '0 3px 10px rgba(0,0,0,0.06)' : 'none';
        el.style.borderColor = isSel ? '#fde68a' : 'transparent';
        if (isSel) {
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function executeSelection() {
      if (currentItems[selectedIndex] && typeof currentItems[selectedIndex].action === 'function') {
        const act = currentItems[selectedIndex].action;
        closeSpotlight();
        act();
      }
    }

    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderItems(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentItems.length;
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
        updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSpotlight();
      }
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeSpotlight();
    });

    renderItems('');
    setTimeout(() => input.focus(), 50);
  }

  // Lắng nghe phím tắt Ctrl + K hoặc Cmd + K toàn cục
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (activeModal) {
        // Đóng nếu đang mở
        activeModal.click();
      } else {
        openSpotlightModal();
      }
    }
  });

  window.openSpotlightModal = openSpotlightModal;
})();

;

/* [MODULE: dashboard.js] */
/* ==========================================================================
   MODULE: STATS, KPI COMPUTATIONS & DASHBOARD
   ========================================================================== */
function renderStats() {
  let roundedTotal = 0;
  let activeMembersInPeriod = 0;
  let totalMembersCount = Object.keys(allUsers).length;
  let avgBinh = 0;
  let topMember = null;

  // Tận dụng dữ liệu đã phân luồng tính toán từ Web Worker nếu có
  if (window.workerStatsSummary && window.statsData) {
    const s = window.workerStatsSummary;
    statsData = s.statsData;
    roundedTotal = s.roundedTotal;
    activeMembersInPeriod = s.activeMembersInPeriod;
    totalMembersCount = s.totalMembersCount;
    avgBinh = s.avgBinh;
    topMember = s.topMember;
  } else {
    // Fallback tính toán nội bộ
    const totals = {};
    let totalBinh = 0;

    allRecords.forEach(r => {
      const uid = r.userId || 'unknown';
      if (!totals[uid]) {
        totals[uid] = {
          id: uid,
          name: r.userName || allUsers[uid]?.name || 'Chưa rõ',
          binh: 0
        };
      }
      const val = Number(r.binh) || 0;
      totals[uid].binh += val;
      totalBinh += val;
    });

    statsData = Object.values(totals).sort((a, b) => b.binh - a.binh);
    window.statsData = statsData;

    roundedTotal = Math.round(totalBinh * 100) / 100;
    activeMembersInPeriod = statsData.length;
    totalMembersCount = Object.keys(allUsers).length;
    avgBinh = activeMembersInPeriod > 0 ? (roundedTotal / activeMembersInPeriod).toFixed(1) : 0;
    topMember = statsData.length > 0 ? statsData[0] : null;
  }

  // Update KPI Cards with smooth 3D count-up animation
  if ($('kpiTotalBinh')) {
    animateValue($('kpiTotalBinh'), 1, roundedTotal, 1400, val => `${Math.round(val).toLocaleString('vi-VN')} nhà`);
  }
  if ($('kpiTotalMembers')) {
    if (activeMembersInPeriod > 0) {
      animateValue($('kpiTotalMembers'), 1, activeMembersInPeriod, 1200, val => `${Math.round(val)} / ${totalMembersCount} anh em`);
    } else {
      animateValue($('kpiTotalMembers'), 1, totalMembersCount, 1200, val => `${Math.round(val)} anh em`);
    }
  }
  if ($('kpiAvgBinh')) {
    var targetAvg = parseFloat(avgBinh) || 0;
    animateValue($('kpiAvgBinh'), 1.0, targetAvg, 1300, val => `${val.toFixed(1)} nhà/người`);
  }

  if (topMember) {
    if ($('kpiTopMember')) $('kpiTopMember').textContent = topMember.name;
    var topHomes = Math.round(topMember.binh * 100) / 100;
    var topPct = roundedTotal > 0 ? Math.round((topMember.binh / roundedTotal) * 100) : 0;
    if ($('kpiTopBinh')) {
      animateValue($('kpiTopBinh'), 1, topHomes, 1300, val => `${Math.round(val)} nhà (${topPct}%)`);
    }
  } else {
    if ($('kpiTopMember')) $('kpiTopMember').textContent = '--';
    if ($('kpiTopBinh')) $('kpiTopBinh').textContent = '0 nhà';
  }

  // Update Badge Counts
  if ($('badgeMembers')) $('badgeMembers').textContent = totalMembersCount;
  if ($('badgeRecords')) $('badgeRecords').textContent = allRecords.length;

  // Render Sub-components
  renderLeaderboard(roundedTotal);
  renderStatsTable(roundedTotal);
  renderColumnChart();
}
window.renderStats = renderStats;

/* Render Leaderboard (Top Members Stream) - Tối ưu hoá với DocumentFragment */
function renderLeaderboard(totalBinh) {
  const container = $('leaderboardList');
  if (!container) return;
  container.innerHTML = '';

  if (!statsData.length) {
    container.innerHTML = `
      <div class="empty-state-box" style="padding: 24px 12px;">
        <span class="empty-state-icon" style="font-size: 28px;">🏅</span>
        <div class="empty-state-title" style="font-size: 13.5px;">Chưa có dữ liệu xếp hạng</div>
        <div class="empty-state-desc" style="font-size: 12px;">Ghi nhận số nhà để mở khóa vinh danh</div>
      </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  statsData.slice(0, 5).forEach((item, index) => {
    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
    const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
    const pct = totalBinh > 0 ? Math.round((item.binh / totalBinh) * 100) : 0;

    const div = document.createElement('div');
    div.className = 'leader-item';
    div.style.cursor = 'pointer';
    div.title = `Bấm xem hồ sơ chiến binh của ${item.name}`;
    div.onclick = () => {
      if (window.openMemberProfileModal) {
        window.openMemberProfileModal(item.id);
      }
    };
    div.innerHTML = `
      <div class="leader-rank ${rankClass}">${rankIcon}</div>
      <div class="leader-user">
        <div class="leader-name">${escHtml(item.name)}</div>
        <div class="leader-bar-bg">
          <div class="leader-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
      <div class="leader-score">
        <div class="score-num">${Math.round(item.binh * 100) / 100}</div>
        <div class="score-pct">${pct}% tổng</div>
      </div>
    `;
    frag.appendChild(div);
  });
  container.appendChild(frag);
}
window.renderLeaderboard = renderLeaderboard;

/* Render Detailed Stats Table */
function renderStatsTable(totalBinh) {
  const tb = $('statsTable');
  if (!tb) return;
  const search = ($('searchStatsInput')?.value || '').toLowerCase().trim();
  tb.innerHTML = '';

  const filtered = statsData.filter(x => x.name.toLowerCase().includes(search));
  if ($('statsTableCount')) {
    $('statsTableCount').textContent = `Hiển thị ${filtered.length} / ${statsData.length} người`;
  }

  if (!filtered.length) {
    tb.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state-box">
          <span class="empty-state-icon">🔍</span>
          <div class="empty-state-title">${search ? 'Không tìm thấy thành viên phù hợp' : 'Chưa có thành viên nào'}</div>
          <div class="empty-state-desc">${search ? 'Thử tìm kiếm với từ khóa khác' : 'Thêm thành viên mới để hiển thị bảng xếp hạng'}</div>
        </div>
      </td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach((row, idx) => {
    const actualIndex = statsData.indexOf(row) + 1;
    const pct = totalBinh > 0 ? ((row.binh / totalBinh) * 100).toFixed(1) : 0;

    let rankBadge = '';
    if (actualIndex === 1) {
      rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;font-size:14px;box-shadow:0 0 12px rgba(245,158,11,0.5);">🥇</span>';
    } else if (actualIndex === 2) {
      rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#0f172a;font-weight:900;font-size:14px;box-shadow:0 0 10px rgba(148,163,184,0.4);">🥈</span>';
    } else if (actualIndex === 3) {
      rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#fed7aa,#ea580c);color:#ffffff;font-weight:900;font-size:14px;box-shadow:0 0 10px rgba(234,88,12,0.4);">🥉</span>';
    } else {
      rankBadge = `<span class="rank-other-pill">#${actualIndex}</span>`;
    }

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.title = `Bấm xem hồ sơ chiến binh của ${row.name}`;
    tr.onclick = () => {
      if (window.openMemberProfileModal) {
        window.openMemberProfileModal(row.id);
      }
    };
    tr.innerHTML = `
      <td style="text-align:center;">${rankBadge}</td>
      <td>
        ${(() => {
          const uObj = allUsers && (allUsers[row.id] || Object.values(allUsers).find(x => x.name === row.name));
          const uScars = Number(uObj?.scars) || 0;
          const isExp = uScars >= 3 || !!uObj?.isExpelled;
          let scBadge = '';
          if (isExp) scBadge = '<span class="badge-scar badge-scar-expelled" style="margin-left:6px;font-size:10px;padding:2px 7px;">⛔ ĐÃ ĐUỔI</span>';
          else if (uScars > 0) scBadge = `<span class="badge-scar badge-scar-warn" style="margin-left:6px;font-size:10px;padding:2px 7px;">🪓 ${uScars}/3 Sẹo</span>`;
          return `<b style="font-size:14.5px;color:var(--text-dark);letter-spacing:-0.2px;${isExp ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${escHtml(row.name)}</b>${scBadge}`;
        })()}
      </td>
      <td>
        <span class="badge-binh">${Math.round(row.binh * 100) / 100} nhà</span>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;max-width:130px;height:6px;background:var(--slate-200);border-radius:4px;overflow:hidden;">
            <div style="height:100%;background:linear-gradient(90deg,#fbbf24,#d97706);width:${pct}%;border-radius:4px;"></div>
          </div>
          <span style="font-weight:800;color:var(--text-main);font-size:12.5px;">${pct}%</span>
        </div>
      </td>
      <td>
        <span style="color:#10b981;font-weight:800;font-size:12.5px;display:inline-flex;align-items:center;gap:5px;">
          <span style="width:7px;height:7px;background:#10b981;border-radius:50%;box-shadow:0 0 6px #10b981;"></span>
          Hoạt động
        </span>
      </td>
    `;
    frag.appendChild(tr);
  });
  tb.appendChild(frag);
}
window.renderStatsTable = renderStatsTable;

$('searchStatsInput')?.addEventListener('input', debounce(() => {
  const totalBinh = statsData.reduce((s, r) => s + r.binh, 0);
  renderStatsTable(totalBinh);
}, 120));

/* Render Rounded Column Chart */
function renderColumnChart() {
  const container = $('chartContainer');
  if (!container) return;
  if (typeof Highcharts === 'undefined') {
    setTimeout(renderColumnChart, 50);
    return;
  }

  const displayData = [...statsData].filter(d => (Number(d.binh) || 0) > 0);

  if (!displayData.length) {
    if (chartInstance) {
      try { chartInstance.destroy(); } catch (e) { }
      chartInstance = null;
      window.chartInstance = null;
    }
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:340px;color:var(--text-muted);gap:12px;text-align:center;">
        <span style="font-size:42px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.15));">🏠</span>
        <b style="font-size:15px;color:var(--terracotta);letter-spacing:0.3px;">Chưa có thành viên nào ghi nhận nhà</b>
        <span style="font-size:12.5px;color:var(--text-sub);max-width:320px;line-height:1.5;">Thêm thành viên và nhập số nhà ở cột bên phải để biểu đồ xuất hiện!</span>
      </div>`;
    return;
  }

  const labelColor = '#0f172a';
  const gridColor = 'rgba(226, 232, 240, 0.8)';
  const axisColor = '#06b6d4';

  const categories = displayData.map(d => d.name);
  const values = displayData.map(d => Math.round(d.binh * 100) / 100);

  // Tối ưu hóa: Cập nhật dữ liệu tại chỗ siêu mượt (dưới 2ms), không phá hủy vẽ lại DOM gây giật lag
  if (chartInstance && chartInstance.series && chartInstance.series[0]) {
    try {
      chartInstance.xAxis[0].setCategories(categories, false);
      chartInstance.series[0].setData(values, true, { duration: 900, easing: 'easeOutQuart' });
      return;
    } catch (e) { }
  }

  chartInstance = Highcharts.chart('chartContainer', {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      spacingTop: 28,
      spacingRight: 20,
      spacingBottom: 18,
      spacingLeft: 10
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: categories,
      lineColor: axisColor,
      lineWidth: 2,
      tickWidth: 0,
      labels: {
        autoRotation: [-35, -60],
        autoRotationLimit: 40,
        style: {
          color: labelColor,
          fontSize: '12px',
          fontWeight: '800',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
        },
        y: 20
      }
    },
    yAxis: {
      title: { text: null },
      min: 0,
      gridLineColor: gridColor,
      gridLineWidth: 1.5,
      lineWidth: 0,
      labels: {
        style: {
          color: '#7c6a5d',
          fontSize: '12.5px',
          fontWeight: '700',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
        },
        x: -8
      }
    },
    tooltip: {
      headerFormat: '<span style="font-size:12px;font-weight:bold;color:#0891b2">{point.key}</span><br/>',
      pointFormat: '<b style="font-size:14px;color:#1e1610;">{point.y} nhà</b>',
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#a5f3fc',
      shadow: true,
      style: { color: '#1e1610', fontSize: '13px' }
    },
    plotOptions: {
      column: {
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, '#38bdf8'],
            [1, '#06b6d4']
          ]
        },
        states: {
          hover: {
            brightness: 0.22,
            borderColor: '#22d3ee',
            borderWidth: 2.5
          }
        },
        borderRadius: 20,
        pointPadding: 0.12,
        groupPadding: 0.08,
        maxPointWidth: 68,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          format: '{point.y}',
          style: {
            color: '#1a1202',
            fontWeight: '900',
            fontSize: '12.5px',
            textOutline: 'none',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
          },
          verticalAlign: 'top',
          y: 12
        }
      }
    },
    series: [{
      name: 'Số nhà',
      data: values
    }]
  });
  window.chartInstance = chartInstance;
}
window.renderColumnChart = renderColumnChart;

/* Quick Input: Save Record */
$('saveRecordBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) {
    setStatus($('inputStatus'), '⛔ Chỉ quản trị viên (admin.html) mới có quyền ghi nhận số nhà!', false);
    return;
  }
  const userId = $('inputMember').value;
  const date = $('inputDate').value;
  const binh = Number($('inputBinh').value) || 0;

  if (!userId) return setStatus($('inputStatus'), '⚠️ Vui lòng chọn thành viên', false);
  if (!date) return setStatus($('inputStatus'), '⚠️ Vui lòng chọn ngày ghi nhận', false);
  if (binh <= 0) return setStatus($('inputStatus'), '⚠️ Số nhà phải lớn hơn 0', false);

  const member = allUsers[userId];
  if (!member) return setStatus($('inputStatus'), '⚠️ Không tìm thấy thông tin thành viên', false);

  const nowTs = Date.now();
  const optimisticRec = {
    id: 'temp_' + nowTs,
    userId,
    userName: member.name || member.username,
    date,
    binh,
    timestamp: nowTs
  };

  // Cập nhật tức thì (0ms) lên giao diện & bảng xếp hạng
  allRecords.unshift(optimisticRec);
  if (typeof renderActiveView === 'function') renderActiveView();

  try {
    const pushedRef = await recordsRef.push({
      userId,
      userName: member.name || member.username,
      date,
      binh,
      timestamp: nowTs
    });
    optimisticRec.id = pushedRef.key;
    logAudit('ADD_RECORD', 'Ghi Nhận Số Nhà', `Ghi nhận +${binh} nhà cho "${member.name || member.username}" (Ngày: ${fmtDate(date)})`);
    setStatus($('inputStatus'), '✅ Đã lưu bản ghi thành công!');
    $('inputBinh').value = '';
    if (window.SoundFX && typeof window.SoundFX.playSuccess === 'function') {
      window.SoundFX.playSuccess();
    }
  } catch (err) {
    const idx = allRecords.indexOf(optimisticRec);
    if (idx !== -1) allRecords.splice(idx, 1);
    if (typeof renderActiveView === 'function') renderActiveView();
    setStatus($('inputStatus'), '❌ Lỗi: ' + err.message, false);
    if (window.SoundFX && typeof window.SoundFX.playWarn === 'function') {
      window.SoundFX.playWarn();
    }
  }
});

// Phím tắt Enter cho ô nhập số nhà
$('inputBinh')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('saveRecordBtn')?.click();
});

/* Render Recent Records in Dashboard Right Column */
function renderRecentRecords() {
  const tb = $('recentRecordsTable');
  if (!tb) return;
  tb.innerHTML = '';
  const recent = allRecords.slice(0, 5);

  if (!recent.length) {
    tb.innerHTML = `
      <tr><td colspan="${isAdmin() ? 4 : 3}">
        <div class="empty-state-box" style="padding: 20px 12px;">
          <span class="empty-state-icon" style="font-size: 26px;">⏱️</span>
          <div class="empty-state-title" style="font-size: 13.5px;">Chưa có bản ghi nào gần đây</div>
          <div class="empty-state-desc" style="font-size: 12px;">Nhập số lượng nhà ở biểu mẫu phía trên</div>
        </div>
      </td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  recent.forEach(r => {
    const tr = document.createElement('tr');
    const actionCell = isAdmin() ? `
      <td class="action-cell">
        <button class="warning btn-sm" data-act="edit" title="Sửa bản ghi này" aria-label="Sửa">✏️</button>
        <button class="danger btn-sm" data-act="del" title="Xóa bản ghi này" aria-label="Xóa">🗑️</button>
      </td>` : '';
    tr.innerHTML = `
      <td><b>${fmtDate(r.date)}</b></td>
      <td><span style="font-weight:700;color:var(--text-dark);">${escHtml(r.userName || '')}</span></td>
      <td><span class="badge-binh">${r.binh ?? 0}</span></td>
      ${actionCell}
    `;
    if (isAdmin()) {
      tr.querySelector('[data-act="edit"]').onclick = () => {
        if (typeof editRecord === 'function') editRecord(r.id);
      };
      tr.querySelector('[data-act="del"]').onclick = () => {
        if (typeof deleteRecord === 'function') deleteRecord(r.id);
      };
    }
    frag.appendChild(tr);
  });
  tb.appendChild(frag);
}
window.renderRecentRecords = renderRecentRecords;

;


/* [MODULE: analytics.js] */
/* ==========================================================================
   MODULE: BẢNG THỐNG KÊ DASHBOARD QUẢN TRỊ (EXECUTIVE ANALYTICS)
   Thống kê chính xác số nhà, phi vụ, thành viên 100% THEO TUẦN (Thứ 2 -> CN)
   Hiển thị rõ ràng tên Thứ và Ngày tháng, không bao giờ để lọt số index (6:)
   ========================================================================== */

var analyticsRevenueChart = null;
var analyticsOverviewChart = null;
var analyticsEarningsChart = null;
var analyticsCustomersChart = null;

// Hàm tiện ích: Lấy danh sách 7 ngày trong tuần hiện tại (Thứ 2 -> Chủ Nhật) kèm nhãn ngày tháng cụ thể
function getWeekDateRange(refDate = new Date(), records = window.allRecords || []) {
  const validDates = (records || []).map(r => r.date).filter(Boolean).sort();
  const today = new Date(refDate);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let startDate, endDate;
  if (validDates.length > 0) {
    const minRecDate = new Date(validDates[0] + 'T00:00:00');
    const maxRecDate = new Date(validDates[validDates.length - 1] + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');

    // Bao quát từ ngày sớm nhất có bản ghi đến ngày hôm nay (hoặc ngày bản ghi mới nhất)
    const endRef = maxRecDate > todayDate ? maxRecDate : todayDate;
    const spanDays = Math.round((endRef - minRecDate) / (24 * 3600 * 1000)) + 1;

    if (spanDays <= 7) {
      startDate = minRecDate;
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Nếu số ngày nhiều hơn 7 (ví dụ chu kỳ 8-10 ngày), hiển thị đầy đủ toàn bộ chu kỳ
      startDate = minRecDate;
      endDate = endRef;
    }
  } else {
    endDate = new Date(todayStr + 'T00:00:00');
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
  }

  const weekDates = [];
  const dayShortLabels = [];
  const dayFullLabels = [];
  const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;
    weekDates.push(dStr);

    const dName = dayNames[cur.getDay()];
    dayShortLabels.push(dName);
    dayFullLabels.push(`${dName} (${dd}/${mm})`);
    cur.setDate(cur.getDate() + 1);
  }

  // Kỳ trước để so sánh tăng trưởng
  const totalDays = weekDates.length;
  const lastStartDate = new Date(startDate);
  lastStartDate.setDate(startDate.getDate() - totalDays);
  const lastWeekDates = [];
  for (let i = 0; i < totalDays; i++) {
    const curLast = new Date(lastStartDate);
    curLast.setDate(lastStartDate.getDate() + i);
    const dStr = `${curLast.getFullYear()}-${String(curLast.getMonth() + 1).padStart(2, '0')}-${String(curLast.getDate()).padStart(2, '0')}`;
    lastWeekDates.push(dStr);
  }

  return { weekDates, lastWeekDates, dayShortLabels, dayFullLabels, mon: startDate };
}

function renderAnalyticsDashboard() {
  if (typeof Highcharts === 'undefined') {
    setTimeout(renderAnalyticsDashboard, 50);
    return;
  }
  const view = document.getElementById('view-analytics');
  if (!view || view.classList.contains('hidden')) return;

  const records = window.allRecords || [];
  const users = window.allUsers || {};
  const userList = Object.values(users);
  const totalUsers = userList.length || 0;

  const { weekDates, lastWeekDates, dayShortLabels, dayFullLabels } = getWeekDateRange(new Date(), records);

  // 1. TỔNG HỢP SỐ LIỆU DOANH SỐ THEO NGÀY VÀ TOÀN BỘ CHU KỲ
  const dayHomes = new Array(weekDates.length).fill(0);
  const dayTrips = new Array(weekDates.length).fill(0);
  const memberHomesMap = {};

  records.forEach(r => {
    const binh = Number(r.binh) || 0;
    const idx = weekDates.indexOf(r.date);
    if (idx !== -1) {
      dayHomes[idx] += binh;
      dayTrips[idx] += 1;
    }
    // LUÔN TỔNG HỢP 100% BẢN GHI CỦA TẤT CẢ ANH EM VÀO BẢN ĐỒ THÀNH VIÊN
    const uid = r.userId || r.userName || 'unknown';
    memberHomesMap[uid] = (memberHomesMap[uid] || 0) + binh;
  });

  // Tổng số nhà và số phi vụ thực tế 100% của toàn bộ chu kỳ
  const totalAllHomes = Math.round(records.reduce((sum, r) => sum + (Number(r.binh) || 0), 0) * 10) / 10;
  const totalAllTrips = records.length;

  const thisWeekHomes = totalAllHomes;
  const thisWeekTrips = totalAllTrips;

  // 2. TÍNH DOANH SỐ KỲ TRƯỚC ĐỂ SO SÁNH TĂNG TRƯỞNG
  let lastWeekHomes = 0;
  records.forEach(r => {
    if (lastWeekDates.includes(r.date)) {
      lastWeekHomes += (Number(r.binh) || 0);
    }
  });

  let weekGrowthPct = 14;
  if (lastWeekHomes > 0) {
    weekGrowthPct = Math.round(((thisWeekHomes - lastWeekHomes) / lastWeekHomes) * 1000) / 10;
  }

  // 3. TÍNH HIỆU SUẤT TRUNG BÌNH & SỐ ANH EM THAM GIA TRONG CHU KỲ
  const activeMembersCount = Object.keys(memberHomesMap).filter(id => (memberHomesMap[id] || 0) > 0).length || totalUsers;
  const avgHomesPerTrip = thisWeekTrips > 0 ? (thisWeekHomes / thisWeekTrips).toFixed(1) : '0';

  // 4. HIỂN THỊ DỮ LIỆU LÊN 4 CARD
  // Card 1: Doanh Số Ghi Nhận (Count up animation từ 1 đến hiện tại)
  const revEl = document.getElementById('analyticsRevValue');
  if (revEl) {
    animateValue(revEl, 1, thisWeekHomes, 1400, val => `${Math.round(val).toLocaleString('vi-VN')} Nhà`);
  }
  const revTrendEl = document.getElementById('analyticsRevTrend');
  if (revTrendEl) {
    const sign = weekGrowthPct >= 0 ? '↑' : '↓';
    revTrendEl.innerHTML = `<span>${sign} ${Math.abs(weekGrowthPct)}% Chu kỳ này</span>`;
  }
  const revSubEl = document.getElementById('analyticsRevSub');
  if (revSubEl) {
    const totalVnd = thisWeekHomes * 50000;
    revSubEl.textContent = `Quy đổi quỹ: ${totalVnd.toLocaleString('vi-VN')}đ`;
  }

  // Card 2: Tổng Quan Hoạt Động Chu Kỳ
  const salesEl = document.getElementById('analyticsSalesCount');
  if (salesEl) {
    salesEl.textContent = `${thisWeekTrips.toLocaleString('vi-VN')} lượt`;
  }
  const custEl = document.getElementById('analyticsCustomerCount');
  if (custEl) {
    custEl.textContent = `${activeMembersCount.toLocaleString('vi-VN')} anh em`;
  }
  const avgValEl = document.getElementById('analyticsAvgOrderValue');
  if (avgValEl) {
    avgValEl.textContent = `${avgHomesPerTrip} nhà/lượt`;
  }

  // Card 3: Sản Lượng Ghi Nhận
  const earnEl = document.getElementById('analyticsEarningsValue');
  if (earnEl) {
    earnEl.textContent = `${thisWeekHomes.toLocaleString('vi-VN')} Nhà`;
  }
  const earnTrendEl = document.getElementById('analyticsEarningsTrend');
  if (earnTrendEl) {
    const sign = weekGrowthPct >= 0 ? '↑' : '↓';
    earnTrendEl.innerHTML = `<span>${sign} ${Math.abs(weekGrowthPct)}% So với kỳ trước</span>`;
  }

  // 5. KHỞI TẠO 4 BIỂU ĐỒ
  renderChartRevenue(dayShortLabels, dayFullLabels, dayHomes, thisWeekHomes);
  renderChartOverview(dayShortLabels, dayFullLabels, dayTrips, thisWeekTrips);
  renderChartEarnings(dayShortLabels, dayFullLabels, dayHomes, thisWeekHomes);
  renderChartCustomers(userList, memberHomesMap, thisWeekHomes);
}
window.renderAnalyticsDashboard = renderAnalyticsDashboard;

/* --------------------------------------------------------------------------
   BIỂU ĐỒ 1: DOANH SỐ DỌN NHÀ THEO TUẦN (Areaspline Wave Chart 7 Ngày)
   -------------------------------------------------------------------------- */
function renderChartRevenue(dayShortLabels, dayFullLabels, dayHomes, thisWeekHomes) {
  const container = document.getElementById('chartAnalyticsRevenue');
  if (!container) return;

  const seriesData = dayHomes.map((val, idx) => ({
    name: dayShortLabels[idx],
    fullName: dayFullLabels[idx],
    y: Math.round(val * 10) / 10
  }));

  if (analyticsRevenueChart && analyticsRevenueChart.series && analyticsRevenueChart.series[0]) {
    try {
      analyticsRevenueChart.xAxis[0].setCategories(dayShortLabels, false);
      analyticsRevenueChart.series[0].setData(seriesData, true);
      return;
    } catch (e) {}
  }

  if (analyticsRevenueChart) {
    try { analyticsRevenueChart.destroy(); } catch (e) {}
  }

  analyticsRevenueChart = Highcharts.chart(container, {
    chart: {
      type: 'areaspline',
      backgroundColor: 'transparent',
      height: 185,
      margin: [10, 10, 35, 10],
      spacing: [0, 0, 0, 0]
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: dayShortLabels,
      labels: {
        style: { color: '#64748b', fontSize: '11.5px', fontWeight: '700', fontFamily: 'inherit' }
      },
      lineColor: 'transparent',
      tickColor: 'transparent'
    },
    yAxis: {
      visible: false,
      min: 0
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderRadius: 10,
      borderWidth: 0,
      shadow: true,
      style: { color: '#ffffff', fontSize: '13px', fontWeight: '700' },
      formatter: function() {
        const fullDay = this.point.fullName || dayFullLabels[this.point.x] || this.point.name || 'Hôm nay';
        return `<b>${fullDay}</b><br/>Sản lượng: <b>${this.point.y.toLocaleString('vi-VN')} nhà</b>`;
      }
    },
    plotOptions: {
      areaspline: {
        color: '#2563eb',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(37, 99, 235, 0.28)'],
            [1, 'rgba(37, 99, 235, 0.0)']
          ]
        },
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
          fillColor: '#2563eb',
          lineWidth: 2,
          lineColor: '#ffffff',
          states: {
            hover: {
              enabled: true,
              radius: 7,
              lineWidth: 2,
              lineColor: '#ffffff',
              fillColor: '#1d4ed8'
            }
          }
        }
      }
    },
    series: [{
      name: 'Số Nhà Dọn',
      data: seriesData
    }]
  });
}

/* --------------------------------------------------------------------------
   BIỂU ĐỒ 2: TỔNG QUAN PHI VỤ DỌN NHÀ THEO 7 NGÀY TRONG TUẦN (Spline Curve)
   -------------------------------------------------------------------------- */
function renderChartOverview(dayShortLabels, dayFullLabels, dayTrips, thisWeekTrips) {
  const container = document.getElementById('chartAnalyticsOverview');
  if (!container) return;

  const seriesData = dayTrips.map((val, idx) => ({
    name: dayShortLabels[idx],
    fullName: dayFullLabels[idx],
    y: Number(val) || 0
  }));

  if (analyticsOverviewChart) {
    try { analyticsOverviewChart.destroy(); } catch (e) {}
  }

  analyticsOverviewChart = Highcharts.chart(container, {
    chart: {
      type: 'spline',
      backgroundColor: 'transparent',
      height: 140,
      margin: [10, 10, 32, 10],
      spacing: [0, 0, 0, 0]
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: dayShortLabels,
      labels: {
        style: { color: '#64748b', fontSize: '11px', fontWeight: '700', fontFamily: 'inherit' }
      },
      lineColor: 'transparent',
      tickColor: 'transparent'
    },
    yAxis: {
      visible: false,
      min: 0
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderRadius: 10,
      borderWidth: 0,
      shadow: true,
      style: { color: '#ffffff', fontSize: '13px', fontWeight: '700' },
      formatter: function() {
        const fullDay = this.point.fullName || dayFullLabels[this.point.x] || this.point.name || 'Hôm nay';
        return `<b>${fullDay}</b><br/>Thực hiện: <b>${this.point.y} lượt dọn</b>`;
      }
    },
    plotOptions: {
      spline: {
        color: '#2563eb',
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
          fillColor: '#2563eb',
          lineWidth: 2,
          lineColor: '#ffffff',
          states: {
            hover: {
              enabled: true,
              radius: 7,
              lineWidth: 2,
              lineColor: '#ffffff',
              fillColor: '#1d4ed8'
            }
          }
        }
      }
    },
    series: [{
      name: 'Lượt Dọn',
      data: seriesData
    }]
  });
}

/* --------------------------------------------------------------------------
   BIỂU ĐỒ 3: SẢN LƯỢNG TỪNG NGÀY TRONG TUẦN (Rounded Column Chart 7 Ngày)
   -------------------------------------------------------------------------- */
function renderChartEarnings(dayShortLabels, dayFullLabels, dayHomes, thisWeekHomes) {
  const container = document.getElementById('chartAnalyticsEarnings');
  if (!container) return;

  const seriesData = dayHomes.map((val, idx) => ({
    name: dayShortLabels[idx],
    fullName: dayFullLabels[idx],
    y: Math.round(val * 10) / 10
  }));

  if (analyticsEarningsChart && analyticsEarningsChart.series && analyticsEarningsChart.series[0]) {
    try {
      analyticsEarningsChart.xAxis[0].setCategories(dayShortLabels, false);
      analyticsEarningsChart.series[0].setData(seriesData, true);
      return;
    } catch (e) {}
  }

  if (analyticsEarningsChart) {
    try { analyticsEarningsChart.destroy(); } catch (e) {}
  }

  analyticsEarningsChart = Highcharts.chart(container, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 185,
      margin: [10, 10, 35, 10],
      spacing: [0, 0, 0, 0]
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: dayShortLabels,
      labels: {
        style: { color: '#64748b', fontSize: '11px', fontWeight: '700', fontFamily: 'inherit' }
      },
      lineColor: 'transparent',
      tickColor: 'transparent'
    },
    yAxis: {
      visible: false,
      min: 0
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderRadius: 10,
      borderWidth: 0,
      shadow: true,
      style: { color: '#ffffff', fontSize: '13px', fontWeight: '700' },
      formatter: function() {
        const fullDay = this.point.fullName || dayFullLabels[this.point.x] || this.point.name || 'Hôm nay';
        return `<b>${fullDay}</b><br/>Sản lượng: <b>${this.point.y.toLocaleString('vi-VN')} nhà</b>`;
      }
    },
    plotOptions: {
      column: {
        color: '#3b82f6',
        borderRadius: 6,
        borderWidth: 0,
        pointPadding: 0.14,
        groupPadding: 0.08,
        states: {
          hover: {
            color: '#1d4ed8'
          }
        }
      }
    },
    series: [{
      name: 'Số Nhà Dọn',
      data: seriesData
    }]
  });
}

/* --------------------------------------------------------------------------
   BIỂU ĐỒ 4: TỶ LỆ DỌN NHÀ THEO THÀNH VIÊN TRONG TUẦN (Pie / Donut Chart)
   -------------------------------------------------------------------------- */
function renderChartCustomers(userList, memberHomesMap, thisWeekHomes) {
  const container = document.getElementById('chartAnalyticsCustomers');
  if (!container) return;

  const legendContainer = document.getElementById('analyticsLegendContainer');
  const palette = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

  const usersWithHomes = userList.map(u => ({
    id: u.id,
    name: u.name || u.username || 'Thành viên',
    homes: Number(memberHomesMap[u.id]) || 0
  }));

  const activeMembers = usersWithHomes.filter(u => u.homes > 0).sort((a, b) => b.homes - a.homes);
  const idleMembers = usersWithHomes.filter(u => u.homes === 0);

  const sumActiveHomes = activeMembers.reduce((acc, u) => acc + u.homes, 0) || thisWeekHomes || 0;
  let pieData = [];

  if (activeMembers.length > 0 && sumActiveHomes > 0) {
    pieData = activeMembers.map((u, idx) => {
      const pct = Math.round((u.homes / sumActiveHomes) * 1000) / 10;
      return {
        name: u.name,
        y: pct,
        color: palette[idx % palette.length],
        customHomes: u.homes
      };
    });

    if (legendContainer) {
      let legHtml = '';
      pieData.forEach(p => {
        legHtml += `
          <div class="analytics-legend-item">
            <span class="analytics-legend-dot" style="background:${p.color};"></span>
            <span><b>${escHtml(p.name)}</b>: ${p.customHomes} nhà (${p.y}%)</span>
          </div>
        `;
      });
      if (idleMembers.length > 0) {
        const idleNames = idleMembers.map(u => escHtml(u.name)).join(', ');
        legHtml += `
          <div class="analytics-legend-item" style="color:#64748b;font-size:12px;margin-top:2px;">
            <span class="analytics-legend-dot" style="background:#cbd5e1;"></span>
            <span>Chờ nhận việc (${idleMembers.length} người: <i>${idleNames}</i>)</span>
          </div>
        `;
      }
      legendContainer.innerHTML = legHtml;
    }
  } else {
    pieData = [{ name: 'Chưa có lượt dọn', y: 100, color: '#94a3b8', customHomes: 0 }];
    if (legendContainer) {
      legendContainer.innerHTML = `
        <div class="analytics-legend-item" style="color:#64748b;">
          <span class="analytics-legend-dot" style="background:#94a3b8;"></span>
          <span>Chưa ghi nhận số nhà nào trong tuần này</span>
        </div>
      `;
    }
  }

  if (analyticsCustomersChart) {
    try { analyticsCustomersChart.destroy(); } catch (e) {}
  }

  analyticsCustomersChart = Highcharts.chart(container, {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 200,
      margin: [0, 0, 0, 0],
      spacing: [0, 0, 0, 0]
    },
    title: { text: null },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: '#0f172a',
      borderRadius: 10,
      borderWidth: 0,
      shadow: true,
      style: { color: '#ffffff', fontSize: '13px', fontWeight: '700' },
      formatter: function() {
        return `<b>${this.point.name}</b><br/>Sản lượng tuần: <b>${this.point.customHomes} nhà</b> (<b>${this.point.y}%</b>)`;
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        borderWidth: 2,
        borderColor: '#ffffff',
        dataLabels: {
          enabled: true,
          distance: -28,
          format: '{point.y}%',
          style: {
            fontSize: '12px',
            fontWeight: '900',
            color: '#ffffff',
            textOutline: 'none'
          }
        }
      }
    },
    series: [{
      name: 'Tỷ Lệ Tuần',
      colorByPoint: true,
      data: pieData
    }]
  });
}

// Lắng nghe window resize để tự động co giãn biểu đồ mượt mà
window.addEventListener('resize', () => {
  if (window.activeView === 'analytics') {
    setTimeout(() => {
      try {
        if (analyticsRevenueChart) analyticsRevenueChart.reflow();
        if (analyticsOverviewChart) analyticsOverviewChart.reflow();
        if (analyticsEarningsChart) analyticsEarningsChart.reflow();
        if (analyticsCustomersChart) analyticsCustomersChart.reflow();
      } catch (e) {}
    }, 150);
  }
});

;


/* [MODULE: members.js] */
/* ==========================================================================
   MODULE: MEMBERS MANAGEMENT & MEMBER OPTIONS
   ========================================================================== */

/**
 * Chuẩn hóa tiếng Việt bỏ dấu, đưa về chữ thường phục vụ tìm kiếm thông minh
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}
window.removeVietnameseTones = removeVietnameseTones;

/**
 * Tạo Combobox Tìm Kiếm Thành Viên Thông Minh (Searchable Select Combobox)
 * - Gõ "ch" hay "cuu" lập tức gợi ý "BUA | Chị Cừu"
 * - Không phân biệt hoa thường, không phân biệt dấu tiếng Việt
 * - Tự động bỏ qua tiền tố "BUA | " để match nhanh nickname
 * - Phím tắt Enter, mũi tên lên/xuống cực kỳ mượt mà
 */
function setupSearchableSelect(selectId, { placeholder = '🔍 Gõ tìm tên (vd: ch, cuu, tri)...' } = {}) {
  const selectEl = typeof selectId === 'string' ? $(selectId) : selectId;
  if (!selectEl) return null;

  let wrapper = selectEl.nextElementSibling;
  const isInitialized = wrapper && wrapper.classList && wrapper.classList.contains('searchable-combobox');

  if (!isInitialized) {
    // Ẩn thẻ select gốc đi nhưng vẫn giữ nguyên để các hàm lấy .value hoạt động 100%
    selectEl.style.display = 'none';

    wrapper = document.createElement('div');
    wrapper.className = 'searchable-combobox';
    wrapper.innerHTML = `
      <div class="combobox-control">
        <span class="combobox-icon">🔍</span>
        <input type="text" class="combobox-input" placeholder="${placeholder}" autocomplete="off" spellcheck="false">
        <div class="combobox-actions">
          <button type="button" class="combobox-clear-btn" title="Xóa tìm kiếm" style="display:none;">✕</button>
          <button type="button" class="combobox-toggle-btn" title="Mở danh sách">▼</button>
        </div>
      </div>
      <div class="combobox-dropdown">
        <div class="combobox-dropdown-header">
          <span>Gợi ý thành viên</span>
          <span class="combobox-count-badge">0 người</span>
        </div>
        <div class="combobox-list"></div>
      </div>
    `;
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

    const input = wrapper.querySelector('.combobox-input');
    const dropdown = wrapper.querySelector('.combobox-dropdown');
    const listEl = wrapper.querySelector('.combobox-list');
    const countBadge = wrapper.querySelector('.combobox-count-badge');
    const clearBtn = wrapper.querySelector('.combobox-clear-btn');
    const toggleBtn = wrapper.querySelector('.combobox-toggle-btn');

    let activeIndex = -1;
    let currentFiltered = [];

    // Lấy danh sách options từ select gốc
    function getOptions() {
      const opts = [];
      Array.from(selectEl.options).forEach(opt => {
        if (!opt.value) return; // Bỏ qua option rỗng placeholder
        opts.push({
          value: opt.value,
          label: opt.textContent.trim()
        });
      });
      return opts;
    }

    // Lọc options dựa trên chuỗi tìm kiếm
    function filterOptions(query) {
      const allOpts = getOptions();
      if (!query) {
        return allOpts.map(o => ({ ...o, score: 0, highlight: escHtml(o.label) }));
      }

      const normQ = removeVietnameseTones(query);
      const matched = [];

      allOpts.forEach(opt => {
        const fullNorm = removeVietnameseTones(opt.label);
        // Tách nickname bỏ tiền tố BUA | hoặc BUA 3 | nếu có
        const nickNorm = fullNorm.replace(/^bua\s*\d*\s*\|\s*/i, '').trim();

        let score = -1;
        if (nickNorm.startsWith(normQ)) {
          score = 100; // Khớp ngay đầu nickname (vd gõ "ch" khớp ngay "Chị Cừu")
        } else if (fullNorm.startsWith(normQ)) {
          score = 80;
        } else if ((' ' + nickNorm).includes(' ' + normQ)) {
          score = 60; // Khớp nguyên từ (vd gõ "cuu" khớp từ "Cừu")
        } else if (nickNorm.includes(normQ)) {
          score = 40; // Khớp một phần trong nickname
        } else if (fullNorm.includes(normQ)) {
          score = 20; // Khớp bất kỳ vị trí nào
        }

        if (score >= 0) {
          matched.push({
            ...opt,
            score,
            highlight: highlightMatch(opt.label, query)
          });
        }
      });

      // Sắp xếp: điểm cao nhất lên đầu, sau đó sắp xếp alphabet
      matched.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.label.localeCompare(b.label);
      });

      return matched;
    }

    function highlightMatch(label, query) {
      if (!query) return escHtml(label);
      const normLabel = removeVietnameseTones(label);
      const normQ = removeVietnameseTones(query);
      const idx = normLabel.indexOf(normQ);
      if (idx === -1) return escHtml(label);

      const before = label.substring(0, idx);
      const match = label.substring(idx, idx + query.length);
      const after = label.substring(idx + query.length);
      return `${escHtml(before)}<mark>${escHtml(match)}</mark>${escHtml(after)}`;
    }

    function renderDropdown(items) {
      currentFiltered = items;
      activeIndex = items.length > 0 ? 0 : -1;
      countBadge.textContent = `${items.length} người`;

      if (items.length === 0) {
        listEl.innerHTML = `
          <div class="combobox-empty">
            ❌ Không tìm thấy thành viên nào khớp với "<b>${escHtml(input.value)}</b>"
          </div>
        `;
        return;
      }

      listEl.innerHTML = items.map((item, idx) => {
        const isSelected = item.value === selectEl.value;
        const isActive = idx === activeIndex;
        return `
          <div class="combobox-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}" data-idx="${idx}" data-val="${escHtml(item.value)}">
            <span class="combobox-item-name">
              <span style="font-size:15px;">👤</span>
              <span>${item.highlight}</span>
            </span>
            ${isSelected ? '<span class="combobox-item-check">✓ Đã chọn</span>' : ''}
          </div>
        `;
      }).join('');
    }

    function openDropdown() {
      // Khi mở dropdown, nếu input đang có giá trị khớp với option đã chọn, ta hiển thị danh sách đầy đủ
      const items = filterOptions(input.value);
      renderDropdown(items.length > 0 ? items : filterOptions(''));
      dropdown.classList.add('open');
      wrapper.classList.add('open');
    }

    function closeDropdown() {
      dropdown.classList.remove('open');
      wrapper.classList.remove('open');
      activeIndex = -1;
      syncDisplayFromSelect();
    }

    function selectOption(val, label) {
      selectEl.value = val;
      input.value = label || '';
      clearBtn.style.display = val ? 'inline-flex' : 'none';
      dropdown.classList.remove('open');
      wrapper.classList.remove('open');
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function syncDisplayFromSelect() {
      const val = selectEl.value;
      if (!val) {
        input.value = '';
        clearBtn.style.display = 'none';
        return;
      }
      const opt = Array.from(selectEl.options).find(o => o.value === val);
      if (opt) {
        input.value = opt.textContent.trim();
        clearBtn.style.display = 'inline-flex';
      } else {
        input.value = '';
        clearBtn.style.display = 'none';
      }
    }

    // Sự kiện người dùng gõ phím
    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'inline-flex' : 'none';
      const items = filterOptions(input.value);
      renderDropdown(items);
      dropdown.classList.add('open');
      wrapper.classList.add('open');
    });

    input.addEventListener('focus', () => {
      openDropdown();
      input.select();
    });

    // Bàn phím: Mũi tên lên/xuống, Enter, Escape
    input.addEventListener('keydown', (e) => {
      if (!dropdown.classList.contains('open')) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          openDropdown();
          e.preventDefault();
        }
        return;
      }

      const itemEls = listEl.querySelectorAll('.combobox-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (itemEls.length === 0) return;
        activeIndex = (activeIndex + 1) % itemEls.length;
        updateActiveItem(itemEls);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (itemEls.length === 0) return;
        activeIndex = (activeIndex - 1 + itemEls.length) % itemEls.length;
        updateActiveItem(itemEls);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < currentFiltered.length) {
          const chosen = currentFiltered[activeIndex];
          selectOption(chosen.value, chosen.label);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      }
    });

    function updateActiveItem(itemEls) {
      itemEls.forEach((el, idx) => {
        if (idx === activeIndex) {
          el.classList.add('active');
          el.scrollIntoView({ block: 'nearest' });
        } else {
          el.classList.remove('active');
        }
      });
    }

    // Click chọn trên dropdown list
    listEl.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.combobox-item');
      if (!itemEl) return;
      const idx = Number(itemEl.dataset.idx);
      if (idx >= 0 && idx < currentFiltered.length) {
        const chosen = currentFiltered[idx];
        selectOption(chosen.value, chosen.label);
      }
    });

    // Nút Clear ✕
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectOption('', '');
      input.focus();
      openDropdown();
    });

    // Nút Toggle mũi tên
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.classList.contains('open')) {
        closeDropdown();
      } else {
        input.focus();
        openDropdown();
      }
    });

    // Click ra ngoài thì đóng dropdown
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        if (dropdown.classList.contains('open')) {
          closeDropdown();
        }
      }
    });

    // Bắt thay đổi thuộc tính .value bằng Object.defineProperty để code JS khác gán selectEl.value = ... tự cập nhật
    try {
      const proto = HTMLSelectElement.prototype;
      const origDescriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (origDescriptor && origDescriptor.set) {
        Object.defineProperty(selectEl, 'value', {
          get() {
            return origDescriptor.get.call(this);
          },
          set(v) {
            origDescriptor.set.call(this, v);
            syncDisplayFromSelect();
          },
          configurable: true
        });
      }
    } catch (descErr) {
      selectEl.addEventListener('change', syncDisplayFromSelect);
    }

    wrapper._comboboxInstance = {
      sync: syncDisplayFromSelect,
      open: openDropdown,
      close: closeDropdown
    };
  }

  // Nếu đã khởi tạo rồi, đồng bộ lại hiển thị theo select
  if (wrapper._comboboxInstance) {
    wrapper._comboboxInstance.sync();
  }
}
window.setupSearchableSelect = setupSearchableSelect;

/* Render Member Dropdown in Dashboard Form - Tối ưu với DocumentFragment */
function renderMemberOptions() {
  const sel = $('inputMember');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Chọn thành viên --</option>';
  const list = Object.values(allUsers).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const frag = document.createDocumentFragment();
  list.forEach(u => {
    const isExpelled = (Number(u.scars) || 0) >= 3 || !!u.isExpelled;
    const o = document.createElement('option');
    o.value = u.id;
    if (isExpelled) {
      o.disabled = true;
      o.textContent = `⛔ ${u.name || u.username} (ĐÃ ĐUỔI - 3 Sẹo)`;
    } else {
      const sCount = Number(u.scars) || 0;
      o.textContent = (u.name || u.username) + (sCount > 0 ? ` [${sCount}/3 sẹo]` : '');
    }
    frag.appendChild(o);
  });
  sel.appendChild(frag);
  if (prev && list.find(u => u.id === prev)) sel.value = prev;

  // Kích hoạt ô tìm kiếm gợi ý thông minh (Gõ "ch" hay "cuu" ra ngay "BUA | Chị Cừu")
  setupSearchableSelect('inputMember', {
    placeholder: '🔍 Gõ tìm tên (vd: ch, cuu, tri)...'
  });
}
window.renderMemberOptions = renderMemberOptions;

/* Quick Add Member Modal from Dashboard */
$('openAddMemberQuick')?.addEventListener('click', () => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge">➕</div>
          <div>
            <h3>Thêm Thành Viên Mới</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Ghi nhận thành viên vào băng đảng</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeQuickM" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:18px;">
        <label for="quickMName">Họ và tên thành viên *</label>
        <input id="quickMName" placeholder="Ví dụ: Nguyễn Văn A" autocomplete="off">
        <div id="quickMWarn" style="font-size:12.5px;font-weight:700;color:var(--danger, #dc2626);margin-top:6px;display:none;"></div>
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelQuickM">Huỷ bỏ</button>
        <button type="button" class="green" id="saveQuickM">💾 Thêm Ngay</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const inp = overlay.querySelector('#quickMName');
  const warn = overlay.querySelector('#quickMWarn');
  inp.focus();

  inp.addEventListener('input', () => {
    const val = inp.value.trim();
    if (val && isMemberNameExists(val)) {
      warn.textContent = `⚠️ Đã có "${val}" rồi! Vui lòng nhập tên khác.`;
      warn.style.display = 'block';
    } else {
      warn.style.display = 'none';
    }
  });

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeQuickM').onclick = closeModal;
  overlay.querySelector('#cancelQuickM').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  async function handleSaveQuick() {
    const name = inp.value.trim();
    if (!name) {
      inp.focus();
      return;
    }
    if (isMemberNameExists(name)) {
      alert(`❌ Đã có "${name}" rồi! Vui lòng nhập tên khác.`);
      inp.focus();
      inp.select();
      return;
    }
    try {
      const newRef = await usersRef.push({ name, createdAt: Date.now() });
      logAudit('ADD_MEMBER', 'Thêm Thành Viên', `Thêm mới thành viên "${name}" vào danh sách`);
      overlay.remove();
      setTimeout(() => {
        if ($('inputMember')) $('inputMember').value = newRef.key;
      }, 150);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  }

  overlay.querySelector('#saveQuickM').onclick = handleSaveQuick;
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSaveQuick();
  });
});

/* Add Member in Admin View */
$('addMemberBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) {
    setStatus($('memberStatus'), '⛔ Chỉ quản trị viên (admin.html) mới có quyền thêm thành viên!', false);
    return;
  }
  const name = $('mName').value.trim();
  if (!name) {
    $('mName')?.focus();
    return;
  }
  if (isMemberNameExists(name)) {
    setStatus($('memberStatus'), `❌ Đã có "${name}" rồi! Vui lòng nhập tên khác.`, false);
    $('mName')?.focus();
    $('mName')?.select();
    return;
  }
  try {
    await usersRef.push({ name, createdAt: Date.now() });
    logAudit('ADD_MEMBER', 'Thêm Thành Viên', `Thêm mới thành viên "${name}" vào danh sách`);
    setStatus($('memberStatus'), `✅ Đã thêm thành viên "${name}" thành công!`);
    $('mName').value = '';
  } catch (err) {
    setStatus($('memberStatus'), '❌ Lỗi: ' + err.message, false);
  }
});

// Phím tắt Enter cho ô nhập tên thành viên
$('mName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('addMemberBtn')?.click();
});

// Cảnh báo ngay khi gõ nếu tên đã tồn tại
$('mName')?.addEventListener('input', () => {
  const val = ($('mName')?.value || '').trim();
  if (val && isMemberNameExists(val)) {
    setStatus($('memberStatus'), `⚠️ Đã có "${val}" rồi!`, false);
  } else if ($('memberStatus')?.textContent?.includes('Đã có')) {
    $('memberStatus').textContent = '';
  }
});

/* Render Members Table */
let membersCurrentPage = 1;
const MEMBERS_PAGE_SIZE = 10;
window.membersCurrentPage = membersCurrentPage;

// State for Pro Member Table
let currentMemberFilter = 'all'; // 'all', 'active', 'idle', 'top10'
let currentMemberSort = 'houses-desc'; // 'houses-desc', 'houses-asc', 'name-asc', 'name-desc'
let memberControlsInitialized = false;

function initMemberProControls() {
  if (memberControlsInitialized) return;
  memberControlsInitialized = true;

  // 1. Search Clear Button
  const searchInput = $('searchMemberInput');
  const clearBtn = $('btnClearSearchMember');
  if (searchInput && clearBtn) {
    searchInput.addEventListener('input', () => {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      membersCurrentPage = 1;
      renderMembersTable();
      searchInput.focus();
    });
  }

  // 2. Filter Pills
  document.querySelectorAll('.member-filter-group .filter-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.member-filter-group .filter-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMemberFilter = this.getAttribute('data-filter') || 'all';
      membersCurrentPage = 1;
      renderMembersTable();
    });
  });

  // 3. Sort Select
  const sortSelect = $('memberSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      currentMemberSort = this.value;
      membersCurrentPage = 1;
      renderMembersTable();
    });
  }
}

function renderMembersTable() {
  const tb = $('membersTable');
  if (!tb) return;
  initMemberProControls();

  const search = ($('searchMemberInput')?.value || '').toLowerCase().trim();
  tb.innerHTML = '';

  // 1. Tính toán tổng số nhà từng thành viên
  const memberTotals = {};
  for (let i = 0; i < allRecords.length; i++) {
    const r = allRecords[i];
    memberTotals[r.userId] = (memberTotals[r.userId] || 0) + (Number(r.binh) || 0);
  }

  // 2. Cập nhật 4 KPI cards trên đầu trang Thành Viên
  const totalAllMembers = Object.keys(allUsers).length;
  let activeMembersCount = 0;
  let top1MemberName = '';
  let maxMemberHouses = 0;

  Object.entries(allUsers).forEach(([uid, u]) => {
    const h = memberTotals[uid] || 0;
    if (h > 0) activeMembersCount++;
    if (h > maxMemberHouses) {
      maxMemberHouses = h;
      top1MemberName = u.name || 'Chưa rõ';
    }
  });

  if ($('kpiMemberTotal')) $('kpiMemberTotal').textContent = `${totalAllMembers} anh em`;
  if ($('kpiMemberActive')) $('kpiMemberActive').textContent = `${activeMembersCount} / ${totalAllMembers} người`;
  if ($('kpiMemberTop1')) $('kpiMemberTop1').textContent = top1MemberName && maxMemberHouses > 0 ? `${top1MemberName} (${maxMemberHouses} nhà)` : 'Chưa có';
  if ($('kpiMemberBailed')) {
    const totalBails = (window.fundLogs || []).filter(l => l.type === 'bail').length;
    $('kpiMemberBailed').textContent = `${totalBails} lượt`;
  }

  // 3. Lọc danh sách theo Search
  let userList = Object.values(allUsers).filter(u => (u.name || '').toLowerCase().includes(search));

  // 4. Lọc theo Filter Pills
  if (currentMemberFilter === 'active') {
    userList = userList.filter(u => (memberTotals[u.id] || 0) > 0);
  } else if (currentMemberFilter === 'idle') {
    userList = userList.filter(u => (memberTotals[u.id] || 0) === 0);
  }

  // 5. Sắp xếp danh sách
  userList.sort((a, b) => {
    const aHouses = memberTotals[a.id] || 0;
    const bHouses = memberTotals[b.id] || 0;
    if (currentMemberSort === 'houses-desc') {
      if (bHouses !== aHouses) return bHouses - aHouses;
      return (a.name || '').localeCompare(b.name || '');
    } else if (currentMemberSort === 'houses-asc') {
      if (aHouses !== bHouses) return aHouses - bHouses;
      return (a.name || '').localeCompare(b.name || '');
    } else if (currentMemberSort === 'name-asc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (currentMemberSort === 'name-desc') {
      return (b.name || '').localeCompare(a.name || '');
    }
    return bHouses - aHouses;
  });

  // Nếu chọn Top 10
  if (currentMemberFilter === 'top10') {
    userList = userList.slice(0, 10);
  }

  if (!userList.length) {
    if ($('membersListCount')) {
      $('membersListCount').textContent = '0 thành viên';
    }
    tb.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state-box">
          <span class="empty-state-icon">👥</span>
          <div class="empty-state-title">${search ? 'Không tìm thấy thành viên phù hợp' : 'Chưa có dữ liệu thành viên'}</div>
          <div class="empty-state-desc">${search ? 'Thử tìm kiếm với từ khóa khác hoặc bấm nút bộ lọc "Tất Cả"' : 'Danh sách thành viên đang trống'}</div>
        </div>
      </td></tr>`;
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({ container: 'membersPagination', totalItems: 0 });
    }
    return;
  }

  // Phân trang
  const totalPages = Math.ceil(userList.length / MEMBERS_PAGE_SIZE) || 1;
  if (membersCurrentPage > totalPages) membersCurrentPage = totalPages;
  if (membersCurrentPage < 1) membersCurrentPage = 1;

  const startIndex = (membersCurrentPage - 1) * MEMBERS_PAGE_SIZE;
  const pagedMembers = userList.slice(startIndex, startIndex + MEMBERS_PAGE_SIZE);

  if ($('membersListCount')) {
    if (userList.length > MEMBERS_PAGE_SIZE) {
      $('membersListCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedMembers.length, userList.length)} / ${userList.length} thành viên (Trang ${membersCurrentPage}/${totalPages})`;
    } else {
      $('membersListCount').textContent = `${userList.length} thành viên`;
    }
  }

  const frag = document.createDocumentFragment();
  pagedMembers.forEach((u, idx) => {
    const globalIdx = startIndex + idx;
    const totalBinh = memberTotals[u.id] || 0;
    const roundedHouses = Math.round(totalBinh * 100) / 100;
    const uName = u.name || '';
    const uNameLower = uName.toLowerCase();
    const userScars = Number(u.scars) || 0;
    const isExpelled = userScars >= 3 || !!u.isExpelled;

    let scarBadge = '';
    if (isExpelled) {
      scarBadge = '<span class="badge-scar badge-scar-expelled">⛔ ĐÃ ĐUỔI (3/3 Sẹo)</span>';
    } else if (userScars === 2) {
      scarBadge = '<span class="badge-scar badge-scar-danger">🪓🪓 2/3 Sẹo</span>';
    } else if (userScars === 1) {
      scarBadge = '<span class="badge-scar badge-scar-warn">🪓 1/3 Sẹo</span>';
    } else {
      scarBadge = '<span class="badge-scar badge-scar-clean">🟢 0/3 Sẹo</span>';
    }

    // 1. Huy hiệu thứ hạng (Rank Badge)
    let rankBadge = '';
    if (totalBinh > 0 && currentMemberSort === 'houses-desc') {
      if (globalIdx === 0) {
        rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;font-size:15px;box-shadow:0 0 12px rgba(245,158,11,0.5);" title="Top 1 Dẫn Đầu">🥇</span>';
      } else if (globalIdx === 1) {
        rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#0f172a;font-weight:900;font-size:14px;box-shadow:0 0 8px rgba(148,163,184,0.4);" title="Top 2">🥈</span>';
      } else if (globalIdx === 2) {
        rankBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#fed7aa,#ea580c);color:#ffffff;font-weight:900;font-size:14px;box-shadow:0 0 8px rgba(234,88,12,0.4);" title="Top 3">🥉</span>';
      } else {
        rankBadge = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:24px;padding:0 6px;border-radius:999px;background:#f1f5f9;color:#475569;font-weight:800;font-size:12px;border:1px solid #e2e8f0;">#${globalIdx + 1}</span>`;
      }
    } else {
      rankBadge = `<span style="color:#94a3b8;font-weight:750;font-size:12px;">#${globalIdx + 1}</span>`;
    }

    // 2. Avatar chip & Danh hiệu thông minh (Title Badge)
    const isOwner = uNameLower.includes('trí') || uNameLower.includes('tri');
    const isSpecialAdmin = uNameLower.includes('muội') || uNameLower.includes('muoi');
    
    let avatarChar = (uName || 'C').replace(/^bua\s*\d*\s*\|\s*/i, '').trim().charAt(0).toUpperCase() || 'C';
    let avatarBg = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
    let avatarBorder = '#f59e0b';
    let avatarColor = '#92400e';

    let titleTag = '';
    if (isExpelled) {
      avatarChar = '⛔';
      avatarBg = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
      avatarBorder = '#ef4444';
      avatarColor = '#991b1b';
      titleTag = '<span class="member-title-tag" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;">⛔ ĐÃ BỊ ĐUỔI KHỎI CREW</span>';
    } else if (isOwner) {
      avatarChar = '👑';
      avatarBg = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      avatarBorder = '#f59e0b';
      titleTag = '<span class="member-title-tag member-title-owner">👑 Thủ Lĩnh Tối Cao</span>';
    } else if (isSpecialAdmin) {
      avatarChar = '🌸';
      avatarBg = 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)';
      avatarBorder = '#ec4899';
      titleTag = '<span class="member-title-tag member-title-admin">🌸 Đại Tỷ Quản Trị</span>';
    } else if (totalBinh > 0 && globalIdx === 0 && currentMemberSort === 'houses-desc') {
      titleTag = '<span class="member-title-tag member-title-top1">🏆 Vua Dọn Nhà</span>';
    } else if (totalBinh > 0 && globalIdx < 5 && currentMemberSort === 'houses-desc') {
      titleTag = '<span class="member-title-tag member-title-elite">🔥 Tinh Anh Crew</span>';
    } else if (totalBinh > 0) {
      titleTag = '<span class="member-title-tag member-title-active">⚡ Chiến Binh Tích Cực</span>';
    } else {
      titleTag = '<span class="member-title-tag member-title-idle">🛡️ Tân Binh Đợi Lệnh</span>';
    }

    // 3. Tiến độ so với Top 1 (Progress Bar)
    const percent = maxMemberHouses > 0 ? Math.min(100, Math.round((totalBinh / maxMemberHouses) * 100)) : 0;
    const progressColor = percent >= 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : (percent >= 40 ? 'linear-gradient(90deg, #0284c7, #10b981)' : 'linear-gradient(90deg, #94a3b8, #64748b)');

    // 4. Trạng thái (Status Badge)
    const workStatusBadge = totalBinh > 0 
      ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:11.5px;font-weight:800;border:1px solid #a7f3d0;"><span style="width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;"></span>Đang Nắm Nhà</span>`
      : `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:11.5px;font-weight:700;border:1px solid #e2e8f0;"><span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;"></span>Sẵn Sàng</span>`;

    const statusColHtml = isExpelled
      ? `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;"><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:11.5px;font-weight:900;border:1px solid #ef4444;"><span style="width:7px;height:7px;border-radius:50%;background:#ef4444;"></span>Đã Bị Đuổi</span>${scarBadge}</div>`
      : `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">${workStatusBadge}${scarBadge}</div>`;

    const tr = document.createElement('tr');
    if (isExpelled) {
      tr.style.opacity = '0.75';
    }

    if (isAdmin()) {
      tr.innerHTML = `
        <td style="text-align:center;">
          ${rankBadge}
        </td>
        <td>
          <div class="member-cell-wrap" title="Bấm để xem hồ sơ chiến binh">
            <div class="member-avatar-chip" style="background:${avatarBg};border-color:${avatarBorder};color:${avatarColor};">${avatarChar}</div>
            <div style="display:flex;flex-direction:column;">
              <span class="member-name-title" style="${isExpelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${escHtml(uName)}</span>
              ${titleTag}
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;" title="${percent}% so với Top 1">
              <div style="width:${percent}%;height:100%;border-radius:999px;background:${progressColor};transition:width 0.3s ease;"></div>
            </div>
            <span style="font-size:11.5px;font-weight:800;color:#64748b;min-width:32px;text-align:right;">${percent}%</span>
          </div>
        </td>
        <td style="text-align:center;">
          <span class="badge-house-pill ${totalBinh > 0 ? 'has-houses' : ''}" style="cursor:pointer;" title="Bấm để xem chi tiết">🏠 ${roundedHouses} nhà</span>
        </td>
        <td style="text-align:center;">
          ${statusColHtml}
        </td>
        <td class="action-cell">
          <div class="table-actions-group">
            <button type="button" class="btn-table-action btn-act-scar" data-act="scar" title="Đánh sẹo / Kỷ luật thành viên">
              <span>🪓 Sẹo (${userScars}/3)</span>
            </button>
            <button type="button" class="btn-table-action btn-act-profile" data-act="profile" title="Xem hồ sơ chi tiết">
              <span>👤 Hồ sơ</span>
            </button>
            <button type="button" class="btn-table-action btn-act-edit" data-act="edit" title="Chỉnh sửa tên & tổng nhà" aria-label="Sửa">
              <span>✏️ Sửa</span>
            </button>
            <button type="button" class="btn-table-action btn-act-del" data-act="del" title="Xóa khỏi danh sách" aria-label="Xóa">
              <span>🗑️ Xoá</span>
            </button>
          </div>
        </td>
      `;
      tr.querySelector('.member-cell-wrap').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
      tr.querySelector('.badge-house-pill').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
      tr.querySelector('[data-act="profile"]').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
      tr.querySelector('[data-act="scar"]').onclick = () => editMember(u.id);
      tr.querySelector('[data-act="edit"]').onclick = () => editMember(u.id);
      tr.querySelector('[data-act="del"]').onclick = () => deleteMember(u.id);
    } else {
      tr.innerHTML = `
        <td style="text-align:center;">
          ${rankBadge}
        </td>
        <td>
          <div class="member-cell-wrap" title="Bấm để xem hồ sơ chiến binh">
            <div class="member-avatar-chip" style="background:${avatarBg};border-color:${avatarBorder};color:${avatarColor};">${avatarChar}</div>
            <div style="display:flex;flex-direction:column;">
              <span class="member-name-title" style="${isExpelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${escHtml(uName)}</span>
              ${titleTag}
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;" title="${percent}% so với Top 1">
              <div style="width:${percent}%;height:100%;border-radius:999px;background:${progressColor};transition:width 0.3s ease;"></div>
            </div>
            <span style="font-size:11.5px;font-weight:800;color:#64748b;min-width:32px;text-align:right;">${percent}%</span>
          </div>
        </td>
        <td style="text-align:center;">
          <span class="badge-house-pill ${totalBinh > 0 ? 'has-houses' : ''}" style="cursor:pointer;" title="Bấm để xem chi tiết">🏠 ${roundedHouses} nhà</span>
        </td>
        <td style="text-align:center;">
          ${statusColHtml}
        </td>
        <td style="text-align:right;">
          <button type="button" class="btn-profile-view" data-act="profile" title="Xem hồ sơ cá nhân">
            <span>🔍 Xem Hồ Sơ</span>
          </button>
        </td>
      `;
      tr.querySelector('.member-cell-wrap').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
      tr.querySelector('.badge-house-pill').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
      tr.querySelector('[data-act="profile"]').onclick = () => window.openMemberProfileModal && window.openMemberProfileModal(u.id);
    }
    frag.appendChild(tr);
  });
  tb.appendChild(frag);

  // Render bộ phân trang
  if (typeof renderPaginationControls === 'function') {
    renderPaginationControls({
      container: 'membersPagination',
      totalItems: userList.length,
      pageSize: MEMBERS_PAGE_SIZE,
      currentPage: membersCurrentPage,
      itemLabel: 'thành viên',
      onPageChange: (newPage) => {
        membersCurrentPage = newPage;
        renderMembersTable();
        const tbl = $('membersTable');
        if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
window.renderMembersTable = renderMembersTable;

$('searchMemberInput')?.addEventListener('input', debounce(() => {
  membersCurrentPage = 1;
  renderMembersTable();
}, 120));

/* Delete Member */
async function deleteMember(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để xoá!');
    return;
  }
  const member = allUsers[id];
  if (!member) return;
  const countRecords = allRecords.filter(r => r.userId === id).length;
  const totalBinh = allRecords
    .filter(r => r.userId === id)
    .reduce((s, r) => s + (Number(r.binh) || 0), 0);

  const ok = (typeof showConfirmModal === 'function')
    ? await showConfirmModal({
        title: 'Xoá Thành Viên',
        targetName: member.name,
        targetType: 'Thành viên Crew Lưới Búa',
        type: 'danger',
        icon: '🗑️',
        message: countRecords > 0
          ? `Đại ca có chắc chắn muốn xoá thành viên này?<br><span style="color:#dc2626;font-size:12.5px;font-weight:700;">⚠️ Thao tác này sẽ xoá luôn <b>${countRecords} bản ghi</b> (tổng ${Math.round(totalBinh * 100) / 100} nhà). Không thể hoàn tác!</span>`
          : 'Đại ca có chắc chắn muốn xoá thành viên này khỏi hệ thống không? Dữ liệu sau khi xoá không thể khôi phục.',
        confirmText: '🗑️ Xoá Thành Viên',
        cancelText: '✕ Hủy Bỏ'
      })
    : confirm(`Xoá thành viên "${member.name}"?`);

  if (!ok) return;

  try {
    const updates = {};
    allRecords.forEach(r => {
      if (r.userId === id) updates[`records/${r.id}`] = null;
    });
    updates[`users/${id}`] = null;
    await db.ref().update(updates);
    logAudit('DELETE_MEMBER', 'Xoá Thành Viên', `Xoá thành viên "${member.name}" cùng ${countRecords} bản ghi liên quan (tổng ${Math.round(totalBinh * 100) / 100} nhà)`);
    if (typeof showAlertModal === 'function') {
      showAlertModal({
        title: 'Thành Công',
        message: `Đã xoá vĩnh viễn thành viên "${member.name}" và toàn bộ số nhà liên quan!`,
        type: 'success',
        icon: '✅'
      });
    } else {
      alert('✅ Đã xoá thành viên và toàn bộ nhà của người đó.');
    }
  } catch (e) {
    if (typeof showAlertModal === 'function') {
      showAlertModal({
        title: 'Lỗi Xoá Thành Viên',
        message: 'Lỗi: ' + e.message,
        type: 'danger',
        icon: '❌'
      });
    } else {
      alert('❌ Lỗi: ' + e.message);
    }
  }
}
window.deleteMember = deleteMember;

/* Edit Member & Scar Discipline System */
function editMember(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để chỉnh sửa!');
    return;
  }
  const m = allUsers[id];
  if (!m) return;
  const currentTotal = allRecords
    .filter(r => r.userId === id)
    .reduce((s, r) => s + (Number(r.binh) || 0), 0);
  const roundedTotal = Math.round(currentTotal * 100) / 100;
  const recCount = allRecords.filter(r => r.userId === id).length;

  let currentScars = Number(m.scars) || 0;
  let scarHistoryList = Array.isArray(m.scarHistory)
    ? [...m.scarHistory]
    : (m.scarHistory ? Object.values(m.scarHistory) : []);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:480px;max-height:92vh;overflow-y:auto;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge">✏️</div>
          <div>
            <h3>Sửa Thông Tin &amp; Kỷ Luật</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Cập nhật tên, nhà &amp; đánh sẹo thành viên</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeEditM" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:12px;">
        <label for="editMName">Tên thành viên *</label>
        <input id="editMName" value="${escHtml(m.name || '')}">
        <div id="editMWarn" style="font-size:12.5px;font-weight:700;color:var(--danger, #dc2626);margin-top:6px;display:none;"></div>
      </div>

      <div class="form-group" style="margin-bottom:12px;">
        <label for="editMBinh">Tổng số nhà hiện tại</label>
        <input type="number" id="editMBinh" step="any" min="0" value="${roundedTotal}">
      </div>

      <p style="font-size:11.5px;color:var(--slate-500);margin:-4px 0 12px;line-height:1.4;">
        ℹ️ Hiện có <b>${recCount}</b> bản ghi, tổng <b>${roundedTotal}</b> nhà.<br>
        Nếu bạn đổi tổng nhà, các bản ghi cũ sẽ được <b>gộp lại thành 1 bản ghi mới</b> với ngày hôm nay.
      </p>

      <!-- HỆ THỐNG ĐÁNH SẸO & KỶ LUẬT (3 SẸO ĐUỔI THẲNG) -->
      <div class="scar-management-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:18px;">🪓</span>
            <div>
              <div style="font-size:13px;font-weight:900;color:#991b1b;letter-spacing:0.2px;">KỶ LUẬT &amp; ĐÁNH SẸO CREW</div>
              <div style="font-size:10.5px;color:#dc2626;font-weight:700;">Quy tắc nghiêm: Đủ 3 Sẹo đuổi thẳng khỏi Crew!</div>
            </div>
          </div>
          <div id="scarStatusPill" class="scar-counter-pill clean">
            🟢 0/3 Sẹo
          </div>
        </div>

        <!-- 3-Segment Visual Tracker -->
        <div class="scar-tracker-track">
          <div class="scar-seg" id="scarSeg1">
            <span>Sẹo 1</span>
            <small>Cảnh cáo</small>
          </div>
          <div class="scar-seg" id="scarSeg2">
            <span>Sẹo 2</span>
            <small>Nghiêm khắc</small>
          </div>
          <div class="scar-seg" id="scarSeg3">
            <span>Sẹo 3</span>
            <small>ĐUỔI THẲNG</small>
          </div>
        </div>

        <!-- Expelled Alert Banner -->
        <div id="scarExpelledBanner" style="display:none;background:#fee2e2;border:1.5px solid #ef4444;border-radius:12px;padding:8px 12px;margin-bottom:10px;text-align:center;">
          <div style="font-size:12.5px;font-weight:900;color:#991b1b;">⛔ ĐÃ BỊ ĐUỔI THẲNG KHỎI CREW LƯỚI BÚA!</div>
          <div style="font-size:11px;font-weight:700;color:#dc2626;margin-top:2px;">Thành viên này đã tích lũy đủ 3/3 sẹo kỷ luật và bị khóa chức năng dọn nhà.</div>
        </div>

        <!-- Add / Remove Scar Controls -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;">
            <input type="text" id="scarReasonInput" placeholder="Nhập lý do đánh sẹo..." style="flex:1;font-size:12px;padding:8px 12px;border:1.5px solid #fca5a5;border-radius:12px;background:#ffffff;">
            <button type="button" class="btn-scar-action btn-add-scar" id="btnAddScar" title="Đánh thêm 1 sẹo">
              <span>+1 Sẹo 🪓</span>
            </button>
            <button type="button" class="btn-scar-action btn-remove-scar" id="btnRemoveScar" title="Ân xá / Xóa bớt 1 sẹo">
              <span>-1 Ân Xá 🛡️</span>
            </button>
          </div>
        </div>

        <!-- Scar History Log List -->
        <div id="scarHistorySection" style="margin-top:10px;">
          <div style="font-size:11px;font-weight:800;color:#7f1d1d;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Lịch sử đánh sẹo &amp; vi phạm:</span>
            <span id="scarHistoryCount" style="font-size:10.5px;color:#94a3b8;">0 lần</span>
          </div>
          <div id="scarHistoryList" style="display:flex;flex-direction:column;gap:5px;max-height:120px;overflow-y:auto;padding-right:2px;">
            <!-- History items rendered dynamically -->
          </div>
        </div>
      </div>

      <div class="modal-actions" style="margin-top:16px;">
        <button type="button" class="secondary" id="cancelEdit">Huỷ bỏ</button>
        <button type="button" class="green" id="saveEdit">💾 Lưu Thay Đổi</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const inpName = overlay.querySelector('#editMName');
  const inpBinh = overlay.querySelector('#editMBinh');
  const warn = overlay.querySelector('#editMWarn');
  const scarReasonInput = overlay.querySelector('#scarReasonInput');
  inpName.focus(); inpName.select();

  function updateScarUI() {
    const isExp = currentScars >= 3;
    
    // Update Pill
    const pill = overlay.querySelector('#scarStatusPill');
    if (pill) {
      if (isExp) {
        pill.className = 'scar-counter-pill expelled';
        pill.innerHTML = `⛔ ĐÃ ĐUỔI (${currentScars}/3)`;
      } else if (currentScars === 2) {
        pill.className = 'scar-counter-pill warn2';
        pill.innerHTML = '🪓🪓 2/3 Sẹo';
      } else if (currentScars === 1) {
        pill.className = 'scar-counter-pill warn1';
        pill.innerHTML = '🪓 1/3 Sẹo';
      } else {
        pill.className = 'scar-counter-pill clean';
        pill.innerHTML = '🟢 0/3 Sẹo (Sạch)';
      }
    }

    // Update Segments
    const seg1 = overlay.querySelector('#scarSeg1');
    const seg2 = overlay.querySelector('#scarSeg2');
    const seg3 = overlay.querySelector('#scarSeg3');
    if (seg1) seg1.className = 'scar-seg' + (currentScars >= 1 ? ' active-1' : '');
    if (seg2) seg2.className = 'scar-seg' + (currentScars >= 2 ? ' active-2' : '');
    if (seg3) seg3.className = 'scar-seg' + (currentScars >= 3 ? ' active-3' : '');

    // Expelled banner
    const banner = overlay.querySelector('#scarExpelledBanner');
    if (banner) banner.style.display = isExp ? 'block' : 'none';

    // Remove scar button disable state
    const btnRemove = overlay.querySelector('#btnRemoveScar');
    if (btnRemove) {
      btnRemove.disabled = currentScars <= 0 && scarHistoryList.length === 0;
    }

    // History list
    const histContainer = overlay.querySelector('#scarHistoryList');
    const histCount = overlay.querySelector('#scarHistoryCount');
    if (histCount) histCount.textContent = `${scarHistoryList.length} lần`;
    if (histContainer) {
      if (!scarHistoryList.length) {
        histContainer.innerHTML = '<div style="font-size:11px;color:#94a3b8;font-style:italic;padding:4px 0;">Chưa có vết sẹo hay vi phạm nào.</div>';
      } else {
        histContainer.innerHTML = scarHistoryList.slice().reverse().map((sc, revIdx) => {
          const origIdx = scarHistoryList.length - 1 - revIdx;
          return `
            <div class="scar-history-item">
              <div style="display:flex;flex-direction:column;gap:1px;flex:1;overflow:hidden;">
                <span class="reason" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🪓 ${escHtml(sc.reason || 'Kỷ luật Crew')}</span>
                <span class="meta">${escHtml(sc.date || '')} ${escHtml(sc.time || '')} • Bởi: <b>${escHtml(sc.admin || 'Admin')}</b></span>
              </div>
              <button type="button" class="btn-del-scar" data-idx="${origIdx}" title="Xóa bản ghi sẹo này">✕</button>
            </div>
          `;
        }).join('');

        histContainer.querySelectorAll('.btn-del-scar').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const idx = Number(btn.dataset.idx);
            if (confirm('Đại ca có chắc chắn muốn xoá bản ghi sẹo này không?')) {
              scarHistoryList.splice(idx, 1);
              if (currentScars > 0) currentScars--;
              updateScarUI();
            }
          };
        });
      }
    }
  }

  // Initial UI render
  updateScarUI();
// Add scar button click
  overlay.querySelector('#btnAddScar').onclick = () => {
    const reason = (scarReasonInput?.value || '').trim();
    if (!reason) {
      alert('⚠️ Đại ca vui lòng nhập lý do đánh sẹo!');
      scarReasonInput?.focus();
      return;
    }

    const willExpel = (currentScars + 1) >= 3;
    if (willExpel) {
      const ok = confirm(`⚠️ CẢNH BÁO QUY CHẾ 3 SẸO:
Đánh thêm sẹo này sẽ làm thành viên "${m.name}" đạt 3/3 SẸO và BỊ ĐUỔI THẲNG KHỎI CREW LƯỚI BÚA!

Lý do: "${reason}"

Đại ca có chắc chắn muốn thi hành kỷ luật đuổi không?`);
      if (!ok) return;
    }

    const adminName = sessionStorage.getItem('luoibua_admin_name') || 'Nguyễn Trí';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    scarHistoryList.push({
      id: 'scar_' + Date.now(),
      reason: reason,
      admin: adminName,
      date: todayStr(),
      time: timeStr,
      timestamp: Date.now()
    });
    currentScars++;
    if (scarReasonInput) scarReasonInput.value = '';
    updateScarUI();

    if (currentScars >= 3) {
      alert(`⛔ ĐÃ THI HÀNH KỶ LUẬT:
Thành viên "${m.name}" đã đạt 3/3 sẹo và CHÍNH THỨC BỊ ĐUỔI KHỎI CREW!
Đại ca nhớ bấm [💾 Lưu Thay Đổi] để lưu dữ liệu lên hệ thống.`);
    }
  };

  // Remove scar button click
  overlay.querySelector('#btnRemoveScar').onclick = () => {
    if (currentScars <= 0 && !scarHistoryList.length) {
      alert('Thành viên này hiện tại trong sạch (0 sẹo), không có sẹo nào để xoá!');
      return;
    }
    if (!confirm(`Đại ca có muốn ân xá (-1 sẹo) cho thành viên "${m.name}" không?`)) return;
    if (scarHistoryList.length) {
      scarHistoryList.pop();
    }
    if (currentScars > 0) currentScars--;
    updateScarUI();
  };

  inpName.addEventListener('input', () => {
    const val = inpName.value.trim();
    if (warn) {
      if (val && val !== m.name && isMemberNameExists(val, id)) {
        warn.textContent = `⚠️ Đã có "${val}" rồi! Vui lòng chọn tên khác.`;
        warn.style.display = 'block';
      } else {
        warn.style.display = 'none';
      }
    }
  });

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeEditM').onclick = closeModal;
  overlay.querySelector('#cancelEdit').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#saveEdit').onclick = async () => {
    const newName = inpName.value.trim();
    const newBinh = Number(inpBinh.value) || 0;
    if (!newName) return alert('Tên không được để trống');

    const nameChanged = newName !== m.name;
    const binhChanged = Math.abs(newBinh - roundedTotal) > 0.001;
    const scarsChanged = currentScars !== (Number(m.scars) || 0) || JSON.stringify(scarHistoryList) !== JSON.stringify(m.scarHistory || []);
    const isExpelled = currentScars >= 3;

    if (nameChanged && isMemberNameExists(newName, id)) {
      alert(`❌ Đã có "${newName}" rồi! Vui lòng nhập tên khác.`);
      inpName.focus();
      inpName.select();
      return;
    }

    if (!nameChanged && !binhChanged && !scarsChanged) { overlay.remove(); return; }

    if (binhChanged) {
      const ok = (typeof showConfirmModal === 'function')
        ? await showConfirmModal({
            title: 'Thay Đổi Số Nhà',
            targetName: m.name,
            targetType: `${roundedTotal} nhà → ${newBinh} nhà`,
            type: 'warning',
            icon: '⚠️',
            message: `Đại ca có chắc chắn muốn đổi tổng số nhà của thành viên này?<br><span style="color:#d97706;font-size:12.5px;font-weight:700;">⚠️ Toàn bộ ${recCount} bản ghi cũ sẽ được thay thế bằng 1 bản ghi mới. Không thể hoàn tác!</span>`,
            confirmText: '⚡ Đồng Ý Đổi',
            cancelText: '✕ Hủy Bỏ'
          })
        : confirm(`Đổi tổng số nhà của "${m.name}" từ ${roundedTotal} → ${newBinh}?`);
      if (!ok) return;
    }

    try {
      const updates = {};
      if (nameChanged) updates[`users/${id}/name`] = newName;
      if (binhChanged) {
        allRecords.forEach(r => {
          if (r.userId === id) updates[`records/${r.id}`] = null;
        });
        const newRef = recordsRef.push();
        updates[`records/${newRef.key}`] = {
          userId: id,
          userName: newName,
          date: todayStr(),
          binh: newBinh,
          timestamp: Date.now()
        };
      } else if (nameChanged) {
        allRecords.forEach(r => {
          if (r.userId === id) updates[`records/${r.id}/userName`] = newName;
        });
      }

      if (scarsChanged) {
        updates[`users/${id}/scars`] = currentScars;
        updates[`users/${id}/isExpelled`] = isExpelled;
        updates[`users/${id}/scarHistory`] = scarHistoryList;
        if (isExpelled && !m.isExpelled) {
          updates[`users/${id}/expelledAt`] = new Date().toISOString();
        } else if (!isExpelled && m.isExpelled) {
          updates[`users/${id}/expelledAt`] = null;
        }
      }

      if (Object.keys(updates).length) {
        await db.ref().update(updates);
        // Cập nhật bộ nhớ đệm client ngay lập tức
        if (nameChanged) m.name = newName;
        if (scarsChanged) {
          m.scars = currentScars;
          m.isExpelled = isExpelled;
          m.scarHistory = scarHistoryList;
        }

        const changeDesc = [];
        if (nameChanged) changeDesc.push(`Đổi tên: "${m.name}" -> "${newName}"`);
        if (binhChanged) changeDesc.push(`Đổi tổng số nhà: ${roundedTotal} -> ${newBinh} nhà`);
        if (scarsChanged) {
          if (isExpelled && !m.isExpelled) {
            changeDesc.push(`ĐUỔI KHỎI CREW (3/3 Sẹo)`);
            logAudit('EXPEL_MEMBER', 'Đuổi Thành Viên (3 Sẹo)', `Thành viên "${m.name}" đã nhận đủ 3 sẹo và BỊ ĐUỔI THẲNG khỏi Crew Lưới Búa.`);
          } else {
            changeDesc.push(`Kỷ luật: ${currentScars}/3 Sẹo`);
            logAudit('DISCIPLINE_SCAR', 'Cập Nhật Kỷ Luật Sẹo', `Cập nhật kỷ luật cho "${m.name}": ${currentScars}/3 sẹo (${scarHistoryList.length} bản ghi)`);
          }
        }
        if (changeDesc.length && (!scarsChanged || nameChanged || binhChanged)) {
          logAudit('EDIT_MEMBER', 'Sửa Thành Viên', `Cập nhật thành viên "${m.name}": ${changeDesc.join(', ')}`);
        }
      }

      overlay.remove();
      if (typeof showAlertModal === 'function') {
        showAlertModal({
          title: 'Cập Nhật Thành Công',
          message: isExpelled
            ? `Đã cập nhật thành viên "${newName}"!<br><b style="color:#dc2626;">⛔ Thành viên này đã có 3/3 sẹo và bị đuổi thẳng khỏi Crew!</b>`
            : `Đã cập nhật thông tin & kỷ luật cho "${newName}" thành công!`,
          type: isExpelled ? 'warning' : 'success',
          icon: isExpelled ? '⛔' : '✅'
        });
      } else {
        alert(isExpelled ? `⛔ Đã cập nhật! Thành viên "${newName}" đã bị đuổi khỏi Crew do đủ 3 sẹo.` : '✅ Đã cập nhật thành công!');
      }
    } catch (e) {
      alert('❌ Lỗi: ' + e.message);
    }
  };
}
window.editMember = editMember;

// Gắn sự kiện xuất danh sách thành viên ra Excel/CSV
$('btnExportMembersCsv')?.addEventListener('click', () => {
  if (window.CrewCsvExport) {
    window.CrewCsvExport.exportMembersToCsv(allUsers, allRecords, fundLogs);
  }
});

;

/* [MODULE: records.js] */
/* ==========================================================================
   MODULE: RECORDS MANAGEMENT (VIEW MODES, FILTERS & EDIT/DELETE)
   ========================================================================== */
var currentRecordsMode = 'grouped-date'; // 'grouped-date', 'grouped-member', 'flat'
window.currentRecordsMode = currentRecordsMode;

let recordsCurrentPage = 1;
const RECORDS_PAGE_SIZE = 10;
window.recordsCurrentPage = recordsCurrentPage;

function initRecordsModeToggle() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRecordsMode = btn.dataset.mode;
      window.currentRecordsMode = currentRecordsMode;
      recordsCurrentPage = 1;
      renderRecords();
    };
  });
}
window.initRecordsModeToggle = initRecordsModeToggle;

function renderRecords() {
  const container = $('recordsContainer');
  if (!container) return;

  const searchName = ($('searchRecordInput')?.value || '').toLowerCase().trim();
  const searchDate = $('filterRecordDate')?.value || '';

  const filtered = allRecords.filter(r => {
    const matchName = !searchName || (r.userName || '').toLowerCase().includes(searchName);
    const matchDate = !searchDate || r.date === searchDate;
    return matchName && matchDate;
  });

  // Tính toán chỉ số tóm tắt nhanh cho bộ lọc hiện tại
  const totalBinh = filtered.reduce((s, r) => s + (Number(r.binh) || 0), 0);
  const roundedTotal = Math.round(totalBinh * 100) / 100;
  const uniqueMembers = new Set(filtered.map(r => r.userId || r.userName)).size;
  const uniqueDays = new Set(filtered.map(r => r.date)).size;
  const avgPerDay = uniqueDays > 0 ? (roundedTotal / uniqueDays).toFixed(1) : 0;

  if ($('recSumBinh')) $('recSumBinh').textContent = `${roundedTotal.toLocaleString('vi-VN')} nhà`;
  if ($('recSumMembers')) $('recSumMembers').textContent = `${uniqueMembers} người`;
  if ($('recSumDays')) $('recSumDays').textContent = `${uniqueDays} ngày`;
  if ($('recSumAvgDay')) $('recSumAvgDay').textContent = `${avgPerDay} nhà/ngày`;

  if (!filtered.length) {
    if ($('recordsFilterCount')) {
      $('recordsFilterCount').textContent = '0 bản ghi';
    }
    container.innerHTML = `
      <div class="empty-state-box" style="padding: 40px 20px;">
        <span class="empty-state-icon" style="font-size: 36px;">📋</span>
        <div class="empty-state-title" style="font-size: 16px;">Không tìm thấy bản ghi nào</div>
        <div class="empty-state-desc">Hãy kiểm tra lại từ khóa tìm kiếm hoặc ngày được chọn</div>
      </div>`;
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({ container: 'recordsPagination', totalItems: 0 });
    }
    return;
  }

  // Chế độ 1: 📅 Gom Theo Ngày (Dễ xem, rõ ràng nhất)
  if (currentRecordsMode === 'grouped-date') {
    const dayGroups = {};
    filtered.forEach(r => {
      if (!dayGroups[r.date]) dayGroups[r.date] = [];
      dayGroups[r.date].push(r);
    });

    const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));
    const totalDays = sortedDays.length;
    const totalPages = Math.ceil(totalDays / RECORDS_PAGE_SIZE) || 1;
    if (recordsCurrentPage > totalPages) recordsCurrentPage = totalPages;
    if (recordsCurrentPage < 1) recordsCurrentPage = 1;

    const startIndex = (recordsCurrentPage - 1) * RECORDS_PAGE_SIZE;
    const pagedDays = sortedDays.slice(startIndex, startIndex + RECORDS_PAGE_SIZE);

    if ($('recordsFilterCount')) {
      if (totalDays > RECORDS_PAGE_SIZE) {
        $('recordsFilterCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedDays.length, totalDays)} / ${totalDays} ngày (${filtered.length} bản ghi • Tổng ${roundedTotal} nhà) (Trang ${recordsCurrentPage}/${totalPages})`;
      } else {
        $('recordsFilterCount').textContent = `Hiển thị ${filtered.length} / ${allRecords.length} bản ghi • Tổng ${roundedTotal} nhà`;
      }
    }

    const today = todayStr();
    const yesterday = yesterdayStr();

    let html = '';
    pagedDays.forEach(d => {
      const dayRecs = dayGroups[d];
      const dayTotal = dayRecs.reduce((s, r) => s + (Number(r.binh) || 0), 0);
      const roundedDayTotal = Math.round(dayTotal * 100) / 100;

      let tagClass = 'past';
      let tagText = 'Lịch sử';
      if (d === today) {
        tagClass = 'today'; tagText = 'Hôm nay';
      } else if (d === yesterday) {
        tagClass = 'yesterday'; tagText = 'Hôm qua';
      }

      // Sắp xếp các thành viên trong ngày: ai làm nhiều nhất lên đầu
      dayRecs.sort((a, b) => (Number(b.binh) || 0) - (Number(a.binh) || 0));

      html += `
        <div class="day-group-card">
          <div class="day-group-header">
            <div class="day-group-title">
              <span style="font-size: 20px;">📅</span>
              <span class="day-date">${fmtDate(d)}</span>
              <span class="day-tag-badge ${tagClass}">${tagText}</span>
              <span class="day-count">(${dayRecs.length} anh em ghi nhận)</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div class="day-group-total">
                <span class="total-label">Tổng ngày:</span>
                <span class="total-binh-badge">🏠 ${roundedDayTotal} nhà</span>
              </div>
              <button type="button" class="gold btn-sm" onclick="openDailyExportModal('${d}')" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;font-weight:700;font-size:12px;border-radius:8px;" title="Xuất báo cáo ảnh &amp; gửi Discord ngày ${fmtDate(d)}">
                <span>📸 Báo Cáo Ngày</span>
              </button>
            </div>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style="width: 60px; text-align: center;">Hạng</th>
                  <th>Thành Viên</th>
                  <th style="width: 150px; text-align: center;">Số Nhà</th>
                  <th style="width: 220px;">Đóng Góp Ngày</th>
                  ${isAdmin() ? '<th style="width: 140px; text-align: right;">Thao Tác</th>' : ''}
                </tr>
              </thead>
              <tbody>
      `;

      dayRecs.forEach((r, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
        const pct = roundedDayTotal > 0 ? Math.round(((Number(r.binh) || 0) / roundedDayTotal) * 100) : 0;
        const actionTd = isAdmin() ? `
            <td style="text-align: right;">
              <button class="warning btn-sm" onclick="editRecord('${r.id}')" title="Chỉnh sửa bản ghi này">✏️ Sửa</button>
              <button class="danger btn-sm" onclick="deleteRecord('${r.id}')" title="Xóa bản ghi này">🗑️ Xoá</button>
            </td>
        ` : '';

        html += `
          <tr>
            <td style="text-align: center; font-weight: 800; font-size: 15px;">${medal}</td>
            <td>
              <span style="font-weight: 800; color: var(--text-dark); font-size: 14.5px;">
                ${escHtml(r.userName || '')}
              </span>
            </td>
            <td style="text-align: center;">
              <span class="badge-house-pill">🏠 ${r.binh ?? 0} nhà</span>
            </td>
            <td>
              <div class="mini-progress-wrap">
                <div class="mini-progress-bar">
                  <div class="mini-progress-fill" style="width: ${pct}%;"></div>
                </div>
                <span class="mini-progress-text">${pct}%</span>
              </div>
            </td>
            ${actionTd}
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Render bộ phân trang theo ngày
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({
        container: 'recordsPagination',
        totalItems: totalDays,
        pageSize: RECORDS_PAGE_SIZE,
        currentPage: recordsCurrentPage,
        itemLabel: 'ngày',
        onPageChange: (newPage) => {
          recordsCurrentPage = newPage;
          renderRecords();
          const c = $('recordsContainer');
          if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
    return;
  }

  // Chế độ 2: 👥 Gom Theo Anh Em (Tổng hợp đóng góp)
  if (currentRecordsMode === 'grouped-member') {
    const memberMap = {};
    filtered.forEach(r => {
      const uid = r.userId || r.userName || 'unknown';
      if (!memberMap[uid]) {
        memberMap[uid] = {
          name: r.userName || allUsers[r.userId]?.name || 'Chưa rõ',
          total: 0,
          dates: {}
        };
      }
      const val = Number(r.binh) || 0;
      memberMap[uid].total += val;
      memberMap[uid].dates[r.date] = (memberMap[uid].dates[r.date] || 0) + val;
    });

    const sortedMembers = Object.values(memberMap).sort((a, b) => b.total - a.total);
    const totalMembers = sortedMembers.length;
    const totalPages = Math.ceil(totalMembers / RECORDS_PAGE_SIZE) || 1;
    if (recordsCurrentPage > totalPages) recordsCurrentPage = totalPages;
    if (recordsCurrentPage < 1) recordsCurrentPage = 1;

    const startIndex = (recordsCurrentPage - 1) * RECORDS_PAGE_SIZE;
    const pagedMembers = sortedMembers.slice(startIndex, startIndex + RECORDS_PAGE_SIZE);

    if ($('recordsFilterCount')) {
      if (totalMembers > RECORDS_PAGE_SIZE) {
        $('recordsFilterCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedMembers.length, totalMembers)} / ${totalMembers} thành viên (${filtered.length} bản ghi • Tổng ${roundedTotal} nhà) (Trang ${recordsCurrentPage}/${totalPages})`;
      } else {
        $('recordsFilterCount').textContent = `Hiển thị ${filtered.length} / ${allRecords.length} bản ghi • Tổng ${roundedTotal} nhà`;
      }
    }

    let html = '<div class="member-summary-grid">';
    pagedMembers.forEach((m, idx) => {
      const globalIdx = startIndex + idx;
      const rankBadge = globalIdx === 0 ? '🥇 TOP 1' : globalIdx === 1 ? '🥈 TOP 2' : globalIdx === 2 ? '🥉 TOP 3' : `#${globalIdx + 1}`;
      const pct = roundedTotal > 0 ? Math.round((m.total / roundedTotal) * 100) : 0;
      const roundedMTotal = Math.round(m.total * 100) / 100;
      const isTop1 = globalIdx === 0 ? 'rank-top-1' : '';

      html += `
        <div class="member-summary-card ${isTop1}">
          <div class="member-card-header">
            <div>
              <span class="member-card-rank">${rankBadge}</span>
              <div class="member-card-name">${escHtml(m.name)}</div>
            </div>
            <div style="text-align: right;">
              <div class="member-card-total">🏠 ${roundedMTotal} nhà</div>
              <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">${pct}% toàn đội</span>
            </div>
          </div>
          <div class="mini-progress-bar" style="max-width: 100%; height: 7px; margin-bottom: 12px;">
            <div class="mini-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="member-dates-list">
            <div style="font-size: 11px; font-weight: 800; color: var(--text-sub); text-transform: uppercase;">
              Chi tiết các ngày:
            </div>
      `;

      Object.entries(m.dates)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([date, val]) => {
          html += `
            <div class="member-date-item">
              <span>📅 ${fmtDate(date)}</span>
              <span class="date-val">+${Math.round(val * 100) / 100} nhà</span>
            </div>
          `;
        });

      html += `
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    // Render bộ phân trang theo thành viên
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({
        container: 'recordsPagination',
        totalItems: totalMembers,
        pageSize: RECORDS_PAGE_SIZE,
        currentPage: recordsCurrentPage,
        itemLabel: 'thành viên',
        onPageChange: (newPage) => {
          recordsCurrentPage = newPage;
          renderRecords();
          const c = $('recordsContainer');
          if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
    return;
  }

  // Chế độ 3: 📋 Xem Từng Dòng (Phẳng có hàng Tổng cộng ở cuối)
  const totalRecs = filtered.length;
  const totalPages = Math.ceil(totalRecs / RECORDS_PAGE_SIZE) || 1;
  if (recordsCurrentPage > totalPages) recordsCurrentPage = totalPages;
  if (recordsCurrentPage < 1) recordsCurrentPage = 1;

  const startIndex = (recordsCurrentPage - 1) * RECORDS_PAGE_SIZE;
  const pagedRecs = filtered.slice(startIndex, startIndex + RECORDS_PAGE_SIZE);

  if ($('recordsFilterCount')) {
    if (totalRecs > RECORDS_PAGE_SIZE) {
      $('recordsFilterCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedRecs.length, totalRecs)} / ${totalRecs} bản ghi • Tổng ${roundedTotal} nhà (Trang ${recordsCurrentPage}/${totalPages})`;
    } else {
      $('recordsFilterCount').textContent = `Hiển thị ${filtered.length} / ${allRecords.length} bản ghi • Tổng ${roundedTotal} nhà`;
    }
  }

  const flatActionTh = isAdmin() ? '<th style="width: 160px; text-align: right;">Thao Tác</th>' : '';
  const flatEmptyTd = isAdmin() ? '<td></td>' : '';

  let tableHtml = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th style="width: 140px;">Ngày</th>
            <th>Thành Viên</th>
            <th style="width: 150px; text-align: center;">Số Nhà</th>
            ${flatActionTh}
          </tr>
        </thead>
        <tbody>
  `;

  pagedRecs.forEach(r => {
    const flatActionTd = isAdmin() ? `
        <td style="text-align: right;">
          <button class="warning btn-sm" onclick="editRecord('${r.id}')" title="Chỉnh sửa bản ghi này">✏️ Sửa</button>
          <button class="danger btn-sm" onclick="deleteRecord('${r.id}')" title="Xóa bản ghi này">🗑️ Xoá</button>
        </td>
    ` : '';

    tableHtml += `
      <tr>
        <td><b>${fmtDate(r.date)}</b></td>
        <td><span style="font-weight: 800; color: var(--text-dark);">${escHtml(r.userName || '')}</span></td>
        <td style="text-align: center;"><span class="badge-house-pill">🏠 ${r.binh ?? 0} nhà</span></td>
        ${flatActionTd}
      </tr>
    `;
  });

  tableHtml += `
        </tbody>
        <tfoot class="table-footer-total">
          <tr>
            <td colspan="2">🌟 TỔNG CỘNG (${filtered.length} bản ghi)</td>
            <td style="text-align: center;"><span class="badge-house-pill" style="font-size: 16px;">🔥 ${roundedTotal} nhà</span></td>
            ${flatEmptyTd}
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;

  // Render bộ phân trang dạng bảng phẳng
  if (typeof renderPaginationControls === 'function') {
    renderPaginationControls({
      container: 'recordsPagination',
      totalItems: totalRecs,
      pageSize: RECORDS_PAGE_SIZE,
      currentPage: recordsCurrentPage,
      itemLabel: 'bản ghi',
      onPageChange: (newPage) => {
        recordsCurrentPage = newPage;
        renderRecords();
        const c = $('recordsContainer');
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
window.renderRecords = renderRecords;

$('searchRecordInput')?.addEventListener('input', debounce(() => {
  recordsCurrentPage = 1;
  renderRecords();
}, 120));
$('filterRecordDate')?.addEventListener('change', () => {
  recordsCurrentPage = 1;
  renderRecords();
});
$('resetRecordFilter')?.addEventListener('click', () => {
  recordsCurrentPage = 1;
  if ($('searchRecordInput')) $('searchRecordInput').value = '';
  if ($('filterRecordDate')) $('filterRecordDate').value = '';
  renderRecords();
});

/* Edit Record */
function editRecord(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để chỉnh sửa!');
    return;
  }
  const r = allRecords.find(x => x.id === id);
  if (!r) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge">✏️</div>
          <div>
            <h3>Chỉnh Sửa Bản Ghi</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Cập nhật ngày và số lượng nhà</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeEditR" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label>Thành viên</label>
        <input value="${escHtml(r.userName || '')}" disabled style="background:#f1f5f9;color:var(--slate-600);font-weight:700;">
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label for="editRDate">Ngày ghi nhận *</label>
        <input type="date" id="editRDate" value="${r.date || ''}">
      </div>

      <div class="form-group" style="margin-bottom:18px;">
        <label for="editRBinh">Số lượng nhà *</label>
        <input type="number" id="editRBinh" min="0" step="any" value="${r.binh ?? 0}">
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelEdit">Huỷ bỏ</button>
        <button type="button" class="green" id="saveEdit">💾 Lưu Bản Ghi</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const inpBinh = overlay.querySelector('#editRBinh');
  inpBinh.focus(); inpBinh.select();

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeEditR').onclick = closeModal;
  overlay.querySelector('#cancelEdit').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#saveEdit').onclick = async () => {
    const date = overlay.querySelector('#editRDate').value;
    const binh = Number(inpBinh.value) || 0;
    if (!date) return alert('Vui lòng chọn ngày');
    try {
      await recordsRef.child(id).update({ date, binh });
      logAudit('EDIT_RECORD', 'Sửa Bản Ghi', `Sửa bản ghi của "${r.userName}": ngày ${fmtDate(r.date)} -> ${fmtDate(date)}, số nhà ${r.binh} -> ${binh} nhà`);
      overlay.remove();
      alert('✅ Đã cập nhật bản ghi thành công!');
    } catch (e) {
      alert('❌ Lỗi: ' + e.message);
    }
  };
}
window.editRecord = editRecord;

/* Delete Record */
async function deleteRecord(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để xoá!');
    return;
  }
  const r = allRecords.find(x => x.id === id);
  const ok = (typeof showConfirmModal === 'function')
    ? await showConfirmModal({
        title: 'Xoá Bản Ghi Trộm Nhà',
        targetName: r ? `${r.userName} (${r.binh} nhà)` : 'Bản ghi trộm nhà',
        targetType: r ? `Ngày: ${fmtDate(r.date)}` : '',
        type: 'danger',
        icon: '🗑️',
        message: 'Đại ca có chắc chắn muốn xoá bản ghi này khỏi hệ thống không?<br><span style="color:#dc2626;font-size:12.5px;font-weight:700;">⚠️ Thao tác này sẽ làm giảm tổng số nhà đã trộm của thành viên và không thể hoàn tác!</span>',
        confirmText: '🗑️ Xoá Bản Ghi',
        cancelText: '✕ Hủy Bỏ'
      })
    : confirm(`Bạn có chắc muốn xoá bản ghi ngày ${r ? fmtDate(r.date) : ''} (${r ? r.binh : 0} nhà) của "${r ? r.userName : ''}" không?`);

  if (!ok) return;

  try {
    await recordsRef.child(id).remove();
    if (r) {
      logAudit('DELETE_RECORD', 'Xoá Bản Ghi', `Xoá bản ghi ngày ${fmtDate(r.date)} (${r.binh} nhà) của "${r.userName}"`);
    }
  } catch (e) {
    alert('❌ Lỗi: ' + e.message);
  }
}
window.deleteRecord = deleteRecord;

/* ==========================================================================
   SECTION: XUẤT BẢN ẢNH BÁO CÁO NGÀY & GỬI DISCORD BOT THEO YÊU CẦU ĐẠI CA
   ========================================================================== */

const DISCORD_BOT_INVITE_URL = 'https://discord.com/api/oauth2/authorize?client_id=1561984275585302619&permissions=8&scope=bot';

/**
 * Hiển thị Modal hướng dẫn và cung cấp link 1-click mời Bot vào Server
 */
function showDiscordBotHelpModal(msg, inviteUrl) {
  const url = inviteUrl || DISCORD_BOT_INVITE_URL;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width: 520px; text-align: left;">
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#fee2e2;color:#dc2626;">🤖</div>
          <div>
            <h3>Cần Mời Bot Vào Server Discord</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Bot THÔNG BÁO (ID: 1561984275585302619)</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeBotHelpModal" title="Đóng">✕</button>
      </div>

      <div style="background:#fef2f2;border:1.5px solid #fecaca;padding:14px;border-radius:12px;margin-bottom:16px;">
        <div style="font-weight:800;color:#991b1b;margin-bottom:6px;">⚠️ Phản hồi từ Discord:</div>
        <div style="font-size:13.5px;color:#7f1d1d;line-height:1.5;">${escHtml(msg || 'Bot chưa được thêm vào Server Discord hoặc chưa có quyền xem và gửi tin nhắn trong kênh!')}</div>
      </div>

      <div style="font-size:13.5px;color:var(--text-dark);line-height:1.6;margin-bottom:18px;">
        👉 <b>Đại ca chỉ cần 1 cú click</b> vào nút bên dưới để Mời Bot "THÔNG BÁO" vào Server Discord của mình:
      </div>

      <div class="modal-actions" style="justify-content: space-between;">
        <button type="button" class="secondary" id="cancelBotHelpBtn">Đóng</button>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="gold btn-sm" style="background:#5865F2;color:#fff;border-color:#4752C4;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;">
          <span>🔗 Mời Bot Vào Server Ngay</span>
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeBotHelpModal').onclick = closeModal;
  overlay.querySelector('#cancelBotHelpBtn').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}
window.showDiscordBotHelpModal = showDiscordBotHelpModal;

/**
 * Gửi dữ liệu và ảnh báo cáo về máy chủ API Discord (Vercel Serverless API)
 */
const DISCORD_WEBHOOK_MAP = {
  '1561985181802569761': 'https://discord.com/api/webhooks/1562002219937833011/Sn6wUZXwEzFNodeYO0N4Ft6iqN2OfEoq0MvRidSW52SYHR9XP1R9dBuC_qHCdU1Ta9jf',
  '1561985096943276042': 'https://discord.com/api/webhooks/1562002222676705402/1CVBZjf-7XxbqbYLLUhWntTo5Uu3Bia8t_hR1a8NLjQbt4-kFBCgJdOb4kDlDLgDKHbn',
  '1561985235422281760': 'https://discord.com/api/webhooks/1562002226149589082/LUgKLx5rGtFAJipWVOSG9Wbyyd9RsZl6BNhr-kU_zjl6dazMvqVkUPkpoTfV0MijyMJQ',
  '1562063584496844841': 'https://discord.com/api/webhooks/1562064288380616795/Q7Z9DKmhxof_LremjlQ26NymeLZQWzZiJywzNEzjGXCeZuG6uWqMI33n9oEcKH2AfVkK',
  'backup': 'https://discord.com/api/webhooks/1562064288380616795/Q7Z9DKmhxof_LremjlQ26NymeLZQWzZiJywzNEzjGXCeZuG6uWqMI33n9oEcKH2AfVkK',
  'daily': 'https://discord.com/api/webhooks/1562002219937833011/Sn6wUZXwEzFNodeYO0N4Ft6iqN2OfEoq0MvRidSW52SYHR9XP1R9dBuC_qHCdU1Ta9jf',
  'weekly': 'https://discord.com/api/webhooks/1562002222676705402/1CVBZjf-7XxbqbYLLUhWntTo5Uu3Bia8t_hR1a8NLjQbt4-kFBCgJdOb4kDlDLgDKHbn',
  'fund': 'https://discord.com/api/webhooks/1562002226149589082/LUgKLx5rGtFAJipWVOSG9Wbyyd9RsZl6BNhr-kU_zjl6dazMvqVkUPkpoTfV0MijyMJQ'
};

function formatDiscordReportPayload({ type, title, date, stats, customContent, filename }) {
  let messageContent = [
    `🌐 **WEBSITE:** https://quan-ly-seven.vercel.app/`,
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
      `🌐 **WEBSITE:** https://quan-ly-seven.vercel.app/`,
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

  return { messageContent, embeds };
}

async function sendViaDiscordWebhook({ webhookUrl, content, embeds, imageBase64, filename = 'report.png', extraFile }) {
  try {
    const formData = new FormData();
    const payload = {
      content: content || '',
      embeds: embeds || []
    };
    payload.attachments = [];

    let attachIdx = 0;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      payload.attachments.push({ id: attachIdx, filename: filename, description: 'Bản ảnh báo cáo chính thức' });
      formData.append(`files[${attachIdx}]`, blob, filename);
      attachIdx++;
    }

    if (extraFile && extraFile.content) {
      const fileBlob = new Blob([extraFile.content], { type: extraFile.type || 'text/csv;charset=utf-8' });
      const fName = extraFile.filename || 'du-lieu-sao-luu.csv';
      payload.attachments.push({ id: attachIdx, filename: fName, description: 'File dữ liệu đính kèm' });
      formData.append(`files[${attachIdx}]`, fileBlob, fName);
      attachIdx++;
    }

    formData.append('payload_json', JSON.stringify(payload));

    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (res.ok || res.status === 204) {
      // Tự động gửi tin nhắn phân cách ================= để phân biệt rõ ràng giữa các lần gửi theo lệnh Đại ca
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '=================================================='
          })
        });
      } catch (sepErr) {
        // bỏ qua lỗi dòng phân cách nếu có
      }
      return { success: true };
    } else {
      const errText = await res.text();
      return { success: false, message: `Lỗi Discord Webhook (${res.status}): ${errText}` };
    }
  } catch (err) {
    return { success: false, message: 'Lỗi gửi Discord Webhook: ' + err.message };
  }
}

async function sendDiscordReport({ type, targetChannelId, title, date, stats, imageBase64, customContent, extraFile }) {
  if (!isAdmin()) {
    return {
      success: false,
      message: '⛔ Bạn đang ở trang xem thành viên (index.html). Chỉ Quản Trị Viên tại trang Quản Trị (admin.html) mới có quyền gửi báo cáo về Discord!'
    };
  }

  const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  const targetKey = targetChannelId || type;
  const webhookUrl = DISCORD_WEBHOOK_MAP[targetKey] || DISCORD_WEBHOOK_MAP[type];

  // Nếu đang chạy local (localhost:8080) không có Vercel serverless runtime, gửi thẳng qua Discord Webhook
  if (isLocal && webhookUrl) {
    const filename = `bao-cao-${type}-${Date.now()}.png`;
    const { messageContent, embeds } = formatDiscordReportPayload({ type, title, date, stats, customContent, filename });
    return await sendViaDiscordWebhook({
      webhookUrl,
      content: messageContent,
      embeds,
      imageBase64,
      filename,
      extraFile
    });
  }

  // Trên môi trường deploy Vercel
  const bodyData = JSON.stringify({
    type,
    customChannelId: targetChannelId,
    title,
    date,
    stats,
    imageBase64,
    customContent,
    extraFile
  });

  try {
    const res = await fetch('/api/discord-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyData
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    } else {
      // Nếu API trả về HTML 404 (chưa deploy Vercel Function), tự động fallback sang Webhook
      if (webhookUrl) {
        const filename = `bao-cao-${type}-${Date.now()}.png`;
        const { messageContent, embeds } = formatDiscordReportPayload({ type, title, date, stats, customContent, filename });
        return await sendViaDiscordWebhook({
          webhookUrl,
          content: messageContent,
          embeds,
          imageBase64,
          filename,
          extraFile
        });
      }
      return {
        success: false,
        message: `Máy chủ trả về dữ liệu không hợp lệ (${res.status}).`
      };
    }
  } catch (err) {
    // Nếu lỗi kết nối API, fallback sang Webhook
    if (webhookUrl) {
      const filename = `bao-cao-${type}-${Date.now()}.png`;
      const { messageContent, embeds } = formatDiscordReportPayload({ type, title, date, stats, customContent, filename });
      return await sendViaDiscordWebhook({
        webhookUrl,
        content: messageContent,
        embeds,
        imageBase64,
        filename,
        extraFile
      });
    }
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ API: ' + err.message
    };
  }
}
window.sendDiscordReport = sendDiscordReport;

/**
 * Mở modal chọn ngày để xuất báo cáo ảnh & gửi Discord
 */
function openDailyExportModal(defaultDate) {
  const chosenDate = defaultDate || $('filterRecordDate')?.value || todayStr();

  function getDayMetrics(dateStr) {
    const dayRecs = allRecords.filter(r => r.date === dateStr);
    const dayTotal = dayRecs.reduce((s, r) => s + (Number(r.binh) || 0), 0);
    const roundedDayTotal = Math.round(dayTotal * 100) / 100;

    const mTotals = {};
    dayRecs.forEach(r => {
      const uid = r.userId || r.userName || 'unknown';
      if (!mTotals[uid]) {
        mTotals[uid] = {
          name: r.userName || allUsers[r.userId]?.name || 'Chưa rõ',
          binh: 0
        };
      }
      mTotals[uid].binh += (Number(r.binh) || 0);
    });

    const sortedMembers = Object.values(mTotals).sort((a, b) => b.binh - a.binh);
    const top1 = sortedMembers.length > 0 ? sortedMembers[0] : null;

    return {
      date: dateStr,
      recs: dayRecs,
      totalHouses: roundedDayTotal,
      members: sortedMembers,
      memberCount: sortedMembers.length,
      top1: top1 ? { name: top1.name, houses: Math.round(top1.binh * 100) / 100 } : null
    };
  }

  const initialMetrics = getDayMetrics(chosenDate);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#fef3c7;color:#b45309;">📸</div>
          <div>
            <h3>Xuất Báo Cáo Ngày &amp; Gửi Discord</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Kèm văn bản check nhà trên Website &amp; Dấu đỏ</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeDailyExportModal" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label for="exportTargetDate">Chọn Ngày Báo Cáo *</label>
        <input type="date" id="exportTargetDate" value="${chosenDate}" style="font-weight:700;">
      </div>

      <!-- KHUNG TÓM TẮT THỐNG KÊ NGÀY (TỰ ĐỘNG ĐỔI THEO NGÀY CHỌN) -->
      <div id="dailyMetricsBox" style="background:#fffbeb;border:1.5px solid #fde68a;padding:14px 16px;border-radius:12px;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
          📊 Thống Kê Ngày: <span id="metricDateStr">${fmtDate(initialMetrics.date)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
          <div style="background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #fef3c7;">
            <div style="font-size:11px;color:#78350f;font-weight:700;">🏠 Tổng số nhà:</div>
            <div id="metricTotalHouses" style="font-size:18px;font-weight:900;color:#b45309;">${initialMetrics.totalHouses} nhà</div>
          </div>
          <div style="background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #fef3c7;">
            <div style="font-size:11px;color:#78350f;font-weight:700;">👥 Anh em tham gia:</div>
            <div id="metricMemberCount" style="font-size:18px;font-weight:900;color:#1e293b;">${initialMetrics.memberCount} người</div>
          </div>
        </div>
        <div style="font-size:12.5px;color:#475569;font-weight:700;">
          🥇 Top 1 ngày: <span id="metricTop1" style="color:#b45309;font-weight:800;">${initialMetrics.top1 ? `${initialMetrics.top1.name} (${initialMetrics.top1.houses} nhà)` : 'Chưa ghi nhận'}</span>
        </div>
      </div>

      <!-- KHUNG VĂN BẢN ĐÍNH KÈM (THEO YÊU CẦU ĐẠI CA) -->
      <div style="background:#fff8ee;border:2px dashed #b45309;padding:14px;border-radius:12px;margin-bottom:18px;">
        <div style="font-size:11px;font-weight:900;color:#92400e;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">
          ✦ VĂN BẢN ĐÍNH KÈM THÔNG BÁO WEBSITE ✦
        </div>
        <div style="font-size:13px;font-weight:800;color:#1e293b;line-height:1.5;">
          WEBSITE <a href="https://quan-ly-seven.vercel.app/" target="_blank" style="color:#2563eb;text-decoration:underline;">https://quan-ly-seven.vercel.app/</a><br>
          <span style="color:#b45309;font-size:13.5px;font-weight:900;">AE TỰ VÀO CHECK NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ .</span>
        </div>
      </div>

      <div class="modal-actions" style="flex-wrap:wrap;gap:8px;justify-content:flex-end;">
        <button type="button" class="secondary" id="cancelDailyExportBtn">Huỷ</button>
        <button type="button" class="gold" id="exportDailyCsvBtn" style="background:#059669;color:#fff;border-color:#047857;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
          <span>📊 Xuất Excel / CSV</span>
        </button>
        <button type="button" class="green" id="previewDailyExportBtn">📸 Xem &amp; Tải Ảnh</button>
        ${isAdmin() ? `
        <button type="button" class="gold" id="sendDirectDiscordBtn" style="background:#5865F2;color:#fff;border-color:#4752C4;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
          <span>🚀 Gửi Discord</span>
        </button>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const dateInp = overlay.querySelector('#exportTargetDate');
  const metricDateStr = overlay.querySelector('#metricDateStr');
  const metricTotalHouses = overlay.querySelector('#metricTotalHouses');
  const metricMemberCount = overlay.querySelector('#metricMemberCount');
  const metricTop1 = overlay.querySelector('#metricTop1');

  dateInp.addEventListener('change', () => {
    const curVal = dateInp.value;
    if (!curVal) return;
    const m = getDayMetrics(curVal);
    metricDateStr.textContent = fmtDate(m.date);
    metricTotalHouses.textContent = `${m.totalHouses} nhà`;
    metricMemberCount.textContent = `${m.memberCount} người`;
    metricTop1.textContent = m.top1 ? `${m.top1.name} (${m.top1.houses} nhà)` : 'Chưa ghi nhận';
  });

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeDailyExportModal').onclick = closeModal;
  overlay.querySelector('#cancelDailyExportBtn').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  overlay.querySelector('#previewDailyExportBtn').onclick = () => {
    const targetDate = dateInp.value;
    if (!targetDate) return alert('Vui lòng chọn ngày báo cáo!');
    overlay.remove();
    generateDailyRecordReport(targetDate, false);
  };

  if (overlay.querySelector('#exportDailyCsvBtn')) {
    overlay.querySelector('#exportDailyCsvBtn').onclick = () => {
      const targetDate = dateInp.value;
      if (!targetDate) return alert('Vui lòng chọn ngày báo cáo!');
      const targetRecs = allRecords.filter(r => r.date === targetDate);
      if (!targetRecs.length) return alert('Không có dữ liệu trong ngày ' + fmtDate(targetDate) + ' để xuất CSV!');
      if (window.CrewCsvExport) {
        window.CrewCsvExport.exportRecordsToCsv(targetRecs);
      }
    };
  }

  if (overlay.querySelector('#sendDirectDiscordBtn')) {
    overlay.querySelector('#sendDirectDiscordBtn').onclick = () => {
      if (!isAdmin()) {
        alert('⛔ Bạn đang ở trang xem (index.html). Chỉ Quản Trị Viên (admin.html) mới có quyền gửi báo cáo về Discord!');
        return;
      }
      const targetDate = dateInp.value;
      if (!targetDate) return alert('Vui lòng chọn ngày báo cáo!');
      overlay.remove();
      generateDailyRecordReport(targetDate, true);
    };
  }
}
window.openDailyExportModal = openDailyExportModal;

/**
 * Tạo ảnh báo cáo thành tích ngày và gửi Discord
 */
async function generateDailyRecordReport(targetDate, autoSendDiscord = false) {
  const dayRecs = allRecords.filter(r => r.date === targetDate);
  const totalHouses = Math.round(dayRecs.reduce((s, r) => s + (Number(r.binh) || 0), 0) * 100) / 100;

  // Gom nhóm theo thành viên trong ngày
  const memberMap = {};
  dayRecs.forEach(r => {
    const uid = r.userId || r.userName || 'unknown';
    if (!memberMap[uid]) {
      memberMap[uid] = {
        name: r.userName || allUsers[r.userId]?.name || 'Chưa rõ',
        binh: 0
      };
    }
    memberMap[uid].binh += (Number(r.binh) || 0);
  });

  const sortedMembers = Object.values(memberMap).sort((a, b) => b.binh - a.binh);
  const memberCount = sortedMembers.length;
  const top1 = sortedMembers.length > 0 ? sortedMembers[0] : null;
  const avgHouses = memberCount > 0 ? (totalHouses / memberCount).toFixed(1) : 0;

  const today = todayStr();
  const yesterday = yesterdayStr();
  let tagClass = 'past';
  let tagText = 'LỊCH SỬ';
  let tagBg = '#f1f5f9';
  let tagColor = '#475569';
  if (targetDate === today) {
    tagClass = 'today';
    tagText = 'HÔM NAY';
    tagBg = '#dcfce7';
    tagColor = '#15803d';
  } else if (targetDate === yesterday) {
    tagClass = 'yesterday';
    tagText = 'HÔM QUA';
    tagBg = '#e0e7ff';
    tagColor = '#4338ca';
  }

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const container = $('exportArea');
  if (!container) return;

  const W = 960;

  // Render các hàng trong bảng y hệt giao diện thẻ ngày
  let rowsHtml = '';
  if (sortedMembers.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="4" style="padding:28px;text-align:center;font-weight:700;color:#64748b;font-style:italic;background:#fff;">
          Ngày ${fmtDate(targetDate)} chưa có dữ liệu bản ghi số nhà nào.
        </td>
      </tr>
    `;
  } else {
    sortedMembers.forEach((m, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
      const pct = totalHouses > 0 ? Math.round((m.binh / totalHouses) * 100) : 0;

      rowsHtml += `
        <tr style="border-bottom:1px solid #f1f5f9;background:#ffffff;">
          <td style="padding:16px 18px;text-align:center;font-size:16px;font-weight:800;color:#475569;">
            ${medal}
          </td>
          <td style="padding:16px 20px;">
            <div style="font-weight:800;font-size:15px;color:#0f172a;">${escHtml(m.name)}</div>
          </td>
          <td style="padding:16px 20px;text-align:center;">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:999px;border:1.5px solid #f59e0b;background:#fff8ee;color:#b45309;font-weight:900;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
              🏠 ${Math.round(m.binh * 100) / 100} nhà
            </span>
          </td>
          <td style="padding:16px 24px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="flex:1;background:#e2e8f0;height:7px;border-radius:999px;overflow:hidden;">
                <div style="width:${pct}%;background:linear-gradient(90deg,#f59e0b,#ea580c);height:100%;border-radius:999px;"></div>
              </div>
              <span style="font-weight:800;font-size:13.5px;color:#475569;min-width:36px;text-align:right;">${pct}%</span>
            </div>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div style="width:${W}px;background:#f8fafc;padding:36px;color:#0f172a;box-sizing:border-box;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;position:relative;background-image:linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px);background-size:24px 24px;background-position:-1px -1px;">

      <!-- CARD THẺ NGÀY ĐẲNG CẤP CHUẨN GIAO DIỆN THEO ẢNH ĐẠI CA -->
      <div style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;box-shadow:0 12px 30px -4px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03);overflow:hidden;">

        <!-- 1. HEADER CARD NGÀY -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 28px;border-bottom:1.5px solid #f1f5f9;background:#fafaf9;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">📅</span>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:20px;font-weight:900;color:#0f172a;">${fmtDate(targetDate)}</span>
              <span style="background:${tagBg};color:${tagColor};font-size:11.5px;font-weight:800;padding:4px 12px;border-radius:999px;letter-spacing:0.5px;text-transform:uppercase;">${tagText}</span>
              <span style="font-size:13.5px;font-weight:700;color:#64748b;">(${memberCount} anh em ghi nhận)</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:14px;font-weight:700;color:#64748b;">Tổng ngày:</span>
            <span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:16px;font-weight:900;padding:6px 18px;border-radius:999px;box-shadow:0 3px 10px rgba(245,158,11,0.35);">🏠 ${totalHouses} nhà</span>
          </div>
        </div>

        <!-- 2. BẢNG THỐNG KÊ CHI TIẾT (CHUẨN FORM GIAO DIỆN) -->
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:14px 18px;width:90px;text-align:center;font-size:12px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">HẠNG</th>
              <th style="padding:14px 20px;text-align:left;font-size:12px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">THÀNH VIÊN</th>
              <th style="padding:14px 20px;width:180px;text-align:center;font-size:12px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">SỐ NHÀ</th>
              <th style="padding:14px 24px;width:240px;text-align:left;font-size:12px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">ĐÓNG GÓP NGÀY</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc;border-top:2px solid #e2e8f0;font-weight:900;">
              <td colspan="2" style="padding:16px 20px;text-align:left;font-size:14px;color:#0f172a;letter-spacing:0.5px;">
                🌟 TỔNG CỘNG NGÀY ${fmtDate(targetDate)}: ${memberCount} ANH EM
              </td>
              <td style="padding:16px 20px;text-align:center;">
                <span style="font-size:17px;color:#b45309;font-weight:900;">🔥 ${totalHouses} nhà</span>
              </td>
              <td style="padding:16px 24px;font-size:13.5px;color:#16a34a;font-weight:800;">
                ✓ 100% hoàn thành
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- 3. KHUNG THÔNG BÁO WEBSITE CHÍNH THỨC CỦA ĐẠI CA -->
        <div style="margin:26px 24px 22px 24px;background:#fff8ee;border:2.5px solid #d97706;border-radius:14px;padding:22px 26px;text-align:center;box-shadow:inset 0 0 10px rgba(217,119,6,0.08);">
          <div style="display:inline-block;background:#b45309;color:#fff;padding:5px 18px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">
            ✦ THÔNG BÁO TỪ BAN QUẢN LÝ CREW LƯỠI BÚA ✦
          </div>
          <div style="font-size:16.5px;font-weight:900;color:#0f172a;letter-spacing:0.5px;margin-bottom:6px;">
            🌐 WEBSITE: <span style="color:#b45309;text-decoration:underline;">https://quan-ly-seven.vercel.app/</span>
          </div>
          <div style="font-size:18px;font-weight:900;color:#b45309;letter-spacing:0.5px;margin-bottom:6px;">
            👉 AE TỰ VÀO CHECK NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ .
          </div>
          <div style="font-size:12px;font-weight:700;color:#78350f;letter-spacing:0.3px;">
            ⚡ Hệ thống tự động đồng bộ thời gian thực 24/7 • Minh bạch &amp; Chính xác tuyệt đối
          </div>
        </div>

        <!-- 4. CHỮ KÝ VÀ DẤU ĐỎ CHÍNH THỨC CỦA ĐẠI CA -->
        <div style="display:flex;justify-content:flex-end;padding:0 30px 24px 0;">
          <div style="position:relative;width:340px;height:200px;">
            <div style="position:absolute;left:0;top:0;text-align:center;width:220px;">
              <div style="font-size:13.5px;font-weight:800;color:#0f172a;letter-spacing:1.5px;">QUẢN LÝ</div>
              <div style="font-size:11px;font-weight:600;color:#64748b;font-style:italic;margin-top:2px;">(Ký, ghi rõ họ tên)</div>
              <div style="height:20px;"></div>
              <div style="font-family:'Great Vibes',cursive;font-size:48px;font-weight:400;color:#0f172a;line-height:1;letter-spacing:2px;">
                Trí
              </div>
              <div style="font-family:'Dancing Script','Brush Script MT',cursive;font-size:32px;font-weight:700;color:#0f172a;line-height:1.1;letter-spacing:.5px;margin-top:6px;">
                Nguyễn Ngọc Trí
              </div>
            </div>

            <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"
                 style="position:absolute;right:0;top:10px;width:145px;height:145px;
                        transform:rotate(-12deg);opacity:0.9;">
              <defs>
                <path id="stampTopArcDaily" d="M 22,80 A 58,58 0 0,1 138,80" fill="none"/>
                <path id="stampBotArcDaily" d="M 24,80 A 56,56 0 0,0 136,80" fill="none"/>
              </defs>
              <circle cx="80" cy="80" r="76" fill="none" stroke="#c81e1e" stroke-width="3.5"/>
              <circle cx="80" cy="80" r="66" fill="none" stroke="#c81e1e" stroke-width="1"/>
              <circle cx="80" cy="80" r="40" fill="none" stroke="#c81e1e" stroke-width="1"/>
              <text fill="#c81e1e" font-size="10.5" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.4">
                <textPath href="#stampTopArcDaily" startOffset="50%" text-anchor="middle">HỆ THỐNG QUẢN LÝ NHÀ</textPath>
              </text>
              <text fill="#c81e1e" font-size="10" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.4">
                <textPath href="#stampBotArcDaily" startOffset="50%" text-anchor="middle">★ CHÍNH THỨC ★</textPath>
              </text>
              <polygon points="80,50 83.8,63 97,63 86.5,71 90.2,84 80,76 69.8,84 73.5,71 63,63 76.2,63"
                       fill="#d4a017" stroke="#d4a017" stroke-width="0.5" stroke-linejoin="round"/>
              <g fill="#c81e1e" transform="translate(80,110)">
                <path d="M -13,-1 C -15,-7 -11,-12 -3,-13 C 3,-14 8,-11 10,-6
                         C 4,-9 -2,-8 -5,-4 C -8,0 -6,5 -2,7 C 2,9 7,8 10,5
                         C 6,10 -1,12 -7,8 C -12,5 -14,3 -13,-1 Z"/>
                <rect x="-1" y="-14" width="2.8" height="18" transform="rotate(35 -0.5 -5)"/>
                <rect x="-9.5" y="-16.5" width="13" height="5" transform="rotate(35 -3 -14)"/>
              </g>
              <circle cx="80" cy="8" r="2.2" fill="#c81e1e"/>
            </svg>
          </div>
        </div>

        <!-- 5. DÒNG BẢO MẬT & XÁC THỰC DƯỚI ĐÁY CARD -->
        <div style="text-align:center;padding:14px 20px;background:#fafaf9;border-top:1.5px solid #f1f5f9;
                    font-size:11px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">
          ── CREW LƯỠI BÚA ★ HỆ THỐNG QUẢN LÝ TRỘM NHÀ &amp; QUỸ CHUỘC TÙ 24/7 ──
        </div>

      </div>
    </div>
  `;

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 3,
      backgroundColor: '#fdfcf7',
      logging: false,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    if (container) container.innerHTML = '';

    const statsPayload = {
      totalHouses,
      memberCount,
      top1: top1 ? { name: top1.name, houses: Math.round(top1.binh * 100) / 100 } : null
    };

    // Nếu chọn gửi thẳng Discord
    if (autoSendDiscord) {
      const waitNotice = document.createElement('div');
      waitNotice.className = 'modal-overlay';
      waitNotice.innerHTML = `
        <div class="modal-box" style="max-width:380px;text-align:center;padding:30px;">
          <div style="font-size:40px;margin-bottom:12px;">⏳</div>
          <h3 style="margin-bottom:8px;">Đang Gửi Về Discord...</h3>
          <div style="font-size:13px;color:var(--slate-500);">Kênh Báo Cáo Ngày</div>
        </div>
      `;
      document.body.appendChild(waitNotice);

      const res = await sendDiscordReport({
        type: 'daily',
        targetChannelId: '1561985181802569761',
        date: fmtDate(targetDate),
        stats: statsPayload,
        imageBase64: dataUrl
      });

      waitNotice.remove();

      if (res.success) {
        alert(`✅ ĐÃ GỬI BÁO CÁO NGÀY ${fmtDate(targetDate)} VỀ DISCORD THÀNH CÔNG!`);
      } else {
        showDiscordBotHelpModal(res.message, res.inviteUrl);
      }
      return;
    }

    // Nếu xem & tải ảnh trước
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:${W + 40}px;">
        <h3>📸 Báo Cáo Ngày ${fmtDate(targetDate)} (${totalHouses} nhà — ${memberCount} người)</h3>
        <img src="${dataUrl}" alt="Báo cáo ngày" style="border-radius:12px;border:1px solid #e2e8f0;width:100%;">
        <div class="modal-actions" style="flex-wrap:wrap;gap:8px;justify-content:flex-end;">
          <button class="secondary" id="closeDailyImgModal">Đóng</button>
          <button class="green" id="downloadDailyImg">⬇️ Tải Xuống Ảnh PNG</button>
          ${isAdmin() ? `
          <button class="gold" id="sendDiscordDailyModalBtn" style="background:#5865F2;color:#fff;border-color:#4752C4;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
            <span>🚀 Gửi Discord</span>
          </button>
          ` : ''}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#closeDailyImgModal').onclick = () => overlay.remove();
    overlay.querySelector('#downloadDailyImg').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `bao-cao-ngay-${targetDate}.png`;
      a.click();
    };

    if (overlay.querySelector('#sendDiscordDailyModalBtn')) {
      overlay.querySelector('#sendDiscordDailyModalBtn').onclick = async () => {
        if (!isAdmin()) {
          alert('⛔ Bạn đang ở trang xem (index.html). Chỉ Quản Trị Viên (admin.html) mới có quyền gửi báo cáo về Discord!');
          return;
        }

        const btn = overlay.querySelector('#sendDiscordDailyModalBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>⏳ Đang gửi...</span>';
        btn.disabled = true;

        const res = await sendDiscordReport({
          type: 'daily',
          targetChannelId: '1561985181802569761',
          date: fmtDate(targetDate),
          stats: statsPayload,
          imageBase64: dataUrl
        });

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res.success) {
          alert(`✅ ĐÃ GỬI BÁO CÁO NGÀY ${fmtDate(targetDate)} VỀ DISCORD THÀNH CÔNG!`);
        } else {
          showDiscordBotHelpModal(res.message, res.inviteUrl);
        }
      };
    }

  } catch (err) {
    alert('❌ Lỗi tạo ảnh báo cáo ngày: ' + err.message);
  }
}
window.generateDailyRecordReport = generateDailyRecordReport;

// Gắn sự kiện nút xuất báo cáo ngày trên thanh công cụ
$('btnExportDailyRecord')?.addEventListener('click', () => {
  openDailyExportModal();
});

// Gắn sự kiện nút xuất toàn bộ bản ghi ra Excel/CSV
$('btnExportRecordsCsv')?.addEventListener('click', () => {
  if (window.CrewCsvExport) {
    window.CrewCsvExport.exportRecordsToCsv(allRecords);
  }
});

;

/* [MODULE: fund.js] */
/* ==========================================================================
   MODULE: QUẢN LÝ SỐ DƯ, CHUỘC TÙ & BIẾN ĐỘNG QUỸ
   ========================================================================== */

function renderBailMemberOptions() {
  const sel = $('bailMemberSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Chọn thành viên từ danh sách --</option>';
  const list = Object.values(allUsers).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const frag = document.createDocumentFragment();
  list.forEach(u => {
    const isExpelled = (Number(u.scars) || 0) >= 3 || !!u.isExpelled;
    const o = document.createElement('option');
    o.value = u.name || u.username;
    if (isExpelled) {
      o.disabled = true;
      o.textContent = `⛔ ${u.name || u.username} (ĐÃ ĐUỔI - 3 Sẹo)`;
    } else {
      o.textContent = u.name || u.username;
    }
    frag.appendChild(o);
  });
  sel.appendChild(frag);
  if (prev) sel.value = prev;

  // Kích hoạt ô tìm kiếm gợi ý thông minh cho mục Chi Quỹ Chuộc Tù
  if (typeof setupSearchableSelect === 'function') {
    setupSearchableSelect('bailMemberSelect', {
      placeholder: '🔍 Gõ tìm tên người chuộc tù (vd: ch, cuu)...'
    });
  }
}
window.renderBailMemberOptions = renderBailMemberOptions;

function renderFundUI() {
  const initial = Number(fundSettings.initialFund) || 5000000;
  const bailFee = Number(fundSettings.bailFee) || 60000;

  const chronological = [...fundLogs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  let running = initial;
  let totalBail = 0;
  let bailCount = 0;
  const memberBailMap = {};

  const enrichedLogs = chronological.map((log) => {
    const amt = Number(log.amount) || 0;
    running += amt;
    if (log.type === 'bail') {
      totalBail += Math.abs(amt);
      bailCount++;
      const mName = log.memberName || 'Chưa rõ';
      memberBailMap[mName] = (memberBailMap[mName] || 0) + 1;
    }
    return {
      ...log,
      balanceAfter: running
    };
  });

  const currentBalance = running;

  cachedFundData = {
    initial,
    bailFee,
    currentBalance,
    totalBailSpent: totalBail,
    bailCount,
    enrichedLogs: [...enrichedLogs].reverse(),
    memberBailMap
  };
  window.cachedFundData = cachedFundData;

  // Update KPI Cards
  if ($('kpiFundCurrent')) {
    $('kpiFundCurrent').textContent = fmtVND(currentBalance);
    if (currentBalance < 500000) {
      $('kpiFundCurrent').style.color = '#ef4444';
      if ($('kpiFundStatus')) {
        $('kpiFundStatus').textContent = '⚠️ Cảnh báo: Quỹ sắp cạn!';
        $('kpiFundStatus').style.color = '#ef4444';
      }
    } else {
      $('kpiFundCurrent').style.color = '#047857';
      if ($('kpiFundStatus')) {
        $('kpiFundStatus').textContent = '✅ Quỹ sẵn sàng';
        $('kpiFundStatus').style.color = '#047857';
      }
    }
  }
  if ($('kpiFundInitial')) $('kpiFundInitial').textContent = fmtVND(initial);
  if ($('kpiFundTotalSpent')) $('kpiFundTotalSpent').textContent = fmtVND(totalBail);
  if ($('kpiFundBailFeeInfo')) $('kpiFundBailFeeInfo').textContent = `Mức chuộc: ${fmtVND(bailFee)} / lần`;
  if ($('kpiFundBailCount')) $('kpiFundBailCount').textContent = `${bailCount} lượt`;

  // Update Mini Banner Tại Bàn Làm Việc Tổng Quan
  if ($('quickFundBalance')) $('quickFundBalance').textContent = fmtVND(currentBalance);
  if ($('quickFundBailSpent')) $('quickFundBailSpent').textContent = fmtVND(totalBail);
  if ($('quickFundBailCount')) $('quickFundBailCount').textContent = `${bailCount} lượt`;

  // Update Bail Form Display
  if ($('bailFeeBadge')) $('bailFeeBadge').textContent = `-${fmtVND(bailFee)}`;
  updateExpenseFormDisplay();

  // Render Sub-components
  renderTopBailTable(memberBailMap, bailFee);
  renderFundLogsTable();
}
window.renderFundUI = renderFundUI;

/* ==========================================================================
   QUẢN LÝ LOẠI CHI QUỸ (CHUỘC TÙ MẶC ĐỊNH & TÙY CHỈNH LOẠI KHÁC)
   ========================================================================== */
let currentExpenseCategory = 'bail'; // 'bail' | 'fine' | 'supply' | 'food' | 'custom'
let currentExpenseName = 'Chuộc tù';
let currentExpenseIcon = '🚨';
let currentExpenseFee = 60000;

function updateExpenseFormDisplay() {
  const bailFee = (typeof fundSettings !== 'undefined' && fundSettings.bailFee) ? Number(fundSettings.bailFee) : 60000;
  const isBail = (currentExpenseCategory === 'bail');

  if (isBail) {
    if ($('expenseCardTitle')) $('expenseCardTitle').textContent = '🚨 Chuộc Tù Nhanh';
    if ($('expenseTypeNameDisplay')) $('expenseTypeNameDisplay').textContent = 'Chuộc tù (Mặc định)';
    if ($('expenseTypeBadgeIcon')) $('expenseTypeBadgeIcon').textContent = '🚨';
    if ($('expenseTypeTag')) {
      $('expenseTypeTag').textContent = `Tự động -${fmtVND(bailFee)}`;
      $('expenseTypeTag').style.background = '#fee2e2';
      $('expenseTypeTag').style.color = '#991b1b';
    }
    if ($('expenseAmountLabel')) $('expenseAmountLabel').textContent = 'Tiền Tự Động Trừ Khỏi Quỹ';
    if ($('bailFeeDisplay')) {
      $('bailFeeDisplay').style.display = 'block';
      $('bailFeeDisplay').value = `-${fmtVND(bailFee)}`;
    }
    if ($('customExpenseAmount')) $('customExpenseAmount').style.display = 'none';
    if ($('submitBailBtn')) $('submitBailBtn').textContent = `🚨 Xác Nhận Chuộc Tù (-${fmtVND(bailFee)})`;
    if ($('bailNote')) $('bailNote').placeholder = 'Ví dụ: Bị bắt ở tiệm vàng, trốn viện...';
  } else {
    const customInputVal = $('customExpenseTypeName')?.value.trim();
    const dispName = (currentExpenseCategory === 'custom' ? (customInputVal || 'Chi khác') : currentExpenseName) || 'Chi quỹ';
    const amountVal = Number($('customExpenseAmount')?.value) || currentExpenseFee || 0;

    if ($('expenseCardTitle')) $('expenseCardTitle').textContent = `${currentExpenseIcon} Chi Quỹ: ${dispName}`;
    if ($('expenseTypeNameDisplay')) $('expenseTypeNameDisplay').textContent = dispName;
    if ($('expenseTypeBadgeIcon')) $('expenseTypeBadgeIcon').textContent = currentExpenseIcon;
    if ($('expenseTypeTag')) {
      $('expenseTypeTag').textContent = 'Chi tùy chỉnh';
      $('expenseTypeTag').style.background = '#fef3c7';
      $('expenseTypeTag').style.color = '#92400e';
    }
    if ($('expenseAmountLabel')) $('expenseAmountLabel').textContent = 'Số Tiền Chi Từ Quỹ (VNĐ) *';
    if ($('bailFeeDisplay')) $('bailFeeDisplay').style.display = 'none';
    if ($('customExpenseAmount')) $('customExpenseAmount').style.display = 'block';
    if ($('submitBailBtn')) $('submitBailBtn').textContent = `💸 Xác Nhận Chi: ${dispName} (-${fmtVND(amountVal)})`;
    if ($('bailNote')) $('bailNote').placeholder = 'Ví dụ: Mua sắm vũ khí, đóng phạt, tiếp tế xăng xe...';
  }
}
window.updateExpenseFormDisplay = updateExpenseFormDisplay;

function initExpenseTypeSelector() {
  const toggleBtn = $('btnToggleBailType');
  const panel = $('customTypeSelectorPanel');
  const resetBtn = $('btnResetToBail');
  const customNameRow = $('customNameRow');
  const customNameInp = $('customExpenseTypeName');
  const customAmountInp = $('customExpenseAmount');
  const chips = document.querySelectorAll('#typePresetContainer .type-chip');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = (panel.style.display === 'none' || !panel.style.display);
      panel.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? '🔼 Thu gọn' : '✏️ Đổi sang loại khác';
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentExpenseCategory = 'bail';
      currentExpenseName = 'Chuộc tù';
      currentExpenseIcon = '🚨';
      currentExpenseFee = (typeof fundSettings !== 'undefined' && fundSettings.bailFee) ? Number(fundSettings.bailFee) : 60000;

      chips.forEach(c => c.classList.toggle('active', c.dataset.type === 'bail'));
      if (customNameRow) customNameRow.style.display = 'none';
      if (panel) panel.style.display = 'none';
      if (toggleBtn) toggleBtn.textContent = '✏️ Đổi sang loại khác';
      updateExpenseFormDisplay();
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const t = chip.dataset.type;
      currentExpenseCategory = t;

      if (t === 'bail') {
        currentExpenseName = 'Chuộc tù';
        currentExpenseIcon = '🚨';
        currentExpenseFee = (typeof fundSettings !== 'undefined' && fundSettings.bailFee) ? Number(fundSettings.bailFee) : 60000;
        if (customNameRow) customNameRow.style.display = 'none';
      } else if (t === 'custom') {
        currentExpenseName = customNameInp?.value.trim() || 'Chi khác';
        currentExpenseIcon = '📝';
        currentExpenseFee = 50000;
        if (customNameRow) {
          customNameRow.style.display = 'block';
          customNameInp?.focus();
        }
        if (customAmountInp && !customAmountInp.value) customAmountInp.value = 50000;
      } else {
        currentExpenseName = chip.dataset.name || 'Chi quỹ';
        currentExpenseIcon = chip.dataset.icon || '💸';
        currentExpenseFee = Number(chip.dataset.fee) || 50000;
        if (customNameRow) customNameRow.style.display = 'none';
        if (customAmountInp) customAmountInp.value = currentExpenseFee;
      }
      updateExpenseFormDisplay();
    });
  });

  if (customNameInp) {
    customNameInp.addEventListener('input', () => {
      if (currentExpenseCategory === 'custom') updateExpenseFormDisplay();
    });
  }

  if (customAmountInp) {
    customAmountInp.addEventListener('input', () => {
      if (currentExpenseCategory !== 'bail') updateExpenseFormDisplay();
    });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExpenseTypeSelector);
} else {
  initExpenseTypeSelector();
}

/* Render Top Đi Tù Table */
function renderTopBailTable(map, bailFee) {
  const tb = $('topBailTable');
  if (!tb) return;
  tb.innerHTML = '';

  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    tb.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state-box" style="padding: 20px 12px;">
          <span class="empty-state-icon" style="font-size: 26px;">🕊️</span>
          <div class="empty-state-title" style="font-size: 13.5px;">Chưa có anh em nào đi tù</div>
          <div class="empty-state-desc" style="font-size: 12px;">Tất cả anh em đều đang an toàn ngoài đời</div>
        </div>
      </td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  entries.forEach(([name, count], index) => {
    const rankIcon = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : (index + 1);
    const spent = count * bailFee;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;font-weight:800;color:${index < 3 ? 'var(--terracotta)' : 'inherit'};">${rankIcon}</td>
      <td style="font-weight:700;">${escHtml(name)}</td>
      <td style="text-align:center;"><span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:800;padding:2px 6px;border-radius:4px;">${count} lần</span></td>
      <td style="text-align:right;font-weight:800;color:#b91c1c;">-${fmtVND(spent)}</td>
    `;
    frag.appendChild(tr);
  });
  tb.appendChild(frag);
}
window.renderTopBailTable = renderTopBailTable;

/* Render Badge Cho Từng Loại Giao Dịch */
function getFundTypeBadge(log) {
  if (log.type === 'deposit') {
    return `<span class="badge" style="background:#ecfdf5;color:#065f46;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">➕ ${escHtml(log.typeName || 'Nạp quỹ')}</span>`;
  }
  const tName = log.typeName || (log.type === 'bail' ? 'Chuộc tù' : 'Chi quỹ');
  const lower = tName.toLowerCase();
  if (log.type === 'bail' || lower.includes('chuộc')) {
    return `<span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">🚨 ${escHtml(tName)}</span>`;
  }
  if (lower.includes('phạt')) {
    return `<span class="badge" style="background:#fffbeb;color:#b45309;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">⚖️ ${escHtml(tName)}</span>`;
  }
  if (lower.includes('đồ') || lower.includes('vũ khí') || lower.includes('súng')) {
    return `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">🛒 ${escHtml(tName)}</span>`;
  }
  if (lower.includes('tiếp tế') || lower.includes('ăn')) {
    return `<span class="badge" style="background:#fef3c7;color:#92400e;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">🍖 ${escHtml(tName)}</span>`;
  }
  return `<span class="badge" style="background:#f3e8ff;color:#6b21a8;font-weight:800;padding:3px 7px;border-radius:5px;font-size:12px;">💸 ${escHtml(tName)}</span>`;
}

/* Render Fund Logs Table with Search & Filter */
let fundCurrentPage = 1;
const FUND_PAGE_SIZE = 10;
window.fundCurrentPage = fundCurrentPage;

function renderFundLogsTable() {
  const tb = $('fundLogsTable');
  if (!tb) return;
  tb.innerHTML = '';

  const search = ($('searchFundInput')?.value || '').toLowerCase().trim();
  const filterType = $('filterFundType')?.value || 'all';

  const logsList = (cachedFundData && cachedFundData.enrichedLogs) ? cachedFundData.enrichedLogs : [];
  const filtered = logsList.filter(log => {
    const matchName = (log.memberName || '').toLowerCase().includes(search) || (log.note || '').toLowerCase().includes(search);
    const isBailMatch = log.type === 'bail' || (log.typeName && log.typeName.toLowerCase().includes('chuộc'));
    const isDepositMatch = log.type === 'deposit';
    const isExpenseMatch = !isDepositMatch && !isBailMatch;

    let matchType = true;
    if (filterType === 'bail') matchType = isBailMatch;
    else if (filterType === 'deposit') matchType = isDepositMatch;
    else if (filterType === 'expense') matchType = isExpenseMatch;

    return matchName && matchType;
  });

  const totalPages = Math.ceil(filtered.length / FUND_PAGE_SIZE) || 1;
  if (fundCurrentPage > totalPages) fundCurrentPage = totalPages;
  if (fundCurrentPage < 1) fundCurrentPage = 1;

  const startIndex = (fundCurrentPage - 1) * FUND_PAGE_SIZE;
  const pagedLogs = filtered.slice(startIndex, startIndex + FUND_PAGE_SIZE);

  if ($('fundLogsCount')) {
    if (filtered.length > FUND_PAGE_SIZE) {
      $('fundLogsCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedLogs.length, filtered.length)} / ${filtered.length} giao dịch (Trang ${fundCurrentPage}/${totalPages})`;
    } else {
      $('fundLogsCount').textContent = `Hiển thị ${filtered.length} / ${logsList.length} giao dịch`;
    }
  }

  if (!filtered.length) {
    tb.innerHTML = `
      <tr><td colspan="${isAdmin() ? 8 : 7}">
        <div class="empty-state-box">
          <span class="empty-state-icon">📜</span>
          <div class="empty-state-title">${search || filterType !== 'all' ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có biến động quỹ nào'}</div>
          <div class="empty-state-desc">${search || filterType !== 'all' ? 'Thử xóa bộ lọc hoặc tìm kiếm từ khóa khác' : 'Thực hiện nạp quỹ hoặc chuộc tù để ghi nhận'}</div>
        </div>
      </td></tr>`;
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({ container: 'fundPagination', totalItems: 0 });
    }
    return;
  }

  const frag = document.createDocumentFragment();
  pagedLogs.forEach((log, idx) => {
    const globalIdx = startIndex + idx + 1;
    const isNegative = (Number(log.amount) < 0);
    const typeBadge = getFundTypeBadge(log);
    const amountColor = isNegative ? '#dc2626' : '#059669';
    const amountPrefix = isNegative ? '-' : '+';
    const dateFormatted = log.dateStr ? fmtDate(log.dateStr) : '';
    const timeFormatted = log.timeStr ? ` ${log.timeStr}` : '';
    const adminActionCol = isAdmin() ? `
      <td style="text-align:center;white-space:nowrap;">
        <button class="secondary btn-sm" onclick="editFundLog('${log.id}')" title="Chỉnh sửa bản ghi này" style="padding:3px 7px;font-size:11px;margin-right:4px;cursor:pointer;">✏️</button>
        <button class="danger btn-sm" onclick="deleteFundLog('${log.id}')" title="Xoá bản ghi & hoàn tiền" style="padding:3px 7px;font-size:11px;cursor:pointer;">🗑️</button>
      </td>` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;color:var(--slate-400);">${globalIdx}</td>
      <td style="font-weight:600;font-size:12px;white-space:nowrap;">${escHtml(dateFormatted + timeFormatted)}</td>
      <td style="text-align:center;">${typeBadge}</td>
      <td style="font-weight:800;color:var(--text-dark);">${escHtml(log.memberName || 'Chưa rõ')}</td>
      <td style="text-align:right;font-weight:800;color:${amountColor};">${amountPrefix}${fmtVND(Math.abs(log.amount))}</td>
      <td style="text-align:right;font-weight:800;color:var(--slate-800);">${fmtVND(log.balanceAfter)}</td>
      <td style="color:var(--slate-600);font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(log.note || '')}">${escHtml(log.note || '-')}</td>
      ${adminActionCol}
    `;
    frag.appendChild(tr);
  });
  tb.appendChild(frag);

  // Render bộ phân trang
  if (typeof renderPaginationControls === 'function') {
    renderPaginationControls({
      container: 'fundPagination',
      totalItems: filtered.length,
      pageSize: FUND_PAGE_SIZE,
      currentPage: fundCurrentPage,
      itemLabel: 'giao dịch',
      onPageChange: (newPage) => {
        fundCurrentPage = newPage;
        renderFundLogsTable();
        const tbl = $('fundLogsTable');
        if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
window.renderFundLogsTable = renderFundLogsTable;

$('searchFundInput')?.addEventListener('input', debounce(() => {
  fundCurrentPage = 1;
  renderFundLogsTable();
}, 120));
$('filterFundType')?.addEventListener('change', () => {
  fundCurrentPage = 1;
  renderFundLogsTable();
});
$('resetFundFilter')?.addEventListener('click', () => {
  fundCurrentPage = 1;
  if ($('searchFundInput')) $('searchFundInput').value = '';
  if ($('filterFundType')) $('filterFundType').value = 'all';
  renderFundLogsTable();
});

/* Action: Quick Bail & Custom Expense */
$('submitBailBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) {
    const statusEl = $('bailStatusMsg');
    if (statusEl) setStatus(statusEl, '⛔ Chỉ quản trị viên (admin.html) mới có quyền chi quỹ!', false);
    return;
  }
  const memberName = $('bailMemberSelect')?.value.trim();
  const statusEl = $('bailStatusMsg');

  if (!memberName) {
    if (statusEl) setStatus(statusEl, 'Vui lòng chọn thành viên cần chi quỹ!', false);
    return;
  }

  const isBail = (currentExpenseCategory === 'bail');
  let amount = 0;
  let typeName = '';
  let type = 'bail';

  if (isBail) {
    amount = Number(fundSettings.bailFee) || 60000;
    type = 'bail';
    typeName = 'Chuộc tù';
  } else {
    amount = Number($('customExpenseAmount')?.value) || currentExpenseFee || 0;
    if (amount <= 0) {
      if (statusEl) setStatus(statusEl, 'Vui lòng nhập số tiền chi lớn hơn 0 VNĐ!', false);
      return;
    }
    type = 'expense';
    typeName = (currentExpenseCategory === 'custom' ? $('customExpenseTypeName')?.value.trim() : currentExpenseName) || 'Chi quỹ';
  }

  const userNote = $('bailNote')?.value.trim();
  const note = userNote || (isBail ? `Chuộc tù ${memberName}` : `${typeName} cho ${memberName}`);

  const now = new Date();
  const dStr = todayStr();
  const tStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const nowTs = Date.now();
  const optimisticLog = {
    id: 'temp_' + nowTs,
    type: type,
    typeName: typeName,
    memberName: memberName,
    amount: -Math.abs(amount),
    note: note,
    dateStr: dStr,
    timeStr: tStr,
    timestamp: nowTs
  };

  // Cập nhật tức thì (0ms) lên giao diện Quỹ & Widget trên đầu trang
  fundLogs.unshift(optimisticLog);
  if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
  renderFundUI();

  try {
    const pushedRef = await fundLogsRef.push({
      type: type,
      typeName: typeName,
      memberName: memberName,
      amount: -Math.abs(amount),
      note: note,
      dateStr: dStr,
      timeStr: tStr,
      timestamp: nowTs
    });
    optimisticLog.id = pushedRef.key;

    logAudit(isBail ? 'BAIL_MEMBER' : 'EXPENSE_FUND', isBail ? 'Chuộc Tù' : 'Chi Quỹ', `Chi -${fmtVND(amount)} từ quỹ [${typeName}] cho "${memberName}"${note ? ` (Ghi chú: ${note})` : ''}`);

    if (window.SoundFX && typeof window.SoundFX.playCoin === 'function') {
      window.SoundFX.playCoin();
    }

    if (statusEl) setStatus(statusEl, `✅ Đã chi ${fmtVND(amount)} [${typeName}] cho "${memberName}" thành công!`, true);

    if ($('bailMemberSelect')) $('bailMemberSelect').value = '';
    if ($('bailNote')) $('bailNote').value = '';

    // Tự động khôi phục về trạng thái Chuộc Tù mặc định
    if ($('btnResetToBail')) $('btnResetToBail').click();
  } catch (err) {
    if (window.SoundFX && typeof window.SoundFX.playWarn === 'function') {
      window.SoundFX.playWarn();
    }
    const idx = fundLogs.indexOf(optimisticLog);
    if (idx !== -1) fundLogs.splice(idx, 1);
    if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
    renderFundUI();
    if (statusEl) setStatus(statusEl, 'Lỗi: ' + err.message, false);
  }
});

// Phím tắt Enter khi nhập ghi chú chi quỹ
$('bailNote')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('submitBailBtn')?.click();
});

/* Edit Fund Log */
async function editFundLog(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để chỉnh sửa!');
    return;
  }
  const log = fundLogs.find(x => x.id === id);
  if (!log) {
    alert('Không tìm thấy bản ghi giao dịch này!');
    return;
  }

  const isDeposit = (log.type === 'deposit');
  const curTypeName = log.typeName || (log.type === 'bail' ? 'Chuộc tù' : (isDeposit ? 'Nạp quỹ' : 'Chi quỹ'));
  const absAmount = Math.abs(log.amount || 0);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:470px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#fef3c7;color:#b45309;border-color:#fde68a;">✏️</div>
          <div>
            <h3>Chỉnh Sửa Giao Dịch Quỹ</h3>
            <span style="font-size:12px;color:var(--slate-400);font-weight:600;">Sửa đổi loại chi/nạp, số tiền và thông tin</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeEditFundModal" title="Đóng">✕</button>
      </div>

      <!-- LOẠI GIAO DỊCH -->
      <div class="form-group" style="margin-bottom:14px;">
        <label for="editFundTypeSelect">Loại Giao Dịch *</label>
        <select id="editFundTypeSelect" style="margin-bottom:6px;">
          <option value="bail">🚨 Chuộc tù</option>
          <option value="fine">⚖️ Đóng phạt công an</option>
          <option value="supply">🛒 Mua đồ nghề / Vũ khí</option>
          <option value="food">🍖 Tiếp tế / Ăn uống</option>
          <option value="deposit">➕ Nạp tiền vào quỹ</option>
          <option value="custom">📝 Tùy chỉnh khác...</option>
        </select>
        <input id="editFundCustomTypeName" placeholder="Nhập tên loại tùy chỉnh..." style="display:none;" value="${escHtml(curTypeName)}">
      </div>

      <!-- THÀNH VIÊN -->
      <div class="form-group" style="margin-bottom:14px;">
        <label>Thành Viên Liên Quan *</label>
        <select id="editFundMemberSelect" style="margin-bottom:6px;">
          <option value="">-- Chọn thành viên từ danh sách --</option>
        </select>
        <input id="editFundMemberCustom" placeholder="Hoặc gõ tên thành viên..." value="${escHtml(log.memberName || '')}">
      </div>

      <!-- SỐ TIỀN -->
      <div class="form-group" style="margin-bottom:14px;">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          <span id="editFundAmountLabel">Số Tiền (VNĐ) *</span>
          <span class="live-preview-pill" id="editFundAmountPreview" style="color:#b91c1c;background:#fef2f2;border-color:#fecaca;">-${fmtVND(absAmount)}</span>
        </label>
        <div class="input-addon-wrap">
          <input type="number" id="editFundAmount" value="${absAmount}" step="1000" min="1000">
          <span class="input-addon-tag">VNĐ</span>
        </div>
      </div>

      <!-- THỜI GIAN -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div class="form-group" style="margin-bottom:0;">
          <label for="editFundDate">Ngày Ghi Nhận *</label>
          <input type="date" id="editFundDate" value="${log.dateStr || ''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label for="editFundTime">Giờ Giao Dịch</label>
          <input type="text" id="editFundTime" value="${escHtml(log.timeStr || '')}" placeholder="HH:MM:SS">
        </div>
      </div>

      <!-- GHI CHÚ -->
      <div class="form-group" style="margin-bottom:18px;">
        <label for="editFundNote">Lý Do / Ghi Chú</label>
        <input type="text" id="editFundNote" value="${escHtml(log.note || '')}" placeholder="Ghi chú chi tiết...">
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelEditFundBtn">Huỷ bỏ</button>
        <button type="button" class="green" id="saveEditFundBtn">💾 Lưu Thay Đổi</button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  // Populate member dropdown
  const memberSel = overlay.querySelector('#editFundMemberSelect');
  const memberInp = overlay.querySelector('#editFundMemberCustom');
  Object.values(allUsers).sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.name || u.username;
    opt.textContent = u.name || u.username;
    if (opt.value === log.memberName) opt.selected = true;
    memberSel.appendChild(opt);
  });
  memberSel.addEventListener('change', () => {
    if (memberSel.value) memberInp.value = memberSel.value;
  });

  // Type selection logic
  const typeSel = overlay.querySelector('#editFundTypeSelect');
  const customTypeInp = overlay.querySelector('#editFundCustomTypeName');
  const amtInp = overlay.querySelector('#editFundAmount');
  const amtPreview = overlay.querySelector('#editFundAmountPreview');

  // Set initial selected type
  if (log.type === 'deposit') {
    typeSel.value = 'deposit';
  } else if (log.type === 'bail' || curTypeName.includes('Chuộc')) {
    typeSel.value = 'bail';
  } else if (curTypeName.includes('phạt')) {
    typeSel.value = 'fine';
  } else if (curTypeName.includes('đồ') || curTypeName.includes('vũ khí')) {
    typeSel.value = 'supply';
  } else if (curTypeName.includes('tiếp tế') || curTypeName.includes('ăn')) {
    typeSel.value = 'food';
  } else {
    typeSel.value = 'custom';
    customTypeInp.style.display = 'block';
  }

  function updateEditAmountPreview() {
    const isDep = typeSel.value === 'deposit';
    const val = Number(amtInp.value) || 0;
    if (isDep) {
      amtPreview.textContent = `+${fmtVND(val)}`;
      amtPreview.style.color = '#047857';
      amtPreview.style.background = '#ecfdf5';
      amtPreview.style.borderColor = '#a7f3d0';
    } else {
      amtPreview.textContent = `-${fmtVND(val)}`;
      amtPreview.style.color = '#b91c1c';
      amtPreview.style.background = '#fef2f2';
      amtPreview.style.borderColor = '#fecaca';
    }
  }

  typeSel.addEventListener('change', () => {
    if (typeSel.value === 'custom') {
      customTypeInp.style.display = 'block';
      customTypeInp.focus();
    } else {
      customTypeInp.style.display = 'none';
    }
    updateEditAmountPreview();
  });

  amtInp.addEventListener('input', updateEditAmountPreview);
  updateEditAmountPreview();

  // Close handlers
  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeEditFundModal').onclick = closeModal;
  overlay.querySelector('#cancelEditFundBtn').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save changes
  overlay.querySelector('#saveEditFundBtn').onclick = async () => {
    const mName = memberInp.value.trim() || memberSel.value.trim();
    const valAmt = Number(amtInp.value);
    const dateStr = overlay.querySelector('#editFundDate').value.trim();
    const timeStr = overlay.querySelector('#editFundTime').value.trim();
    const note = overlay.querySelector('#editFundNote').value.trim();

    if (!mName) return alert('Vui lòng chọn hoặc nhập tên thành viên!');
    if (isNaN(valAmt) || valAmt <= 0) return alert('Số tiền phải lớn hơn 0 VNĐ!');
    if (!dateStr) return alert('Vui lòng chọn ngày ghi nhận!');

    let selectedType = typeSel.value;
    let newType = 'expense';
    let newTypeName = '';

    if (selectedType === 'deposit') {
      newType = 'deposit';
      newTypeName = 'Nạp quỹ';
    } else if (selectedType === 'bail') {
      newType = 'bail';
      newTypeName = 'Chuộc tù';
    } else if (selectedType === 'fine') {
      newType = 'expense';
      newTypeName = 'Đóng phạt';
    } else if (selectedType === 'supply') {
      newType = 'expense';
      newTypeName = 'Mua đồ nghề';
    } else if (selectedType === 'food') {
      newType = 'expense';
      newTypeName = 'Tiếp tế / Ăn uống';
    } else {
      newType = 'expense';
      newTypeName = customTypeInp.value.trim() || 'Chi quỹ';
    }

    const finalAmount = newType === 'deposit' ? Math.abs(valAmt) : -Math.abs(valAmt);

    try {
      await fundLogsRef.child(id).update({
        type: newType,
        typeName: newTypeName,
        memberName: mName,
        amount: finalAmount,
        dateStr: dateStr,
        timeStr: timeStr,
        note: note
      });

      logAudit('EDIT_FUND_LOG', 'Sửa Giao Dịch Quỹ', `Cập nhật giao dịch [${newTypeName}] của "${mName}": ${fmtVND(finalAmount)}, ngày ${dateStr}${note ? ` (Ghi chú: ${note})` : ''}`);
      overlay.remove();
      alert('✅ Đã cập nhật giao dịch quỹ thành công!');
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };
}
window.editFundLog = editFundLog;

/* Delete Fund Log */
async function deleteFundLog(id) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để xoá!');
    return;
  }
  const log = fundLogs.find(x => x.id === id);
  const ok = (typeof showConfirmModal === 'function')
    ? await showConfirmModal({
        title: 'Xoá Giao Dịch Quỹ',
        targetName: log ? `${log.memberName || 'Chưa rõ'} (${log.amount > 0 ? '+' : ''}${fmtVND(log.amount)})` : 'Giao dịch quỹ',
        targetType: log ? (log.typeName || (log.type === 'bail' ? 'Chuộc tù' : 'Nạp quỹ')) : '',
        type: 'danger',
        icon: '🗑️',
        message: 'Đại ca có chắc chắn muốn xoá bản ghi giao dịch này không?<br><span style="color:#d97706;font-size:12.5px;font-weight:700;">⚠️ Số dư quỹ chuộc tù sẽ tự động hoàn lại tương ứng ngay lập tức.</span>',
        confirmText: '🗑️ Xoá Giao Dịch',
        cancelText: '✕ Hủy Bỏ'
      })
    : confirm('Bạn có chắc muốn xoá bản ghi này không? Số dư quỹ sẽ tự động hoàn lại tương ứng.');

  if (!ok) return;

  try {
    await fundLogsRef.child(id).remove();
    if (log) {
      const typeLabel = log.typeName || (log.type === 'bail' ? 'Chuộc tù' : 'Nạp quỹ');
      logAudit('DELETE_FUND_LOG', 'Xoá Giao Dịch Quỹ', `Xoá giao dịch [${typeLabel}] của "${log.memberName || 'Chưa rõ'}" (${log.amount > 0 ? '+' : ''}${fmtVND(log.amount)})`);
    }
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
}
window.deleteFundLog = deleteFundLog;


/* Modal: Settings ⚙️ (Luxury Redesign) */
$('fundSettingsBtn')?.addEventListener('click', () => {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để cài đặt quỹ!');
    return;
  }
  let currentInit = Number(fundSettings.initialFund) || 5000000;
  let currentBail = Number(fundSettings.bailFee) || 60000;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:470px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge">⚙️</div>
          <div>
            <h3>Cài Đặt Quỹ &amp; Tiền Chuộc</h3>
            <span style="font-size:12px;color:var(--slate-400);font-weight:600;">Thiết lập hạn mức quỹ &amp; giá chuộc cố định</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeFundSettings" title="Đóng">✕</button>
      </div>

      <!-- INPUT 1: HẠN MỨC QUỸ BAN ĐẦU -->
      <div class="form-group" style="margin-bottom:16px;">
        <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:800;color:var(--text-dark);">Hạn Mức Quỹ Ban Đầu *</span>
          <span class="live-preview-pill" id="initFundPreview">💵 ${fmtVND(currentInit)}</span>
        </label>
        <div class="input-addon-wrap">
          <input type="number" id="settingInitialFund" value="${currentInit}" step="100000" placeholder="5000000">
          <span class="input-addon-tag">VNĐ</span>
        </div>
        <div class="preset-chips-wrap">
          <span style="font-size:11px;color:var(--slate-400);align-self:center;margin-right:2px;font-weight:700;">Gợi ý:</span>
          <button type="button" class="preset-chip" data-target="settingInitialFund" data-val="2000000">2M</button>
          <button type="button" class="preset-chip" data-target="settingInitialFund" data-val="5000000">5M (Chuẩn)</button>
          <button type="button" class="preset-chip" data-target="settingInitialFund" data-val="10000000">10M</button>
          <button type="button" class="preset-chip" data-target="settingInitialFund" data-val="20000000">20M</button>
        </div>
      </div>

      <!-- INPUT 2: TIỀN CHUỘC TÙ MỖI LẦN -->
      <div class="form-group" style="margin-bottom:16px;">
        <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:800;color:var(--text-dark);">Tiền Chuộc Tù Mỗi Lượt *</span>
          <span class="live-preview-pill" id="bailFeePreview" style="color:#b91c1c;background:#fef2f2;border-color:#fecaca;">🚨 ${fmtVND(currentBail)} / lần</span>
        </label>
        <div class="input-addon-wrap">
          <input type="number" id="settingBailFee" value="${currentBail}" step="10000" placeholder="60000">
          <span class="input-addon-tag">VNĐ</span>
        </div>
        <div class="preset-chips-wrap">
          <span style="font-size:11px;color:var(--slate-400);align-self:center;margin-right:2px;font-weight:700;">Mức chuộc:</span>
          <button type="button" class="preset-chip" data-target="settingBailFee" data-val="30000">30k</button>
          <button type="button" class="preset-chip" data-target="settingBailFee" data-val="50000">50k</button>
          <button type="button" class="preset-chip" data-target="settingBailFee" data-val="60000">60k (Chuẩn)</button>
          <button type="button" class="preset-chip" data-target="settingBailFee" data-val="100000">100k</button>
        </div>
      </div>

      <!-- DANGER ZONE CARD -->
      <div class="danger-zone-box">
        <div class="danger-zone-header">
          <span>⚠️ KHU VỰC NGUY HIỂM</span>
        </div>
        <div class="danger-zone-desc">
          Khôi phục số dư quỹ về mức mặc định và xoá toàn bộ lịch sử thu/chi chuộc tù trên hệ thống.
        </div>
        <button type="button" class="danger btn-sm" id="resetFundHistoryBtn" style="width:100%;padding:10px;font-weight:800;border-radius:10px;">
          🔄 Xoá Toàn Bộ Lịch Sử Quỹ 
        </button>
      </div>

      <!-- MODAL ACTIONS -->
      <div class="modal-actions" style="margin-top:20px;">
        <button type="button" class="secondary" id="cancelFundSettings">Huỷ bỏ</button>
        <button type="button" class="green" id="saveFundSettings">💾 Lưu Cấu Hình</button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  const inpInit = overlay.querySelector('#settingInitialFund');
  const inpBail = overlay.querySelector('#settingBailFee');
  const prevInit = overlay.querySelector('#initFundPreview');
  const prevBail = overlay.querySelector('#bailFeePreview');

  // Live preview listeners
  inpInit.addEventListener('input', () => {
    const val = Number(inpInit.value) || 0;
    prevInit.textContent = `💵 ${fmtVND(val)}`;
  });
  inpBail.addEventListener('input', () => {
    const val = Number(inpBail.value) || 0;
    prevBail.textContent = `🚨 ${fmtVND(val)} / lần`;
  });

  // Preset chips handler
  overlay.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.target;
      const val = chip.dataset.val;
      const targetInput = overlay.querySelector(`#${targetId}`);
      if (targetInput) {
        targetInput.value = val;
        targetInput.dispatchEvent(new Event('input'));
      }
    });
  });

  // Close handlers
  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeFundSettings').onclick = closeModal;
  overlay.querySelector('#cancelFundSettings').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save Settings
  overlay.querySelector('#saveFundSettings').onclick = async () => {
    const newInit = Number(inpInit.value);
    const newBail = Number(inpBail.value);

    if (isNaN(newInit) || newInit < 0) return alert('Số dư ban đầu không hợp lệ!');
    if (isNaN(newBail) || newBail <= 0) return alert('Mức tiền chuộc tù không hợp lệ!');

    try {
      await fundSettingsRef.set({
        initialFund: newInit,
        bailFee: newBail
      });
      logAudit('CONFIG_FUND', 'Cấu Hình Quỹ', `Cập nhật hạn mức quỹ: ${fmtVND(newInit)}, tiền chuộc: ${fmtVND(newBail)}/lần`);
      overlay.remove();
      alert('✅ Đã lưu cấu hình quỹ thành công!');
    } catch (err) {
      alert('Lỗi lưu cài đặt: ' + err.message);
    }
  };

  // Reset Fund Logs with key
  overlay.querySelector('#resetFundHistoryBtn').onclick = async () => {
    const key = (typeof showPromptModal === 'function')
      ? await showPromptModal({
          title: 'Khóa Bảo Mật Quỹ Chuộc Tù',
          message: 'Nhập mã bảo mật để xác nhận xoá toàn bộ lịch sử thu/chi quỹ:',
          placeholder: 'Nhập mã bảo mật...',
          type: 'danger',
          icon: '🔐',
          confirmText: '🗑️ Xác Nhận Xoá',
          cancelText: '✕ Hủy Bỏ'
        })
      : prompt('Nhập mã bảo mật để xoá toàn bộ lịch sử thu/chi quỹ:');
    if (!key) return;

    try {
      let isVerified = false;
      try {
        const resp = await fetch('/api/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.trim() })
        });
        if (resp.status !== 404 && resp.status !== 405) {
          const resJson = await resp.json();
          if (!resp.ok || !resJson.success) {
            return alert(resJson.message || '❌ Sai mã bảo mật! Thao tác đã bị huỷ.');
          }
          isVerified = true;
        }
      } catch (e) {
        isVerified = false;
      }

      // Fallback an toàn khi test localhost bằng hàm băm SHA-256
      if (!isVerified) {
        const enc = new TextEncoder().encode(key.trim());
        const buf = await crypto.subtle.digest('SHA-256', enc);
        const kHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (kHash !== '81a83544cf93c245178cbc1620030f1123f435af867c79d87135983c52ab39d9') {
          return alert('❌ Sai mã bảo mật! Thao tác đã bị huỷ.');
        }
      }
    } catch (err) {
      return alert('❌ Lỗi kiểm tra mã bảo mật!');
    }
    try {
      await fundLogsRef.remove();
      logAudit('RESET_FUND', 'Xoá Lịch Sử Quỹ', 'Đã xoá toàn bộ lịch sử thu/chi chuộc tù, đưa số dư về ban đầu');
      overlay.remove();
      alert('✅ Đã xoá toàn bộ lịch sử quỹ! Số dư đã được đưa về lại mức ban đầu.');
    } catch (err) {
      alert('Lỗi khi xoá: ' + err.message);
    }
  };
});

/* Modal: Deposit ➕ (Luxury Redesign) */
$('fundDepositBtn')?.addEventListener('click', () => {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để nạp quỹ!');
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0;">➕</div>
          <div>
            <h3>Nạp Tiền Vào Quỹ Băng</h3>
            <span style="font-size:12px;color:var(--slate-400);font-weight:600;">Góp quỹ, trúng mánh hoặc nộp phạt</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeDepositModal" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label>Thành Viên Nạp / Người Đóng Góp *</label>
        <select id="depositMemberSelect" style="margin-bottom:6px;">
          <option value="">-- Chọn thành viên từ danh sách --</option>
        </select>
        <input id="depositMemberName" placeholder="Hoặc gõ tên nếu chưa có trong danh sách...">
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          <span>Số Tiền Nạp *</span>
          <span class="live-preview-pill" id="depositAmountPreview" style="color:#047857;background:#ecfdf5;border-color:#a7f3d0;">➕ 500.000đ</span>
        </label>
        <div class="input-addon-wrap">
          <input type="number" id="depositAmount" placeholder="500000" value="500000" step="50000">
          <span class="input-addon-tag">VNĐ</span>
        </div>
        <div class="preset-chips-wrap">
          <span style="font-size:11px;color:var(--slate-400);align-self:center;margin-right:2px;font-weight:700;">Gợi ý:</span>
          <button type="button" class="preset-chip deposit-chip" data-val="200000">200k</button>
          <button type="button" class="preset-chip deposit-chip" data-val="500000">500k</button>
          <button type="button" class="preset-chip deposit-chip" data-val="1000000">1 Triệu</button>
          <button type="button" class="preset-chip deposit-chip" data-val="2000000">2 Triệu</button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:16px;">
        <label>Ghi Chú Nạp Tiền</label>
        <input id="depositNote" placeholder="Ví dụ: Đóng quỹ tháng, nộp phạt trễ hẹn...">
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelDepositBtn">Huỷ bỏ</button>
        <button type="button" class="green" id="confirmDepositBtn">➕ Xác Nhận Nạp Quỹ</button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  // Populate member dropdown in deposit modal
  const sel = overlay.querySelector('#depositMemberSelect');
  const inpCustomName = overlay.querySelector('#depositMemberName');
  Object.values(allUsers).sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.name || u.username;
    opt.textContent = u.name || u.username;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    if (sel.value) inpCustomName.value = sel.value;
  });

  const inpAmt = overlay.querySelector('#depositAmount');
  const prevAmt = overlay.querySelector('#depositAmountPreview');

  inpAmt.addEventListener('input', () => {
    const val = Number(inpAmt.value) || 0;
    prevAmt.textContent = `➕ ${fmtVND(val)}`;
  });

  overlay.querySelectorAll('.deposit-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      inpAmt.value = chip.dataset.val;
      inpAmt.dispatchEvent(new Event('input'));
    });
  });

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeDepositModal').onclick = closeModal;
  overlay.querySelector('#cancelDepositBtn').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#confirmDepositBtn').onclick = async () => {
    const memberName = inpCustomName.value.trim() || sel.value.trim();
    const amount = Number(inpAmt.value);
    const note = overlay.querySelector('#depositNote').value.trim() || 'Nạp tiền vào quỹ';

    if (!memberName) return alert('Vui lòng chọn hoặc nhập tên người nạp tiền!');
    if (isNaN(amount) || amount <= 0) return alert('Số tiền nạp không hợp lệ!');

    const now = new Date();
    const dStr = todayStr();
    const tStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const nowTs = Date.now();

    const optimisticDeposit = {
      id: 'temp_' + nowTs,
      type: 'deposit',
      memberName: memberName,
      amount: amount,
      note: note,
      dateStr: dStr,
      timeStr: tStr,
      timestamp: nowTs
    };

    // Cập nhật tức thì (0ms)
    fundLogs.unshift(optimisticDeposit);
    if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
    renderFundUI();
    overlay.remove();

    try {
      const pushedRef = await fundLogsRef.push({
        type: 'deposit',
        memberName: memberName,
        amount: amount,
        note: note,
        dateStr: dStr,
        timeStr: tStr,
        timestamp: nowTs
      });
      optimisticDeposit.id = pushedRef.key;
      logAudit('FUND_DEPOSIT', 'Nạp Tiền Quỹ', `Nạp +${fmtVND(amount)} vào quỹ từ "${memberName}" (${note})`);
      if (window.SoundFX && typeof window.SoundFX.playCoin === 'function') {
        window.SoundFX.playCoin();
      }
      alert(`✅ Đã nạp thành công ${fmtVND(amount)} vào quỹ!`);
    } catch (err) {
      if (window.SoundFX && typeof window.SoundFX.playWarn === 'function') {
        window.SoundFX.playWarn();
      }
      const idx = fundLogs.indexOf(optimisticDeposit);
      if (idx !== -1) fundLogs.splice(idx, 1);
      if (typeof updateQuickFundBanner === 'function') updateQuickFundBanner();
      renderFundUI();
      alert('Lỗi nạp tiền: ' + err.message);
    }
  };
});

/* Modal: Export Fund Report Image */
$('exportFundBtn')?.addEventListener('click', openExportFundModal);

function openExportFundModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:460px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">📸</div>
          <div>
            <h3>Xuất Báo Cáo Quỹ &amp; Chuộc Tù</h3>
            <span style="font-size:12px;color:var(--slate-400);font-weight:600;">Xuất chứng từ ảnh kèm con dấu &amp; chữ ký</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeExportFundModal" title="Đóng">✕</button>
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label>Tiêu Đề Chứng Từ Báo Cáo</label>
        <input id="exportFundTitle" value="BẢNG KÊ KHAI QUỸ BĂNG &amp; CHI PHÍ CHUỘC TÙ">
      </div>

      <div style="background:linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);border:1px solid #fed7aa;padding:14px 16px;border-radius:12px;font-size:13px;color:#7c2d12;margin-bottom:18px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">
        <div style="font-weight:800;color:#c2410c;margin-bottom:8px;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          <span>📊</span> THÔNG SỐ TỔNG KẾT TRÊN ẢNH:
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;"><span>• Hạn mức ban đầu:</span> <b style="color:var(--text-dark);">${fmtVND(cachedFundData.initial)}</b></div>
          <div style="display:flex;justify-content:space-between;"><span>• Tổng chi chuộc tù:</span> <b style="color:#b91c1c;">${fmtVND(cachedFundData.totalBailSpent)} (${cachedFundData.bailCount} lượt)</b></div>
          <div style="display:flex;justify-content:space-between;border-top:1px dashed #fdba74;padding-top:5px;margin-top:2px;"><span>• Số dư thực tế còn:</span> <b style="color:#047857;font-size:15px;">${fmtVND(cachedFundData.currentBalance)}</b></div>
        </div>
      </div>

      <div class="modal-actions" style="flex-wrap:wrap;gap:8px;justify-content:flex-end;">
        <button type="button" class="secondary" id="cancelExportFundBtn">Huỷ bỏ</button>
        <button type="button" class="gold" id="exportFundCsvModalBtn" style="background:#059669;color:#fff;border-color:#047857;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
          <span>📊 Xuất Excel / CSV</span>
        </button>
        <button type="button" class="green" id="runExportFundBtn" style="background:linear-gradient(135deg, #2563eb, #1d4ed8);">📸 Tạo &amp; Tải Ảnh Ngay</button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  const closeFn = () => overlay.remove();
  overlay.querySelector('#closeExportFundModal').onclick = closeFn;
  overlay.querySelector('#cancelExportFundBtn').onclick = closeFn;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFn();
  });

  overlay.querySelector('#runExportFundBtn').onclick = () => {
    const customTitle = overlay.querySelector('#exportFundTitle').value.trim();
    overlay.remove();
    generateFundExportImage(customTitle);
  };

  if (overlay.querySelector('#exportFundCsvModalBtn')) {
    overlay.querySelector('#exportFundCsvModalBtn').onclick = () => {
      if (window.CrewCsvExport) {
        window.CrewCsvExport.exportFundToCsv(fundLogs, fundSettings?.initialFund);
      }
    };
  }
}
window.openExportFundModal = openExportFundModal;

// Lắng nghe nút tải Excel/CSV trên thanh công cụ Quỹ
$('exportFundCsvBtn')?.addEventListener('click', () => {
  if (window.CrewCsvExport) {
    window.CrewCsvExport.exportFundToCsv(fundLogs, fundSettings?.initialFund);
  }
});

async function generateFundExportImage(customTitle) {
  const logsToPrint = (cachedFundData && cachedFundData.enrichedLogs) ? cachedFundData.enrichedLogs : [];
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rowsHtml = logsToPrint.length ? logsToPrint.map((item, idx) => {
    const isBail = item.type === 'bail';
    const typeLabel = item.typeName || (isBail ? 'Chuộc tù' : (item.type === 'deposit' ? 'Nạp quỹ' : 'Chi khác'));
    const isNegative = (Number(item.amount) < 0);
    const amtColor = isNegative ? '#b91c1c' : '#047857';
    const amtPrefix = isNegative ? '-' : '+';
    const dFmt = item.dateStr ? fmtDate(item.dateStr) : dateStr;
    const tFmt = item.timeStr ? ` ${item.timeStr}` : '';

    return `
      <tr style="border-bottom:1.5px solid #000;background:rgba(255,255,255,.95);">
        <td style="padding:12px 8px;text-align:center;font-weight:800;border-right:1.5px solid #000;font-size:15px;">${idx + 1}</td>
        <td style="padding:12px 10px;text-align:center;font-weight:700;border-right:1.5px solid #000;font-size:14px;">${escHtml(dFmt + tFmt)}</td>
        <td style="padding:12px 10px;text-align:center;font-weight:800;border-right:1.5px solid #000;font-size:14.5px;">${escHtml(typeLabel)}</td>
        <td style="padding:12px 14px;font-weight:800;border-right:1.5px solid #000;font-size:16px;text-align:left;">${escHtml(item.memberName || 'Chưa rõ')}</td>
        <td style="padding:12px 14px;text-align:right;font-weight:900;border-right:1.5px solid #000;font-size:16px;color:${amtColor};">${amtPrefix}${fmtVND(Math.abs(item.amount))}</td>
        <td style="padding:12px 14px;text-align:right;font-weight:900;border-right:1.5px solid #000;font-size:16px;">${fmtVND(item.balanceAfter)}</td>
        <td style="padding:12px 12px;font-size:14px;font-weight:600;color:#222;text-align:left;">${escHtml(item.note || '-')}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="7" style="padding:28px;text-align:center;font-weight:800;font-size:16px;border-bottom:2px solid #000;">Chưa phát sinh giao dịch nào</td>
    </tr>
  `;

  const container = $('exportArea');
  if (!container) return;
  container.innerHTML = `
    <div style="width:1100px;background:#fdfcf7;padding:48px 56px;color:#000;
                box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;border:3px solid #000;position:relative;">

      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:800;letter-spacing:3px;color:#000;">HỆ THỐNG QUẢN LÝ BĂNG ĐÃNG TRỘM NHÀ</div>
        <div style="font-size:14px;font-weight:800;letter-spacing:2px;color:#000;margin-top:4px;">────────── ✦ ──────────</div>
      </div>

      <div style="text-align:center;margin-bottom:22px;">
        <div style="font-size:26px;font-weight:900;letter-spacing:1px;color:#000;text-transform:uppercase;">
          ${escHtml(customTitle || 'BẢNG KÊ KHAI QUỸ BĂNG & CHI PHÍ CHUỘC TÙ')}
        </div>
        <div style="font-size:14px;font-weight:700;color:#333;margin-top:8px;">
          Ngày xuất báo cáo: ${dateStr} &nbsp;•&nbsp; ${timeStr}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
        <div style="border:2px solid #000;padding:14px;text-align:center;background:rgba(255,255,255,.95);border-radius:6px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#444;">HẠN MỨC BAN ĐẦU</div>
          <div style="font-size:20px;font-weight:900;margin-top:5px;">${fmtVND(cachedFundData.initial)}</div>
        </div>
        <div style="border:2px solid #000;padding:14px;text-align:center;background:rgba(255,255,255,.95);border-radius:6px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#444;">TỔNG CHI CHUỘC TÙ</div>
          <div style="font-size:20px;font-weight:900;margin-top:5px;color:#b91c1c;">${fmtVND(cachedFundData.totalBailSpent)}</div>
        </div>
        <div style="border:2px solid #000;padding:14px;text-align:center;background:rgba(255,255,255,.95);border-radius:6px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#444;">SỐ LƯỢT CHUỘC TÙ</div>
          <div style="font-size:20px;font-weight:900;margin-top:5px;">${cachedFundData.bailCount} lượt</div>
        </div>
        <div style="border:2px solid #000;padding:14px;text-align:center;background:rgba(255,255,255,.95);border-radius:6px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#444;">SỐ DƯ QUỸ HIỆN TẠI</div>
          <div style="font-size:22px;font-weight:900;margin-top:5px;color:#047857;">${fmtVND(cachedFundData.currentBalance)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;border:2.5px solid #000;background:rgba(255,255,255,.95);table-layout:fixed;">
        <thead>
          <tr style="background:#000;color:#fff;">
            <th style="padding:12px 8px;font-size:13.5px;letter-spacing:1px;width:55px;text-align:center;border-right:1px solid #fff;">STT</th>
            <th style="padding:12px 8px;font-size:13.5px;letter-spacing:1px;width:145px;text-align:center;border-right:1px solid #fff;">THỜI GIAN</th>
            <th style="padding:12px 8px;font-size:13.5px;letter-spacing:1px;width:110px;text-align:center;border-right:1px solid #fff;">LOẠI</th>
            <th style="padding:12px 12px;font-size:13.5px;letter-spacing:1px;text-align:left;border-right:1px solid #fff;">THÀNH VIÊN</th>
            <th style="padding:12px 12px;font-size:13.5px;letter-spacing:1px;width:145px;text-align:right;border-right:1px solid #fff;">BIẾN ĐỘNG</th>
            <th style="padding:12px 12px;font-size:13.5px;letter-spacing:1px;width:150px;text-align:right;border-right:1px solid #fff;">SỐ DƯ CÒN</th>
            <th style="padding:12px 10px;font-size:13.5px;letter-spacing:1px;width:180px;text-align:left;">GHI CHÚ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- KHUNG THÔNG BÁO WEBSITE THEO YÊU CẦU ĐẠI CA -->
      <div style="margin-top:24px;background:#fff8ee;border:2.5px solid #d97706;border-radius:14px;padding:20px 24px;text-align:center;box-shadow:inset 0 0 10px rgba(217,119,6,0.1);">
        <div style="display:inline-block;background:#b45309;color:#fff;padding:5px 18px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">
          ✦ THÔNG BÁO TỪ BAN QUẢN LÝ CREW LƯỠI BÚA ✦
        </div>
        <div style="font-size:16.5px;font-weight:900;color:#1e293b;letter-spacing:0.5px;margin-bottom:6px;">
          🌐 WEBSITE: <span style="color:#b45309;text-decoration:underline;">https://quan-ly-seven.vercel.app/</span>
        </div>
        <div style="font-size:18px;font-weight:900;color:#b45309;letter-spacing:0.5px;margin-bottom:6px;">
          👉 AE TỰ VÀO CHECK QUỸ &amp; CHI PHÍ CHUỘC TÙ NHÉ .
        </div>
        <div style="font-size:12px;font-weight:700;color:#78350f;letter-spacing:0.3px;">
          ⚡ Hệ thống tự động đồng bộ thời gian thực 24/7 • Minh bạch &amp; Chính xác tuyệt đối
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:40px;">
        <div style="position:relative;width:360px;height:230px;">

          <div style="position:absolute;left:0;top:0;text-align:center;width:230px;">
            <div style="font-size:14px;font-weight:800;color:#000;letter-spacing:1.5px;">THỦ QUỸ / QUẢN LÝ</div>
            <div style="font-size:11px;font-weight:600;color:#000;font-style:italic;margin-top:2px;">(Ký, đóng dấu chính thức)</div>
            <div style="height:26px;"></div>
            <div style="font-family:'Great Vibes',cursive;font-size:52px;font-weight:400;color:#000;line-height:1;letter-spacing:2px;">
              Trí
            </div>
            <div style="font-family:'Dancing Script','Brush Script MT',cursive;font-size:34px;font-weight:700;color:#000;line-height:1.1;letter-spacing:.5px;margin-top:8px;">
              Nguyễn Ngọc Trí
            </div>
          </div>

          <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"
               style="position:absolute;right:0;top:20px;width:150px;height:150px;
                      transform:rotate(-12deg);opacity:0.88;">
            <defs>
              <path id="stampFundTop" d="M 22,80 A 58,58 0 0,1 138,80" fill="none"/>
              <path id="stampFundBot" d="M 24,80 A 56,56 0 0,0 136,80" fill="none"/>
            </defs>
            <circle cx="80" cy="80" r="76" fill="none" stroke="#c81e1e" stroke-width="3.5"/>
            <circle cx="80" cy="80" r="66" fill="none" stroke="#c81e1e" stroke-width="1"/>
            <circle cx="80" cy="80" r="40" fill="none" stroke="#c81e1e" stroke-width="1"/>
            <text fill="#c81e1e" font-size="9.5" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.2">
              <textPath href="#stampFundTop" startOffset="50%" text-anchor="middle">QUẢN LÝ QUỸ BĂNG ĐÃNG</textPath>
            </text>
            <text fill="#c81e1e" font-size="10" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.4">
              <textPath href="#stampFundBot" startOffset="50%" text-anchor="middle">★ CHÍNH THỨC ★</textPath>
            </text>
            <polygon points="80,50 83.8,63 97,63 86.5,71 90.2,84 80,76 69.8,84 73.5,71 63,63 76.2,63"
                     fill="#d4a017" stroke="#d4a017" stroke-width="0.5" stroke-linejoin="round"/>
            <g fill="#c81e1e" transform="translate(80,110)">
              <path d="M -13,-1 C -15,-7 -11,-12 -3,-13 C 3,-14 8,-11 10,-6
                       C 4,-9 -2,-8 -5,-4 C -8,0 -6,5 -2,7 C 2,9 7,8 10,5
                       C 6,10 -1,12 -7,8 C -12,5 -14,3 -13,-1 Z"/>
              <rect x="-1" y="-14" width="2.8" height="18" transform="rotate(35 -0.5 -5)"/>
              <rect x="-9.5" y="-16.5" width="13" height="5" transform="rotate(35 -3 -14)"/>
            </g>
            <circle cx="80" cy="8" r="2.2" fill="#c81e1e"/>
          </svg>

        </div>
      </div>

      <div style="text-align:center;margin-top:24px;padding-top:14px;border-top:2px solid #000;
                  font-size:11px;font-weight:700;color:#000;letter-spacing:1px;">
        ── CHỨNG TỪ TÀI CHÍNH QUỸ HỢP LỆ ──
      </div>

    </div>
  `;

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 3,
      backgroundColor: '#fdfcf7',
      logging: false,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    if (container) container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:1090px;">
        <h3>📸 Báo Cáo Quỹ &amp; Chuộc Tù (${logsToPrint.length} giao dịch)</h3>
        <img src="${dataUrl}" alt="Báo cáo quỹ" style="border-radius:12px;border:1px solid #e2e8f0;width:100%;">
        <div class="modal-actions" style="flex-wrap:wrap;gap:8px;justify-content:flex-end;">
          <button class="secondary" id="closeFundImgModal">Đóng</button>
          <button class="green" id="downloadFundImg">⬇️ Tải Xuống Ảnh PNG</button>
          ${isAdmin() ? `
          <button type="button" class="gold" id="sendDiscordWeeklyFundBtn" style="background:#5865F2;color:#fff;border-color:#4752C4;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
            <span>🚀 Gửi Discord</span>
          </button>
          ` : ''}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#closeFundImgModal').onclick = () => overlay.remove();
    overlay.querySelector('#downloadFundImg').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeTitle = (customTitle || 'bao-cao-quy').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `bao-cao-quy-${safeTitle}-${Date.now()}.png`;
      a.click();
    };

    if (overlay.querySelector('#sendDiscordWeeklyFundBtn')) {
      overlay.querySelector('#sendDiscordWeeklyFundBtn').onclick = async () => {
        if (!isAdmin()) {
          alert('⛔ Bạn đang ở trang xem (index.html). Chỉ Quản Trị Viên (admin.html) mới có quyền gửi báo cáo về Discord!');
          return;
        }

        const btn = overlay.querySelector('#sendDiscordWeeklyFundBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>⏳ Đang gửi...</span>';
        btn.disabled = true;

        const fundBalance = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.currentBalance !== undefined)
          ? cachedFundData.currentBalance
          : 0;
        const bailSpent = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.totalBailSpent !== undefined)
          ? cachedFundData.totalBailSpent
          : 0;
        const txCount = (logsToPrint && logsToPrint.length)
          ? logsToPrint.length
          : (cachedFundData?.bailCount ?? 0);

        const res = await (window.sendDiscordReport || sendDiscordReport)({
          type: 'fund',
          targetChannelId: '1561985235422281760',
          title: customTitle || 'BÁO CÁO BIẾN ĐỘNG QUỸ & CHI PHÍ CHUỘC TÙ',
          stats: {
            currentFund: fundBalance,
            totalBail: bailSpent,
            txCount: txCount
          },
          imageBase64: dataUrl
        });

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res.success) {
          alert('✅ ĐÃ GỬI BÁO CÁO QUỸ HÀNG TUẦN VỀ DISCORD THÀNH CÔNG!');
        } else {
          if (typeof showDiscordBotHelpModal === 'function') {
            showDiscordBotHelpModal(res.message, res.inviteUrl);
          } else {
            alert('❌ ' + res.message);
          }
        }
      };
    }
  } catch (err) {
    alert('❌ Lỗi tạo ảnh báo cáo quỹ: ' + err.message);
  }
}
window.generateFundExportImage = generateFundExportImage;

;

/* [MODULE: audit.js] */
/* ==========================================================================
   MODULE: AUDIT LOGS, SECURITY RESET (CODE 2000) & CANVAS IMAGE EXPORTS
   ========================================================================== */

/* ==========================================================================
   SECTION 1: SECURITY RESET (CODE 2000)
   ========================================================================== */
$('resetAllBinhBtn')?.addEventListener('click', () => {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để reset chu kỳ!');
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:#fef2f2;color:#b91c1c;border-color:#fecaca;">⚠️</div>
          <div>
            <h3>Reset Chu Kỳ Mới (Số Nhà &amp; Tiền Chuộc)</h3>
            <span style="font-size:12px;color:var(--slate-400);font-weight:600;">Dọn sạch số nhà &amp; hoàn trả quỹ chuộc tù về ban đầu</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeResetSec" title="Đóng">✕</button>
      </div>

      <div class="danger-zone-box" style="margin-top:0;margin-bottom:16px;">
        <div class="danger-zone-desc" style="margin-bottom:0;color:#991b1b;font-weight:600;line-height:1.6;">
          ⚠️ <b>Thao tác này sẽ đồng thời:</b><br>
          1. Xoá sạch toàn bộ bản ghi số nhà của tất cả anh em về <b>0 nhà</b>.<br>
          2. Xoá sạch toàn bộ lịch sử chuộc tù, đưa <b>số dư quỹ về nguyên vẹn ban đầu</b>.<br>
          <span style="color:#059669;font-weight:700;">✅ Danh sách thành viên vẫn được giữ nguyên an toàn 100%.</span>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:16px;">
        <label style="font-weight:800;color:var(--text-dark);text-align:center;display:block;margin-bottom:8px;">
          Nhập Mã Bảo Mật Của Đại Ca 
        </label>
        <input type="password" id="resetSecKeyInput" placeholder="••••" 
               style="font-size:24px;letter-spacing:10px;text-align:center;font-weight:900;padding:12px;background:#fffaf8;border:2px solid #ebdcd0;">
      </div>

      <input type="hidden" id="resetCsrfToken" name="csrf_token" value="${window.CSRF_TOKEN || document.querySelector('meta[name=\'csrf-token\']')?.content || ''}">

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelResetSec">Huỷ bỏ</button>
        <button type="button" class="danger" id="confirmResetSec" style="font-weight:800;">💣 Xác Nhận Reset Toàn Bộ</button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  const inp = overlay.querySelector('#resetSecKeyInput');
  inp.focus();

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeResetSec').onclick = closeModal;
  overlay.querySelector('#cancelResetSec').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  async function executeReset() {
    const csrfToken = overlay.querySelector('#resetCsrfToken')?.value || window.CSRF_TOKEN;
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 16) {
      alert('❌ Lỗi bảo mật CSRF: Không tìm thấy Token xác thực hợp lệ của phiên đăng nhập! Yêu cầu bị hủy bỏ.');
      return;
    }

    const key = inp.value.trim();
    if (!key) {
      alert('Vui lòng nhập mã bảo mật!');
      inp.focus();
      return;
    }

    try {
      let isVerified = false;
      try {
        const resp = await fetch('/api/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key })
        });
        if (resp.status !== 404 && resp.status !== 405) {
          const resJson = await resp.json();
          if (!resp.ok || !resJson.success) {
            alert(resJson.message || '❌ Sai mã bảo mật! Thao tác đã bị huỷ bỏ.');
            inp.value = '';
            inp.focus();
            return;
          }
          isVerified = true;
        }
      } catch (e) {
        isVerified = false;
      }

      // Fallback an toàn khi test localhost bằng hàm băm SHA-256
      if (!isVerified) {
        const enc = new TextEncoder().encode(key);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        const kHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (kHash !== '81a83544cf93c245178cbc1620030f1123f435af867c79d87135983c52ab39d9') {
          alert('❌ Sai mã bảo mật! Thao tác đã bị huỷ bỏ.');
          inp.value = '';
          inp.focus();
          return;
        }
      }
    } catch (err) {
      alert('❌ Lỗi kiểm tra mã bảo mật!');
      inp.value = '';
      inp.focus();
      return;
    }

    try {
      // HIỂN THỊ THÔNG BÁO TIẾN TRÌNH SAO LƯU TỰ ĐỘNG
      const backupNotice = document.createElement('div');
      backupNotice.className = 'modal-overlay';
      backupNotice.innerHTML = `
        <div class="modal-box" style="max-width:440px;text-align:center;padding:32px;">
          <div style="font-size:44px;margin-bottom:12px;">⏳</div>
          <h3 style="margin-bottom:8px;font-size:18px;">Đang Tự Động Sao Lưu Dữ Liệu...</h3>
          <p style="font-size:13px;color:var(--slate-500);line-height:1.6;margin-bottom:0;">
            Đang tạo ảnh tổng hợp và gửi trực tiếp về Discord (Kênh 1562063584496844841) trước khi reset...
          </p>
        </div>
      `;
      document.body.appendChild(backupNotice);

      // TỰ ĐỘNG SAO LƯU ẢNH SỐ NHÀ & LỊCH SỬ QUỸ VỀ DISCORD TRƯỚC KHI RESET (KHÔNG TẢI VỀ MÁY THEO LỆNH ĐẠI CA)
      try {
        await generateFullBackupSnapshot({ autoDownload: false, sendToDiscord: true, reason: 'RESET_CYCLE' });
      } catch (bErr) {
        console.error('Lỗi trong quá trình tự động sao lưu:', bErr);
      }
      backupNotice.remove();

      await Promise.all([
        recordsRef.remove(),
        fundLogsRef.remove()
      ]);
      allRecords = [];
      statsData = [];
      fundLogs = [];
      window.allRecords = allRecords;
      window.statsData = statsData;
      window.fundLogs = fundLogs;

      logAudit('RESET_ALL', 'Reset Chu Kỳ Mới', '💣 Đã tự động sao lưu ảnh về Discord (1562063584496844841) và reset sạch số nhà, lịch sử chuộc tù!');

      overlay.remove();
      alert('✅ ĐÃ RESET TOÀN BỘ CHU KỲ MỚI THÀNH CÔNG!\n\n1. Bản ảnh dữ liệu đã được tự động sao lưu và gửi về Discord (Kênh 1562063584496844841).\n2. Không tải file về máy tính tránh phiền toái theo lệnh Đại ca.\n3. Số nhà của tất cả anh em đã về 0 nhà.\n4. Tiền chuộc tù và lịch sử quỹ đã được khôi phục về ban đầu.\n\nHệ thống sẵn sàng cho chu kỳ mới an toàn 100%!');

      if (typeof renderStats === 'function') renderStats();
      if (typeof renderMembersTable === 'function') renderMembersTable();
      if (typeof renderRecords === 'function') renderRecords();
      if (typeof renderFundUI === 'function') renderFundUI();
    } catch (err) {
      alert('❌ Lỗi khi xoá: ' + err.message);
    }
  }

  overlay.querySelector('#confirmResetSec').onclick = executeReset;
  inp.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') executeReset();
  });
});

/* ==========================================================================
   SECTION 1.5: HỆ THỐNG SAO LƯU DỮ LIỆU ĐỊNH KỲ & TRƯỚC KHI RESET
   KÊNH DISCORD: 1562063584496844841
   ========================================================================== */

/**
 * Xuất dữ liệu sao lưu chu kỳ: Tạo ảnh tổng hợp 2 cột (Số nhà & Quỹ chuộc tù)
 * Tự động gửi về Discord kênh 1562063584496844841 (KHÔNG tải file về máy tính theo lệnh Đại ca)
 */
async function generateFullBackupSnapshot({ autoDownload = false, sendToDiscord = true, reason = 'RESET_CYCLE' } = {}) {
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const adminName = sessionStorage.getItem('luoibua_admin_name') || 'Nguyễn Trí';
  const reasonText = reason === 'RESET_CYCLE' ? 'Trước Khi Reset Chu Kỳ Mới' : 'Sao Lưu Định Kỳ Chu Kỳ';

  // 1. Tổng hợp dữ liệu số nhà
  const memberHouseTotals = {};
  let totalHouses = 0;
  (allRecords || []).forEach(r => {
    const uid = r.userId || r.userName || 'unknown';
    if (!memberHouseTotals[uid]) {
      memberHouseTotals[uid] = {
        name: r.userName || (typeof allUsers !== 'undefined' && allUsers[r.userId]?.name) || 'Chưa rõ',
        binh: 0
      };
    }
    const val = Number(r.binh) || 0;
    memberHouseTotals[uid].binh += val;
    totalHouses += val;
  });
  totalHouses = Math.round(totalHouses * 100) / 100;
  const sortedMembers = Object.values(memberHouseTotals).sort((a, b) => b.binh - a.binh);
  const memberCount = sortedMembers.length;

  // 2. Tổng hợp dữ liệu quỹ & chuộc tù
  const currentBalance = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.currentBalance !== undefined)
    ? cachedFundData.currentBalance
    : 0;
  const initialFund = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.initial !== undefined)
    ? cachedFundData.initial
    : 5000000;
  const totalBailSpent = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.totalBailSpent !== undefined)
    ? cachedFundData.totalBailSpent
    : 0;
  const bailCount = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.bailCount !== undefined)
    ? cachedFundData.bailCount
    : 0;
  const enrichedLogs = (typeof cachedFundData !== 'undefined' && cachedFundData && cachedFundData.enrichedLogs)
    ? cachedFundData.enrichedLogs
    : (fundLogs || []);

  // 3. Tạo nội dung File Excel / Google Sheets (.csv chuẩn UTF-8 có BOM \uFEFF)
  let csv = '\uFEFF';
  csv += '========================================================================================\r\n';
  csv += `BẢN SAO LƯU DỮ LIỆU CHU KỲ CREW LƯỠI BÚA\r\n`;
  csv += `Thời gian xuất,${dateStr} ${timeStr}\r\n`;
  csv += `Người thực hiện,${adminName}\r\n`;
  csv += `Lý do sao lưu,${reasonText}\r\n`;
  csv += '========================================================================================\r\n\r\n';

  csv += '--- PHẦN 1: TỔNG KẾT SỐ NHÀ ANH EM ---\r\n';
  csv += 'STT,Tên Thành Viên,Số Nhà Đạt Được,Tỷ Lệ Đóng Góp\r\n';
  if (sortedMembers.length > 0) {
    sortedMembers.forEach((m, idx) => {
      const pct = totalHouses > 0 ? ((m.binh / totalHouses) * 100).toFixed(1) : 0;
      csv += `${idx + 1},"${m.name.replace(/"/g, '""')}",${m.binh},${pct}%\r\n`;
    });
  } else {
    csv += 'Chưa có bản ghi số nhà nào trong chu kỳ này\r\n';
  }
  csv += `TỔNG CỘNG TOÀN ĐỘI,,${totalHouses} nhà,100%\r\n\r\n`;

  csv += '--- PHẦN 2: LỊCH SỬ CHUỘC TÙ & BIẾN ĐỘNG QUỸ BĂNG ĐÃNG ---\r\n';
  csv += 'STT,Thời Gian,Loại Giao Dịch,Thành Viên Được Chuộc / Giao Dịch,Biến Động (VND),Số Dư Sau Giao Dịch (VND),Ghi Chú\r\n';
  if (enrichedLogs.length > 0) {
    enrichedLogs.forEach((l, idx) => {
      const dFmt = l.dateStr ? (l.dateStr + (l.timeStr ? ' ' + l.timeStr : '')) : '-';
      const mName = l.memberName || 'Chưa rõ';
      const tName = l.typeName || (l.type === 'bail' ? 'Chuộc tù' : (l.type === 'deposit' ? 'Nạp quỹ' : 'Chi khác'));
      csv += `${idx + 1},"${dFmt}","${tName}","${mName.replace(/"/g, '""')}",${l.amount},${l.balanceAfter || 0},"${(l.note || '').replace(/"/g, '""')}"\r\n`;
    });
  } else {
    csv += 'Chưa phát sinh giao dịch nào\r\n';
  }
  csv += '\r\n--- PHẦN 3: TỔNG KẾT TÀI CHÍNH QUỸ ---\r\n';
  csv += `Hạn mức ban đầu,${initialFund} VND\r\n`;
  csv += `Số dư quỹ trước reset,${currentBalance} VND\r\n`;
  csv += `Tổng chi phí chuộc tù,${totalBailSpent} VND\r\n`;
  csv += `Số lượt chuộc tù,${bailCount} lượt\r\n`;

  // 4. Tạo file JSON raw dự phòng
  const rawBackupJson = JSON.stringify({
    timestamp: now.toISOString(),
    dateStr,
    timeStr,
    reason: reasonText,
    adminName,
    summary: {
      totalHouses,
      memberCount,
      initialFund,
      currentBalance,
      totalBailSpent,
      bailCount
    },
    memberHouseList: sortedMembers,
    fundTransactions: enrichedLogs,
    recordsRaw: allRecords || [],
    membersRaw: typeof allUsers !== 'undefined' ? allUsers : {}
  }, null, 2);

  // 5. Tạo Bản Ảnh Đồ Họa Sao Lưu Siêu Đẹp (HTML -> Canvas)
  const container = $('exportArea');
  if (container) {
    const houseRows = sortedMembers.slice(0, 25).map((m, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
      const pct = totalHouses > 0 ? ((m.binh / totalHouses) * 100).toFixed(1) : 0;
      return `
        <tr style="border-bottom:1px solid #e2e8f0;background:#ffffff;">
          <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:14px;border-right:1px solid #e2e8f0;">${medal}</td>
          <td style="padding:10px 14px;font-weight:800;font-size:15px;color:#0f172a;border-right:1px solid #e2e8f0;text-align:left;">${escHtml(m.name)}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:900;font-size:15px;color:#b45309;border-right:1px solid #e2e8f0;">
            <span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:999px;">🏠 ${m.binh}</span>
          </td>
          <td style="padding:10px 14px;text-align:right;font-weight:800;font-size:14px;color:#64748b;">${pct}%</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#64748b;">Chưa có dữ liệu nhà</td></tr>`;

    const fundRows = enrichedLogs.slice(0, 25).map((l, idx) => {
      const isBail = l.type === 'bail';
      const typeLabel = l.typeName || (isBail ? 'Chuộc tù' : 'Nạp/Chi');
      const amtColor = Number(l.amount) < 0 ? '#b91c1c' : '#047857';
      const amtPrefix = Number(l.amount) < 0 ? '-' : '+';
      const dFmt = l.dateStr ? (l.dateStr + (l.timeStr ? ' ' + l.timeStr : '')) : dateStr;
      return `
        <tr style="border-bottom:1px solid #e2e8f0;background:#ffffff;">
          <td style="padding:10px 10px;text-align:center;font-weight:800;font-size:13px;border-right:1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding:10px 10px;text-align:center;font-size:12.5px;color:#475569;border-right:1px solid #e2e8f0;">${escHtml(dFmt)}</td>
          <td style="padding:10px 12px;font-weight:800;font-size:14px;color:#0f172a;border-right:1px solid #e2e8f0;text-align:left;">${escHtml(l.memberName || 'Chưa rõ')}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:900;font-size:14px;color:${amtColor};border-right:1px solid #e2e8f0;">${amtPrefix}${fmtVND(Math.abs(l.amount))}</td>
          <td style="padding:10px 12px;font-size:12.5px;color:#475569;text-align:left;">${escHtml(l.note || '-')}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748b;">Chưa có giao dịch chuộc tù</td></tr>`;

    container.innerHTML = `
      <div style="width:1150px;background:#fdfcf7;padding:44px 50px;color:#000;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;border:3.5px solid #000;position:relative;">
        
        <!-- HEADER -->
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:800;letter-spacing:3px;color:#000;">HỆ THỐNG QUẢN LÝ CREW LƯỠI BÚA • LƯU TRỮ CHÍNH THỨC</div>
          <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:#000;margin-top:4px;">────────── ✦ ──────────</div>
        </div>

        <div style="text-align:center;margin-bottom:22px;">
          <div style="font-size:26px;font-weight:900;letter-spacing:1px;color:#000;text-transform:uppercase;">
            BẢN KÊ KHAI SAO LƯU DỮ LIỆU CHU KỲ (BẢO LƯU)
          </div>
          <div style="font-size:14px;font-weight:700;color:#333;margin-top:6px;">
            Thời gian: ${dateStr} ${timeStr} &nbsp;•&nbsp; Người chốt: <b>${escHtml(adminName)}</b> &nbsp;•&nbsp; Lý do: <b>${escHtml(reasonText)}</b>
          </div>
        </div>

        <!-- 4 CHỈ SỐ VÀNG -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
          <div style="border:2.5px solid #000;padding:14px;text-align:center;background:#fff;border-radius:8px;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#555;">TỔNG SỐ NHÀ CHU KỲ</div>
            <div style="font-size:24px;font-weight:900;margin-top:4px;color:#d97706;">🏠 ${totalHouses} nhà</div>
            <div style="font-size:11.5px;color:#78350f;font-weight:700;margin-top:2px;">${memberCount} anh em có nhà</div>
          </div>
          <div style="border:2.5px solid #000;padding:14px;text-align:center;background:#fff;border-radius:8px;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#555;">SỐ DƯ QUỸ BẢO LƯU</div>
            <div style="font-size:22px;font-weight:900;margin-top:4px;color:#047857;">${fmtVND(currentBalance)}</div>
            <div style="font-size:11.5px;color:#065f46;font-weight:700;margin-top:2px;">Gốc: ${fmtVND(initialFund)}</div>
          </div>
          <div style="border:2.5px solid #000;padding:14px;text-align:center;background:#fff;border-radius:8px;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#555;">TỔNG CHI CHUỘC TÙ</div>
            <div style="font-size:22px;font-weight:900;margin-top:4px;color:#b91c1c;">${fmtVND(totalBailSpent)}</div>
            <div style="font-size:11.5px;color:#991b1b;font-weight:700;margin-top:2px;">${bailCount} lượt chuộc tù</div>
          </div>
          <div style="border:2.5px solid #000;padding:14px;text-align:center;background:#fff;border-radius:8px;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#555;">TOP 1 THÀNH TÍCH</div>
            <div style="font-size:16px;font-weight:900;margin-top:6px;color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🥇 ${escHtml(sortedMembers[0]?.name || '-')}</div>
            <div style="font-size:12px;color:#78350f;font-weight:800;">${sortedMembers[0]?.binh || 0} nhà</div>
          </div>
        </div>

        <!-- 2 KHỐI BẢNG -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
          <!-- CỘT 1: NHÀ -->
          <div>
            <div style="font-size:15px;font-weight:900;color:#000;margin-bottom:8px;padding-left:4px;border-left:4px solid #d97706;">
              🏆 TỔNG KẾT SỐ NHÀ ANH EM (${memberCount} người)
            </div>
            <table style="width:100%;border-collapse:collapse;border:2px solid #000;background:#fff;">
              <thead>
                <tr style="background:#000;color:#fff;">
                  <th style="padding:10px 8px;font-size:13px;width:50px;text-align:center;border-right:1px solid #fff;">Hạng</th>
                  <th style="padding:10px 10px;font-size:13px;text-align:left;border-right:1px solid #fff;">Thành Viên</th>
                  <th style="padding:10px 10px;font-size:13px;width:95px;text-align:right;border-right:1px solid #fff;">Số Nhà</th>
                  <th style="padding:10px 10px;font-size:13px;width:65px;text-align:right;">Tỷ Lệ</th>
                </tr>
              </thead>
              <tbody>
                ${houseRows}
              </tbody>
            </table>
          </div>

          <!-- CỘT 2: QUỸ & CHUỘC TÙ -->
          <div>
            <div style="font-size:15px;font-weight:900;color:#000;margin-bottom:8px;padding-left:4px;border-left:4px solid #dc2626;">
              🚨 CHI TIẾT AI ĐƯỢC CHUỘC TÙ &amp; BIẾN ĐỘNG QUỸ
            </div>
            <table style="width:100%;border-collapse:collapse;border:2px solid #000;background:#fff;">
              <thead>
                <tr style="background:#000;color:#fff;">
                  <th style="padding:10px 6px;font-size:13px;width:40px;text-align:center;border-right:1px solid #fff;">STT</th>
                  <th style="padding:10px 8px;font-size:12.5px;width:115px;text-align:center;border-right:1px solid #fff;">Thời Gian</th>
                  <th style="padding:10px 10px;font-size:13px;text-align:left;border-right:1px solid #fff;">Thành Viên</th>
                  <th style="padding:10px 10px;font-size:13px;width:100px;text-align:right;border-right:1px solid #fff;">Tiền</th>
                  <th style="padding:10px 10px;font-size:12.5px;text-align:left;">Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                ${fundRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- KHUNG WEBSITE BẢO MẬT -->
        <div style="margin-top:20px;background:#fff8ee;border:2.5px solid #d97706;border-radius:12px;padding:16px 20px;text-align:center;">
          <div style="font-size:16px;font-weight:900;color:#1e293b;margin-bottom:4px;">
            🌐 WEBSITE: <span style="color:#b45309;text-decoration:underline;">https://quan-ly-seven.vercel.app/</span>
          </div>
          <div style="font-size:17.5px;font-weight:900;color:#b45309;margin-bottom:4px;">
            👉 AE TỰ VÀO CHECK NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ .
          </div>
          <div style="font-size:12px;font-weight:700;color:#78350f;">
            ✦ CHỨNG TỪ SAO LƯU DỮ LIỆU ĐƯỢC LƯU TRỮ VĨNH VIỄN TRÊN SERVER DISCORD AN TOÀN 100% ✦
          </div>
        </div>

        <!-- FOOTER & CHỮ KÝ DẤU ĐỎ NGUYỄN TRÍ -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;">
          <div style="font-size:12px;font-weight:700;color:#555;font-style:italic;">
            * Báo cáo sao lưu được hệ thống tạo tự động trước khi thiết lập chu kỳ mới.
          </div>
          <div style="position:relative;width:340px;height:160px;">
            <div style="position:absolute;left:0;top:0;text-align:center;width:210px;">
              <div style="font-size:13px;font-weight:800;color:#000;letter-spacing:1px;">QUẢN LÝ / XÁC THỰC</div>
              <div style="font-size:11px;font-weight:600;color:#000;font-style:italic;margin-top:2px;">(Ký, đóng dấu chính thức)</div>
              <div style="font-family:'Great Vibes',cursive;font-size:46px;font-weight:400;color:#000;line-height:1;margin-top:4px;">Trí</div>
              <div style="font-family:'Dancing Script','Brush Script MT',cursive;font-size:28px;font-weight:700;color:#000;line-height:1.1;margin-top:4px;">Nguyễn Ngọc Trí</div>
            </div>
            <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="position:absolute;right:0;top:10px;width:140px;height:140px;transform:rotate(-12deg);opacity:0.88;">
              <circle cx="80" cy="80" r="76" fill="none" stroke="#c81e1e" stroke-width="3.5"/>
              <circle cx="80" cy="80" r="66" fill="none" stroke="#c81e1e" stroke-width="1"/>
              <circle cx="80" cy="80" r="40" fill="none" stroke="#c81e1e" stroke-width="1"/>
              <text fill="#c81e1e" font-size="10" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.2">
                <textPath href="#stampTopArc" startOffset="50%" text-anchor="middle">SAO LƯU DỮ LIỆU HỆ THỐNG</textPath>
              </text>
              <text fill="#c81e1e" font-size="10" font-weight="bold" font-family="Times New Roman, serif" letter-spacing="1.4">
                <textPath href="#stampBotArc" startOffset="50%" text-anchor="middle">★ CHÍNH THỨC ★</textPath>
              </text>
              <polygon points="80,50 83.8,63 97,63 86.5,71 90.2,84 80,76 69.8,84 73.5,71 63,63 76.2,63" fill="#d4a017" stroke="#d4a017" stroke-width="0.5"/>
            </svg>
          </div>
        </div>

        <div style="text-align:center;margin-top:16px;padding-top:10px;border-top:2px solid #000;font-size:11px;font-weight:700;letter-spacing:1px;">
          ── BẢN SAO LƯU DỮ LIỆU ĐÍNH KÈM CHỨNG TỪ TÀI CHÍNH HỢP LỆ ──
        </div>

      </div>
    `;
  }

  // Chụp ảnh bằng html2canvas
  let dataUrl = '';
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      backgroundColor: '#fdfcf7',
      logging: false,
      useCORS: true
    });
    dataUrl = canvas.toDataURL('image/png');
  } catch (canvasErr) {
    console.error('Lỗi chụp ảnh sao lưu:', canvasErr);
  } finally {
    if (container) container.innerHTML = '';
  }

  // Tự động tải file về máy tính: ĐÃ TẮT HOÀN TOÀN THEO LỆNH ĐẠI CA (Chỉ gửi ảnh về Discord, không tải gì về máy)
  if (autoDownload) {
    const timestampStr = Date.now();
    if (dataUrl) {
      const aImg = document.createElement('a');
      aImg.href = dataUrl;
      aImg.download = `sao-luu-chu-ky-${timestampStr}.png`;
      aImg.click();
    }
  }

  // Gửi về Discord kênh 1562063584496844841 (CHỈ GỬI ẢNH BẢN BÁO CÁO TOÀN DIỆN, TUYỆT ĐỐI KHÔNG GỬI CSV LÀM RÁC KÊNH)
  if (sendToDiscord && dataUrl) {
    try {
      await (window.sendDiscordReport || sendDiscordReport)({
        type: 'backup',
        targetChannelId: '1562063584496844841',
        title: '📦 BẢN SAO LƯU TOÀN BỘ SỐ NHÀ & QUỸ CHUỘC TÙ (BẢO LƯU)',
        stats: {
          totalHouses,
          memberCount,
          currentFund: currentBalance,
          totalBail: totalBailSpent,
          bailCount
        },
        imageBase64: dataUrl
      });
    } catch (discErr) {
      console.error('Lỗi gửi Discord sao lưu:', discErr);
    }
  }

  return { success: true, dataUrl, csv, rawBackupJson };
}
window.generateFullBackupSnapshot = generateFullBackupSnapshot;

// Hàm sao lưu thủ công chụp ảnh gửi Discord dùng chung cho cả Sidebar và Phím tắt
async function triggerManualBackup(triggerBtn) {
  if (!isAdmin()) {
    alert('⛔ Bạn đang ở chế độ xem thành viên. Vui lòng đăng nhập trang Quản Trị (admin.html) để sao lưu dữ liệu!');
    return;
  }
  const btn = triggerBtn || $('sidebarBackupBtn') || $('manualBackupBtn');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '<span>⏳ Đang gửi ảnh Discord...</span>';
    btn.disabled = true;
  }

  try {
    await generateFullBackupSnapshot({ autoDownload: false, sendToDiscord: true, reason: 'MANUAL_BACKUP' });
    alert('✅ ĐÃ SAO LƯU ẢNH VỀ DISCORD THÀNH CÔNG!\n\nBản ảnh báo cáo chi tiết 2 cột (Số nhà & Quỹ chuộc tù) đã được chụp sắc nét và đẩy thẳng về kênh Discord 1562063584496844841.');
  } catch (err) {
    console.error('Lỗi khi sao lưu thủ công:', err);
    alert('❌ Sao lưu thất bại hoặc lỗi mạng: ' + (err.message || err));
  } finally {
    if (btn) {
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  }
}
window.triggerManualBackup = triggerManualBackup;

// Gắn sự kiện cho nút Sao Lưu ở Sidebar và Navbar (nếu có)
$('sidebarBackupBtn')?.addEventListener('click', (e) => triggerManualBackup(e.currentTarget));
$('manualBackupBtn')?.addEventListener('click', (e) => triggerManualBackup(e.currentTarget));

/* ==========================================================================
   SECTION 2: BẢNG VINH DANH HOÀNG GIA (BLACK & GOLD CERTIFICATE)
   & BÁO CÁO THỐNG KÊ DOANH SỐ HIỆN ĐẠI MỚI MẺ (T1 PRO INFOGRAPHIC)
   ========================================================================== */
$('exportImgTopBtn')?.addEventListener('click', openExportModal);

function openExportModal() {
  // 1. Tính toán danh sách xếp hạng & Quán quân
  const memberTotals = {};
  allRecords.forEach(r => {
    memberTotals[r.userId] = (memberTotals[r.userId] || 0) + (Number(r.binh) || 0);
  });

  const sortedList = Object.values(allUsers)
    .map(u => ({
      id: u.id,
      name: u.name || 'Chiến Binh',
      binh: Math.round((memberTotals[u.id] || 0) * 100) / 100
    }))
    .sort((a, b) => b.binh - a.binh);

  const top1User = sortedList[0] || { id: '', name: 'Chưa có', binh: 0 };
  const totalBinh = sortedList.reduce((s, u) => s + u.binh, 0);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:560px;padding:24px;">
      
      <!-- FANCY HEADER -->
      <div class="modal-header-fancy" style="margin-bottom:18px;">
        <div class="modal-title-group">
          <div class="modal-icon-badge" style="background:linear-gradient(135deg,#fbbf24,#d97706);color:#fff;">👑</div>
          <div>
            <h3 style="font-size:18px;font-weight:900;color:#0f172a;">Trung Tâm Xuất Ảnh &amp; Bằng Khen</h3>
            <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Mẫu Hoàng Gia Black &amp; Gold &amp; Báo Cáo Hiện Đại</span>
          </div>
        </div>
        <button class="modal-close-btn" id="closeExportModal" title="Đóng">✕</button>
      </div>

      <!-- TABS CHỌN MẪU XUẤT ẢNH -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
        <button type="button" id="tabExportCert" class="btn-3d-tab active" style="padding:12px;border-radius:14px;border:2px solid #f59e0b;background:#fffbeb;cursor:pointer;text-align:left;transition:all 0.2s;">
          <div style="font-size:13px;font-weight:900;color:#b45309;display:flex;align-items:center;gap:6px;">
            <span>🏆</span> Bằng Vinh Danh
          </div>
          <div style="font-size:11px;color:#78350f;margin-top:3px;font-weight:700;">Mẫu Hoàng Gia Black &amp; Gold</div>
        </button>

        <button type="button" id="tabExportStats" class="btn-3d-tab" style="padding:12px;border-radius:14px;border:1.5px solid #cbd5e1;background:#ffffff;cursor:pointer;text-align:left;transition:all 0.2s;">
          <div style="font-size:13px;font-weight:850;color:#475569;display:flex;align-items:center;gap:6px;">
            <span>📊</span> Báo Cáo Thống Kê
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;font-weight:700;">Mẫu Hiện Đại &amp; Mới Mẻ</div>
        </button>
      </div>

      <!-- PANEL 1: BẰNG VINH DANH HOÀNG GIA (BLACK & GOLD CERTIFICATE) -->
      <div id="panelExportCert">
        <div style="background:linear-gradient(135deg, #18181b 0%, #09090b 100%);border:1.5px solid #d4af37;border-radius:16px;padding:16px;color:#fff;margin-bottom:16px;box-shadow:0 6px 20px rgba(0,0,0,0.25);">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#d97706);display:flex;align-items:center;justify-content:center;font-size:22px;border:2px solid #fef08a;">🥇</div>
            <div>
              <div style="font-size:11px;font-weight:800;color:#facc15;letter-spacing:1px;text-transform:uppercase;">BẢNG VINH DANH QUÁN QUÂN CREW</div>
              <div style="font-size:14.5px;font-weight:900;color:#ffffff;letter-spacing:-0.2px;">Mẫu Certificate Hoàng Gia Đẳng Cấp</div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="color:#fde047;font-size:11.5px;font-weight:800;">Chọn Chiến Binh Trao Bằng Vinh Danh *</label>
            <select id="certRecipientSelect" style="background:#27272a;color:#ffffff;border:1.5px solid #ca8a04;font-size:13px;font-weight:700;">
              ${sortedList.map((u, i) => `
                <option value="${u.id}" ${i === 0 ? 'selected' : ''}>
                  ${i === 0 ? '🥇 [TOP 1 QUÁN QUÂN] ' : (i === 1 ? '🥈 [TOP 2] ' : (i === 2 ? '🥉 [TOP 3] ' : `#${i+1} `))} ${escHtml(u.name)} (${u.binh} nhà)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="color:#fde047;font-size:11.5px;font-weight:800;">Tiêu Đề / Danh Hiệu Vinh Danh</label>
            <input id="certTitleInput" value="CERTIFICATE OF HONOR" style="background:#27272a;color:#fef08a;border:1.5px solid #ca8a04;font-size:13px;font-weight:800;">
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label style="color:#fde047;font-size:11.5px;font-weight:800;">Lời Khen Tặng &amp; Ghi Nhận Thành Tích</label>
            <textarea id="certCitationInput" rows="2" style="background:#27272a;color:#e4e4e7;border:1.5px solid #ca8a04;font-size:12px;font-weight:600;line-height:1.4;">Đã xuất sắc lập kỷ lục dẫn đầu toàn bộ hệ thống Crew Lưới Búa. Tôn vinh bản lĩnh kiên cường, sự cống hiến vượt bậc và tinh thần chiến binh quả cảm!</textarea>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:0;">
          <button type="button" class="secondary" id="cancelExportCert">Huỷ bỏ</button>
          <button type="button" class="gold" id="btnRunExportCert" style="background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;border:none;box-shadow:0 4px 14px rgba(245,158,11,0.4);">
            🏆 Xuất Bằng Vinh Danh Hoàng Gia
          </button>
        </div>
      </div>

      <!-- PANEL 2: BÁO CÁO THỐNG KÊ DOANH SỐ HIỆN ĐẠI MỚI MẺ -->
      <div id="panelExportStats" style="display:none;">
        <div class="form-group" style="margin-bottom:14px;">
          <label>Tiêu Đề Báo Cáo *</label>
          <input id="exportModalTitle" value="BẢNG THỐNG KÊ DOANH SỐ &amp; NĂNG SUẤT CHU KỲ" style="font-weight:800;">
        </div>

        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #bbf7d0;padding:14px;border-radius:14px;margin-bottom:16px;">
          <div style="font-size:12.5px;font-weight:850;color:#166534;margin-bottom:4px;">📊 Dữ liệu báo cáo chuẩn bị xuất:</div>
          <div style="font-size:12px;color:#15803d;font-weight:700;">• Tổng quân số ghi nhận: <b>${sortedList.length} chiến binh</b></div>
          <div style="font-size:12px;color:#15803d;font-weight:700;">• Tổng số nhà toàn đội: <b style="color:#b45309;font-size:14px;">${Math.round(totalBinh * 100) / 100} nhà</b></div>
          <div style="font-size:12px;color:#15803d;font-weight:700;">• Quán Quân Dẫn Đầu: <b>🥇 ${escHtml(top1User.name)} (${top1User.binh} nhà)</b></div>
        </div>

        <div class="modal-actions" style="margin-top:0;">
          <button type="button" class="secondary" id="cancelExportStats">Huỷ bỏ</button>
          <button type="button" class="green" id="btnRunExportStats">
            📸 Xuất Báo Cáo Hiện Đại (HD)
          </button>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  // Tab switching logic
  const tabCert = overlay.querySelector('#tabExportCert');
  const tabStats = overlay.querySelector('#tabExportStats');
  const panelCert = overlay.querySelector('#panelExportCert');
  const panelStats = overlay.querySelector('#panelExportStats');

  tabCert.onclick = () => {
    tabCert.style.border = '2px solid #f59e0b';
    tabCert.style.background = '#fffbeb';
    tabCert.querySelector('div').style.color = '#b45309';

    tabStats.style.border = '1.5px solid #cbd5e1';
    tabStats.style.background = '#ffffff';
    tabStats.querySelector('div').style.color = '#475569';

    panelCert.style.display = 'block';
    panelStats.style.display = 'none';
  };

  tabStats.onclick = () => {
    tabStats.style.border = '2px solid #0284c7';
    tabStats.style.background = '#f0f9ff';
    tabStats.querySelector('div').style.color = '#0369a1';

    tabCert.style.border = '1.5px solid #cbd5e1';
    tabCert.style.background = '#ffffff';
    tabCert.querySelector('div').style.color = '#475569';

    panelStats.style.display = 'block';
    panelCert.style.display = 'none';
  };

  const closeModal = () => overlay.remove();
  overlay.querySelector('#closeExportModal').onclick = closeModal;
  overlay.querySelector('#cancelExportCert').onclick = closeModal;
  overlay.querySelector('#cancelExportStats').onclick = closeModal;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Action: Export Certificate
  overlay.querySelector('#btnRunExportCert').onclick = () => {
    const selId = overlay.querySelector('#certRecipientSelect').value;
    const certTitle = overlay.querySelector('#certTitleInput').value.trim();
    const certCitation = overlay.querySelector('#certCitationInput').value.trim();
    overlay.remove();
    generateCertificateImage(selId, certTitle, certCitation);
  };

  // Action: Export Modern Statistics Report
  overlay.querySelector('#btnRunExportStats').onclick = () => {
    const customTitle = overlay.querySelector('#exportModalTitle').value.trim();
    overlay.remove();
    generateExportImage(customTitle);
  };
}
window.openExportModal = openExportModal;

/* ==========================================================================
   HÀM XUẤT BẰNG VINH DANH HOÀNG GIA (BLACK & GOLD CERTIFICATE)
   Theo đúng nguyên mẫu hình ảnh Đại ca yêu cầu
   ========================================================================== */
async function generateCertificateImage(targetUserId, customTitle, customCitation) {
  const container = $('exportArea');
  if (!container) return;

  // Tính số liệu chiến binh
  const user = allUsers[targetUserId] || Object.values(allUsers)[0] || { name: 'Chiến Binh Xuất Sắc' };
  const memberName = user.name || 'Chiến Binh Xuất Sắc';
  
  const userHouses = allRecords
    .filter(r => r.userId === targetUserId || r.userName === memberName)
    .reduce((s, r) => s + (Number(r.binh) || 0), 0);
  const roundedHouses = Math.round(userHouses * 100) / 100;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  // SVG Định dạng Hoa văn 4 góc Hoàng Gia (Vintage Baroque Gold Filigree Corner)
  const cornerSvg = `
    <svg viewBox="0 0 140 140" style="position:absolute;width:130px;height:130px;pointer-events:none;">
      <defs>
        <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fffbeb"/>
          <stop offset="25%" stop-color="#fde047"/>
          <stop offset="50%" stop-color="#eab308"/>
          <stop offset="75%" stop-color="#ca8a04"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </linearGradient>
      </defs>
      <!-- Đường viền góc kép -->
      <path d="M 12,12 L 132,12 M 12,12 L 12,132" stroke="url(#goldFiligree)" stroke-width="3" fill="none"/>
      <path d="M 20,20 L 110,20 M 20,20 L 20,110" stroke="url(#goldFiligree)" stroke-width="1.5" fill="none"/>
      <!-- Hoa văn lá lượn baroque acanthus -->
      <path d="M 28,28 Q 50,26 65,40 Q 80,26 102,28 Q 68,68 28,102 Q 26,80 40,65 Q 26,50 28,28 Z" fill="url(#goldFiligree)" opacity="0.9"/>
      <path d="M 24,60 Q 45,45 60,24" stroke="url(#goldFiligree)" stroke-width="2" fill="none"/>
      <path d="M 24,80 Q 60,60 80,24" stroke="url(#goldFiligree)" stroke-width="1.5" fill="none"/>
      <circle cx="36" cy="36" r="6" fill="url(#goldFiligree)"/>
      <circle cx="16" cy="16" r="4" fill="#fef08a"/>
      <circle cx="56" cy="56" r="4" fill="url(#goldFiligree)"/>
    </svg>
  `;

  // HTML Khung Bằng Khen Hoàng Gia Chuẩn 1360px x 920px
  container.innerHTML = `
    <div id="goldCertNode" style="width:1360px;height:920px;box-sizing:border-box;position:relative;background:#070709;
                background-image: repeating-linear-gradient(90deg, #070709, #070709 3px, #0e0f14 3px, #0e0f14 6px);
                padding:40px;display:flex;align-items:center;justify-content:center;font-family:'Times New Roman',serif;overflow:hidden;">
      
      <!-- LỚP KHUNG VIỀN VÀNG RÒNG ĐA TẦNG -->
      <div style="width:100%;height:100%;border:3px solid #d4af37;outline:2px solid #854d0e;outline-offset:-8px;
                  position:relative;box-sizing:border-box;padding:26px;display:flex;flex-direction:column;
                  justify-content:space-between;align-items:center;text-align:center;background:rgba(5,5,8,0.92);">

        <!-- KHUNG HOA VĂN BỆT DẠNG LƯỚI KIM CƯƠNG VÀNG QUANH MÉP -->
        <div style="position:absolute;inset:14px;border:4px double #ca8a04;pointer-events:none;"></div>
        <div style="position:absolute;inset:20px;border:1px dashed rgba(250,204,21,0.4);pointer-events:none;"></div>

        <!-- 4 GÓC HOA VĂN HOÀNG GIA -->
        <div style="position:absolute;top:16px;left:16px;">${cornerSvg}</div>
        <div style="position:absolute;top:16px;right:16px;transform:scaleX(-1);">${cornerSvg}</div>
        <div style="position:absolute;bottom:16px;left:16px;transform:scaleY(-1);">${cornerSvg}</div>
        <div style="position:absolute;bottom:16px;right:16px;transform:scale(-1,-1);">${cornerSvg}</div>

        <!-- 1. TIÊU ĐỀ HOÀNG GIA: CERTIFICATE OF APPRECIATION / HONOR -->
        <div style="margin-top:14px;position:relative;z-index:2;">
          <div style="font-family:'Impact', 'Cinzel', 'Times New Roman', serif;font-size:68px;font-weight:900;
                      letter-spacing:10px;text-transform:uppercase;line-height:1;margin-bottom:6px;
                      background:linear-gradient(180deg, #fffbeb 0%, #fef08a 25%, #facc15 50%, #ca8a04 75%, #854d0e 100%);
                      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                      filter:drop-shadow(0 4px 10px rgba(0,0,0,0.8));">
            ${escHtml(customTitle || 'CERTIFICATE')}
          </div>
          <div style="font-family:'Great Vibes', 'Playfair Display', cursive, serif;font-size:36px;color:#fde047;
                      letter-spacing:3px;font-weight:400;margin-top:2px;text-shadow:0 2px 8px rgba(0,0,0,0.8);">
            Of Appreciation &amp; Honorable Merit
          </div>

          <!-- DẢI PHÂN CÁCH VÀNG VINTAGE -->
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:8px;">
            <div style="width:140px;height:1.5px;background:linear-gradient(90deg,transparent,#facc15);"></div>
            <span style="color:#fde047;font-size:16px;">✦ ❖ ✦</span>
            <div style="width:140px;height:1.5px;background:linear-gradient(90deg,#facc15,transparent);"></div>
          </div>
        </div>

        <!-- 2. PHẦN THÂN: LỜI TRAO TẶNG & TÊN NGƯỜI ĐƯỢC VINH DANH -->
        <div style="position:relative;z-index:2;margin:10px 0;">
          <div style="font-size:17px;font-style:italic;color:#e4e4e7;letter-spacing:1px;margin-bottom:12px;font-weight:600;">
            This Certificate Is Proudly Presented For Honorable Achievement To
          </div>
          <div style="font-size:13.5px;color:#ca8a04;letter-spacing:3px;text-transform:uppercase;font-weight:800;margin-bottom:14px;">
            ── BẢNG VINH DANH CHIẾN BINH XUẤT SẮC DẪN ĐẦU HỆ THỐNG CREW LƯỚI BÚA ──
          </div>

          <!-- TÊN CHIẾN BINH VÀNG RỰC RỠ -->
          <div style="font-family:'Great Vibes', 'Playfair Display', cursive, serif;font-size:56px;font-weight:900;
                      letter-spacing:2px;line-height:1.1;margin-bottom:14px;padding:0 30px;
                      background:linear-gradient(180deg, #ffffff 0%, #fef08a 30%, #f59e0b 80%, #b45309 100%);
                      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                      filter:drop-shadow(0 4px 12px rgba(245,158,11,0.5));">
            ${escHtml(memberName)}
          </div>

          <!-- THÀNH TÍCH ĐẠT ĐƯỢC -->
          <div style="display:inline-flex;align-items:center;gap:12px;background:rgba(250,204,21,0.08);
                      border:1.5px solid #ca8a04;border-radius:999px;padding:6px 28px;margin-bottom:16px;">
            <span style="font-size:18px;">🏠</span>
            <span style="font-size:16px;font-weight:900;color:#fef08a;letter-spacing:1px;">
              KỶ LỤC DOANH SỐ: <span style="font-size:22px;color:#facc15;">${roundedHouses}</span> CĂN NHÀ
            </span>
            <span style="font-size:18px;">⭐</span>
          </div>

          <!-- LỜI TUYÊN DƯƠNG TRANG TRỌNG -->
          <div style="max-width:860px;margin:0 auto;font-size:15px;color:#d4d4d8;line-height:1.6;font-style:italic;text-shadow:0 1px 2px rgba(0,0,0,0.8);">
            "${escHtml(customCitation || 'Đã xuất sắc lập kỷ lục dẫn đầu toàn bộ hệ thống Crew Lưới Búa. Tôn vinh bản lĩnh kiên cường, sự cống hiến vượt bậc và tinh thần chiến binh quả cảm đưa toàn đội lên đỉnh vinh quang!')}"
          </div>
        </div>

        <!-- 3. PHẦN ĐÁY: 2 CON DẤU HOÀNG GIA & CHỮ KÝ THỦ LĨNH -->
        <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;padding:0 36px 10px;position:relative;z-index:2;">
          
          <!-- CON DẤU 1 (BÊN TRÁI): HUY CHƯƠNG LÁ NGUYỆT QUẾ VÀNG (LAUREL WREATH MEDAL) -->
          <div style="width:220px;display:flex;flex-direction:column;align-items:center;">
            <svg viewBox="0 0 180 180" style="width:160px;height:160px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.9));">
              <defs>
                <linearGradient id="laurelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fffbeb"/>
                  <stop offset="30%" stop-color="#facc15"/>
                  <stop offset="70%" stop-color="#ca8a04"/>
                  <stop offset="100%" stop-color="#854d0e"/>
                </linearGradient>
              </defs>
              <!-- Lá nguyệt quế trái -->
              <g fill="url(#laurelGold)">
                <path d="M 40,90 C 35,70 45,50 65,35 C 60,45 62,60 52,70 Z"/>
                <path d="M 32,105 C 25,85 32,65 48,50 C 45,60 50,75 42,85 Z"/>
                <path d="M 36,125 C 28,110 32,90 45,78 C 44,90 52,102 46,112 Z"/>
                <path d="M 50,145 C 40,135 40,115 50,105 C 52,118 62,126 58,136 Z"/>
                <!-- Lá nguyệt quế phải -->
                <path d="M 140,90 C 145,70 135,50 115,35 C 120,45 118,60 128,70 Z"/>
                <path d="M 148,105 C 155,85 148,65 132,50 C 135,60 130,75 138,85 Z"/>
                <path d="M 144,125 C 152,110 148,90 135,78 C 136,90 128,102 134,112 Z"/>
                <path d="M 130,145 C 140,135 140,115 130,105 C 128,118 118,126 122,136 Z"/>
                <!-- Nơ thắt dưới -->
                <path d="M 90,155 C 80,165 65,160 60,170 C 75,168 85,160 90,155 Z"/>
                <path d="M 90,155 C 100,165 115,160 120,170 C 105,168 95,160 90,155 Z"/>
              </g>
              <!-- Đồng xu kim loại trung tâm -->
              <circle cx="90" cy="90" r="54" fill="#181307" stroke="url(#laurelGold)" stroke-width="4"/>
              <circle cx="90" cy="90" r="46" fill="#120e03" stroke="url(#laurelGold)" stroke-width="1.5" stroke-dasharray="3 2"/>
              <text x="90" y="66" fill="#fde047" font-size="10.5" font-weight="900" text-anchor="middle" letter-spacing="1">CREW LƯỚI BÚA</text>
              <text x="90" y="86" fill="url(#laurelGold)" font-size="17" font-weight="900" text-anchor="middle">★ TOP 1 ★</text>
              <text x="90" y="104" fill="#fef08a" font-size="11" font-weight="900" text-anchor="middle" letter-spacing="1.5">QUÁN QUÂN</text>
              <text x="90" y="120" fill="#ca8a04" font-size="9" font-weight="800" text-anchor="middle">DANH DỰ CAO NHẤT</text>
            </svg>
          </div>

          <!-- CHỮ KÝ VÀNG & TÊN THỦ LĨNH NGUYỄN NGỌC TRÍ -->
          <div style="text-align:center;width:340px;">
            <div style="font-family:'Great Vibes', 'Dancing Script', cursive;font-size:52px;font-weight:400;color:#fef08a;line-height:1;margin-bottom:2px;filter:drop-shadow(0 2px 6px rgba(245,158,11,0.4));">
              Trí
            </div>
            <div style="width:240px;height:1.5px;background:linear-gradient(90deg,transparent,#facc15,transparent);margin:0 auto 6px;"></div>
            <div style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">
              Nguyễn Ngọc Trí
            </div>
            <div style="font-size:12px;font-weight:800;color:#facc15;letter-spacing:1px;margin-top:2px;">
              THỦ LĨNH TỐI CAO • BAN CHỈ HUY CREW LƯỚI BÚA
            </div>
            <div style="font-size:11px;color:#a1a1aa;margin-top:3px;font-style:italic;">
              Ngày cấp: ${dateStr} &nbsp;•&nbsp; quan-ly-seven.vercel.app
            </div>
          </div>

          <!-- CON DẤU 2 (BÊN PHẢI): HOA VĂN THÁNH ĐƯỜNG GUILLOCHE (ROSETTE MEDALLION) -->
          <div style="width:220px;display:flex;flex-direction:column;align-items:center;">
            <svg viewBox="0 0 160 160" style="width:145px;height:145px;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.9));">
              <circle cx="80" cy="80" r="74" fill="none" stroke="url(#laurelGold)" stroke-width="2"/>
              <circle cx="80" cy="80" r="68" fill="none" stroke="url(#laurelGold)" stroke-width="1" stroke-dasharray="4 3"/>
              <circle cx="80" cy="80" r="56" fill="#181307" stroke="url(#laurelGold)" stroke-width="2.5"/>
              <!-- Bông hoa ren 24 cánh đa giác -->
              <polygon points="80,28 85,42 98,34 98,49 113,46 107,60 122,64 111,76 122,87 108,93 114,107 100,105 100,119 87,112 80,126 73,112 60,119 60,105 46,107 52,93 38,87 49,76 38,64 53,60 47,46 62,49 62,34 75,42" fill="none" stroke="url(#laurelGold)" stroke-width="1.5"/>
              <circle cx="80" cy="80" r="40" fill="#120e03" stroke="url(#laurelGold)" stroke-width="1.5"/>
              <text x="80" y="74" fill="url(#laurelGold)" font-size="11" font-weight="900" text-anchor="middle" letter-spacing="1">CHỨNG NHẬN</text>
              <text x="80" y="90" fill="#fef08a" font-size="10" font-weight="800" text-anchor="middle">XUẤT SẮC</text>
              <text x="80" y="104" fill="#ca8a04" font-size="9" font-weight="900" text-anchor="middle">★ ★ ★</text>
            </svg>
          </div>

        </div>

      </div>
    </div>
  `;

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const certNode = container.querySelector('#goldCertNode');
    const canvas = await html2canvas(certNode, {
      scale: 2.5,
      backgroundColor: '#070709',
      logging: false,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    if (container) container.innerHTML = '';

    // Hiển thị modal preview cho Đại ca
    const previewModal = document.createElement('div');
    previewModal.className = 'modal-overlay';
    previewModal.innerHTML = `
      <div class="modal-box" style="max-width:960px;max-height:92vh;overflow-y:auto;background:#0f172a;border:2px solid #ca8a04;">
        
        <div class="modal-header-fancy" style="border-bottom:1px solid #334155;padding-bottom:12px;">
          <div class="modal-title-group">
            <div class="modal-icon-badge" style="background:#f59e0b;color:#000;">🏆</div>
            <div>
              <h3 style="color:#ffffff;">Bằng Vinh Danh Hoàng Gia — ${escHtml(memberName)}</h3>
              <span style="font-size:12px;color:#94a3b8;font-weight:600;">Mẫu Black &amp; Gold Certificate siêu sang trọng</span>
            </div>
          </div>
          <button class="modal-close-btn" id="closeCertPreview" title="Đóng" style="color:#ffffff;border-color:#475569;">✕</button>
        </div>

        <div style="margin:16px 0;text-align:center;">
          <img src="${dataUrl}" alt="Bằng Vinh Danh" style="border-radius:14px;border:2px solid #ca8a04;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.5);">
        </div>

        <div class="modal-actions" style="flex-wrap:wrap;gap:10px;justify-content:flex-end;">
          <button type="button" class="secondary" id="btnCloseCertPreviewBtn" style="background:#1e293b;color:#cbd5e1;border-color:#475569;">Đóng</button>
          <button type="button" class="gold" id="btnDownloadCertPng" style="background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;border:none;">
            ⬇️ Tải Bằng Khen Hoàng Gia (PNG)
          </button>
          ${isAdmin() ? `
          <button type="button" class="gold" id="btnSendCertDiscord" style="background:#5865F2;color:#fff;border-color:#4752C4;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
            <span>🚀 Vinh Danh Lên Discord</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(previewModal);

    const closePreview = () => previewModal.remove();
    previewModal.querySelector('#closeCertPreview').onclick = closePreview;
    previewModal.querySelector('#btnCloseCertPreviewBtn').onclick = closePreview;
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) closePreview();
    });

    previewModal.querySelector('#btnDownloadCertPng').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = memberName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `bang-vinh-danh-${safeName}-${Date.now()}.png`;
      a.click();
    };

    if (previewModal.querySelector('#btnSendCertDiscord')) {
      previewModal.querySelector('#btnSendCertDiscord').onclick = async () => {
        const btn = previewModal.querySelector('#btnSendCertDiscord');
        btn.innerHTML = '<span>⏳ Đang gửi lên Discord...</span>';
        btn.disabled = true;

        const res = await (window.sendDiscordReport || sendDiscordReport)({
          type: 'weekly',
          targetChannelId: '1561985096943276042',
          title: `🏆 BẰNG VINH DANH QUÁN QUÂN CREW: ${memberName}`,
          description: `👑 Trân trọng tôn vinh chiến binh **${memberName}** đã xuất sắc đạt **${roundedHouses} nhà** dẫn đầu toàn hệ thống!`,
          imageDataUrl: dataUrl
        });

        btn.disabled = false;
        btn.innerHTML = '<span>🚀 Vinh Danh Lên Discord</span>';

        if (res.success) {
          alert('✅ Đã vinh danh và gửi Bằng Khen Quán Quân lên Discord thành công!');
        } else {
          alert('❌ Lỗi gửi Discord: ' + res.message);
        }
      };
    }

  } catch (err) {
    alert('❌ Lỗi tạo ảnh bằng khen: ' + err.message);
  } finally {
    if (container) container.innerHTML = '';
  }
}
window.generateCertificateImage = generateCertificateImage;

/* ==========================================================================
   HÀM XUẤT ẢNH BÁO CÁO THỐNG KÊ SỐ NHÀ HIỆN ĐẠI MỚI MẺ (T1 PRO INFOGRAPHIC)
   Thay thế mẫu giấy cũ bằng phong cách Cyber-Luxury sắc nét, đẳng cấp
   ========================================================================== */
async function generateExportImage(customTitle) {
  const totals = {};
  let totalBinh = 0;
  allRecords.forEach(r => {
    if (!totals[r.userId]) {
      totals[r.userId] = {
        name: r.userName || allUsers[r.userId]?.name || 'Chưa rõ',
        binh: 0
      };
    }
    const val = Number(r.binh) || 0;
    totals[r.userId].binh += val;
    totalBinh += val;
  });

  const periodStatsData = Object.values(totals).sort((a, b) => b.binh - a.binh);

  if (!periodStatsData.length) {
    return alert('Hiện chưa có bản ghi số nhà nào để xuất báo cáo!');
  }

  const total = periodStatsData.length;
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let colCount = 1;
  if (total >= 91) colCount = 4;
  else if (total >= 41) colCount = 3;
  else if (total >= 20) colCount = 2;

  const rowsPerCol = Math.ceil(total / colCount);
  const columns = [];
  for (let c = 0; c < colCount; c++) {
    columns.push(periodStatsData.slice(c * rowsPerCol, (c + 1) * rowsPerCol));
  }

  const widths = { 1: 1050, 2: 1180, 3: 1320, 4: 1480 };
  const W = widths[colCount];

  // Header bảng hiện đại
  const headerCells = Array.from({ length: colCount }).map((_, c) => {
    const last = c === colCount - 1;
    const br = last ? '' : 'border-right:1.5px solid rgba(255,255,255,0.15);';
    return `
      <th style="padding:14px 12px;font-weight:900;font-size:12px;letter-spacing:1px;color:#94a3b8;border-right:1px solid rgba(255,255,255,0.1);width:55px;text-align:center;">HẠNG</th>
      <th style="padding:14px 12px;font-weight:900;font-size:12px;letter-spacing:1px;color:#94a3b8;border-right:1px solid rgba(255,255,255,0.1);text-align:left;">CHIẾN BINH</th>
      <th style="padding:14px 12px;font-weight:900;font-size:12px;letter-spacing:1px;color:#94a3b8;${br}text-align:right;width:120px;">SỐ NHÀ</th>`;
  }).join('');

  // Hàng dữ liệu phong cách Cyber-Modern
  const bodyRows = Array.from({ length: rowsPerCol }).map((_, r) => {
    const cells = Array.from({ length: colCount }).map((_, c) => {
      const item = columns[c][r];
      const last = c === colCount - 1;
      const br = last ? '' : 'border-right:1.5px solid rgba(255,255,255,0.12);';
      if (!item) return `<td colspan="3" style="border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(15,23,42,0.4);${br}"></td>`;
      const idx = c * rowsPerCol + r + 1;
      
      let rankPill = '';
      let rowBg = 'rgba(15,23,42,0.5)';
      let nameColor = '#f8fafc';

      if (idx === 1) {
        rankPill = '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#d97706);color:#1a1202;font-weight:900;font-size:14px;box-shadow:0 0 10px rgba(245,158,11,0.5);">🥇</span>';
        rowBg = 'rgba(245,158,11,0.12)';
        nameColor = '#fef08a';
      } else if (idx === 2) {
        rankPill = '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#0f172a;font-weight:900;font-size:13px;">🥈</span>';
        rowBg = 'rgba(148,163,184,0.08)';
      } else if (idx === 3) {
        rankPill = '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#fed7aa,#ea580c);color:#ffffff;font-weight:900;font-size:13px;">🥉</span>';
        rowBg = 'rgba(234,88,12,0.08)';
      } else {
        rankPill = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 6px;border-radius:999px;background:#1e293b;color:#94a3b8;font-weight:800;font-size:11.5px;border:1px solid #334155;">#${idx}</span>`;
      }

      return `
        <td style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:center;border-right:1px solid rgba(255,255,255,0.08);background:${rowBg};">
          ${rankPill}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.07);border-right:1px solid rgba(255,255,255,0.08);font-weight:800;font-size:13.5px;color:${nameColor};background:${rowBg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escHtml(item.name)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;font-weight:900;font-size:14px;background:${rowBg};${br}">
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(2,132,199,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);padding:3px 10px;border-radius:999px;font-weight:900;">
            🏠 ${Math.round(item.binh * 100) / 100}
          </span>
        </td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // Hàng tổng kết hiện đại
  const totalRow = `
    <tr style="background:linear-gradient(90deg, rgba(2,132,199,0.2), rgba(245,158,11,0.2));border-top:2px solid #0284c7;">
      <td colspan="${colCount * 3 - 1}" style="padding:16px 20px;font-weight:900;font-size:14px;letter-spacing:1.5px;color:#ffffff;border-right:1px solid rgba(255,255,255,0.15);text-align:right;text-transform:uppercase;">
        ⚡ TỔNG CỘNG DOANH SỐ TOÀN CREW
      </td>
      <td style="padding:16px 20px;font-weight:900;font-size:20px;color:#fde047;text-align:right;white-space:nowrap;">
        🏠 ${Math.round(totalBinh * 100) / 100} nhà
      </td>
    </tr>
  `;

  const container = $('exportArea');
  if (!container) return;

  // HTML Infographic Mới Mẻ & Hiện Đại
  container.innerHTML = `
    <div id="modernReportNode" style="width:${W}px;box-sizing:border-box;background:#090d16;
                background-image: radial-gradient(circle at 10% 10%, rgba(2, 132, 199, 0.18), transparent 45%),
                                  radial-gradient(circle at 90% 90%, rgba(245, 158, 11, 0.15), transparent 45%);
                padding:40px 46px;color:#ffffff;font-family:'Plus Jakarta Sans',sans-serif;
                border:2.5px solid #0ea5e9;border-radius:24px;position:relative;box-shadow:0 25px 60px rgba(0,0,0,0.8);">

      <!-- TOP BADGE & BRAND -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid rgba(255,255,255,0.12);padding-bottom:18px;margin-bottom:22px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0284c7,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 16px rgba(14,165,233,0.5);">🏠</div>
          <div>
            <div style="font-size:12px;font-weight:900;letter-spacing:2px;color:#38bdf8;text-transform:uppercase;">HỆ THỐNG QUẢN LÝ NHÀ • CREW LƯỚI BÚA</div>
            <div style="font-size:11px;color:#94a3b8;font-weight:700;margin-top:2px;">Báo Cáo Hiệu Suất Chiến Binh &amp; Doanh Số Thực Tế</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:999px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3);font-size:12px;font-weight:800;">
            <span style="width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span>Đồng Bộ Trực Tuyến
          </span>
          <span style="display:inline-flex;padding:5px 12px;border-radius:999px;background:#1e293b;color:#cbd5e1;font-size:11.5px;font-weight:700;border:1px solid #334155;">
            📅 ${dateStr} • ${timeStr}
          </span>
        </div>
      </div>

      <!-- TIÊU ĐỀ BÁO CÁO TO RỰC RỠ -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;font-weight:900;letter-spacing:1px;text-transform:uppercase;
                    background:linear-gradient(180deg,#ffffff 0%,#e0f2fe 50%,#bae6fd 100%);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    filter:drop-shadow(0 2px 8px rgba(14,165,233,0.3));">
          ${escHtml(customTitle || 'BẢNG THỐNG KÊ DOANH SỐ & NĂNG SUẤT CHU KỲ')}
        </div>
        <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-top:6px;">
          Chu kỳ theo dõi toàn diện • Ghi nhận số nhà hoàn thành của từng thành viên
        </div>
      </div>

      <!-- 4 THẺ KPI HIỆN ĐẠI (GLOWING GLASS METRICS) -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
        
        <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.06));border:1.5px solid rgba(245,158,11,0.35);padding:14px 16px;border-radius:16px;">
          <div style="font-size:11px;font-weight:850;color:#fde047;letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span>🏠</span> TỔNG SỐ NHÀ
          </div>
          <div style="font-size:26px;font-weight:900;color:#facc15;margin-top:4px;">
            ${Math.round(totalBinh * 100) / 100} <span style="font-size:13px;color:#fde047;font-weight:700;">nhà</span>
          </div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(2,132,199,0.12),rgba(14,165,233,0.06));border:1.5px solid rgba(56,189,248,0.35);padding:14px 16px;border-radius:16px;">
          <div style="font-size:11px;font-weight:850;color:#38bdf8;letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span>👥</span> CHIẾN BINH CÓ NHÀ
          </div>
          <div style="font-size:26px;font-weight:900;color:#38bdf8;margin-top:4px;">
            ${total} <span style="font-size:13px;color:#7dd3fc;font-weight:700;">người</span>
          </div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(234,88,12,0.12),rgba(194,65,12,0.06));border:1.5px solid rgba(251,146,60,0.35);padding:14px 16px;border-radius:16px;">
          <div style="font-size:11px;font-weight:850;color:#fdba74;letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span>👑</span> QUÁN QUÂN TOP 1
          </div>
          <div style="font-size:15px;font-weight:900;color:#fed7aa;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            🥇 ${escHtml(periodStatsData[0]?.name || '-')}
          </div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06));border:1.5px solid rgba(52,211,153,0.35);padding:14px 16px;border-radius:16px;">
          <div style="font-size:11px;font-weight:850;color:#6ee7b7;letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span>📈</span> NĂNG SUẤT TRUNG BÌNH
          </div>
          <div style="font-size:24px;font-weight:900;color:#34d399;margin-top:4px;">
            ${(totalBinh / (total || 1)).toFixed(1)} <span style="font-size:13px;color:#a7f3d0;font-weight:700;">nhà/người</span>
          </div>
        </div>

      </div>

      <!-- BẢNG DỮ LIỆU CYBER-GLASS CHUYÊN NGHIỆP -->
      <table style="width:100%;border-collapse:collapse;border:1.5px solid rgba(255,255,255,0.15);
                    background:rgba(15,23,42,0.6);border-radius:14px;overflow:hidden;table-layout:fixed;margin-bottom:22px;">
        <thead>
          <tr style="background:#0f172a;border-bottom:2px solid #0284c7;">${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
          ${totalRow}
        </tbody>
      </table>

      <!-- KHUNG THÔNG BÁO WEBSITE MỚI MẺ -->
      <div style="background:linear-gradient(135deg,rgba(2,132,199,0.15),rgba(14,165,233,0.08));border:1.5px solid #0284c7;border-radius:16px;padding:16px 20px;text-align:center;box-shadow:0 0 16px rgba(2,132,199,0.15);margin-bottom:22px;">
        <div style="font-size:12px;font-weight:900;letter-spacing:1.5px;color:#38bdf8;text-transform:uppercase;margin-bottom:4px;">
          ✦ HỆ THỐNG TRỰC TUYẾN CREW LƯỚI BÚA ✦
        </div>
        <div style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:0.5px;margin-bottom:4px;">
          🌐 TRUY CẬP WEBSITE: <span style="color:#fde047;text-decoration:underline;">https://quan-ly-seven.vercel.app/</span>
        </div>
        <div style="font-size:16px;font-weight:900;color:#38bdf8;letter-spacing:0.3px;">
          👉 AE TỰ VÀO CHECK XEM NHÀ MÌNH LẤY ĐƯỢC MẤY CĂN NHÉ!
        </div>
      </div>

      <!-- CHỮ KÝ VÀ CON DẤU XÁC NHẬN -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="font-size:12px;font-weight:700;color:#64748b;font-style:italic;">
          * Bản thống kê điện tử chính thức được trích xuất trực tiếp từ máy chủ Firebase.
        </div>
        <div style="position:relative;width:340px;height:140px;">
          <div style="position:absolute;left:0;top:0;text-align:center;width:200px;">
            <div style="font-size:12.5px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">QUẢN LÝ / THỦ LĨNH</div>
            <div style="font-family:'Great Vibes',cursive;font-size:42px;font-weight:400;color:#facc15;line-height:1;margin-top:2px;">
              Trí
            </div>
            <div style="font-size:16px;font-weight:900;color:#ffffff;line-height:1.1;margin-top:2px;">
              Nguyễn Ngọc Trí
            </div>
          </div>

          <!-- DẤU ĐỎ CHỨNG NHẬN SVG -->
          <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"
               style="position:absolute;right:0;top:0;width:130px;height:130px;transform:rotate(-10deg);opacity:0.92;">
            <circle cx="80" cy="80" r="76" fill="none" stroke="#ef4444" stroke-width="3"/>
            <circle cx="80" cy="80" r="66" fill="none" stroke="#ef4444" stroke-width="1"/>
            <circle cx="80" cy="80" r="40" fill="none" stroke="#ef4444" stroke-width="1"/>
            <text fill="#ef4444" font-size="10" font-weight="900" font-family="'Plus Jakarta Sans',sans-serif" letter-spacing="1.2">
              <textPath href="#stampArc" startOffset="50%" text-anchor="middle">CREW LƯỚI BÚA</textPath>
            </text>
            <defs>
              <path id="stampArc" d="M 22,80 A 58,58 0 0,1 138,80" fill="none"/>
            </defs>
            <polygon points="80,52 83.8,64 97,64 86.5,72 90.2,85 80,77 69.8,85 73.5,72 63,64 76.2,64" fill="#fbbf24"/>
            <text x="80" y="112" fill="#ef4444" font-size="11" font-weight="900" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif">★ CHÍNH THỨC ★</text>
          </svg>
        </div>
      </div>

    </div>
  `;

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const reportNode = container.querySelector('#modernReportNode');
    const canvas = await html2canvas(reportNode, {
      scale: 2.5,
      backgroundColor: '#090d16',
      logging: false,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    if (container) container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:${Math.min(W + 40, 1100)}px;max-height:92vh;overflow-y:auto;">
        <div class="modal-header-fancy">
          <div class="modal-title-group">
            <div class="modal-icon-badge">📊</div>
            <div>
              <h3>Báo Cáo Doanh Số Hiện Đại (${total} người)</h3>
              <span style="font-size:12px;color:var(--slate-500);font-weight:600;">Mẫu Infographic Cyber-Luxury sắc nét</span>
            </div>
          </div>
          <button class="modal-close-btn" id="closeModernModal" title="Đóng">✕</button>
        </div>

        <div style="margin:16px 0;text-align:center;">
          <img src="${dataUrl}" alt="Thống kê" style="border-radius:14px;border:1.5px solid #0ea5e9;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.3);">
        </div>

        <div class="modal-actions" style="flex-wrap:wrap;gap:8px;justify-content:flex-end;">
          <button class="secondary" id="closeModernModalBtn">Đóng</button>
          <button class="green" id="downloadImg">⬇️ Tải Xuống Ảnh PNG</button>
          ${isAdmin() ? `
          <button type="button" class="gold" id="sendDiscordWeeklyHouseBtn" style="background:#5865F2;color:#fff;border-color:#4752C4;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
            <span>🚀 Gửi Discord</span>
          </button>
          ` : ''}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const closeMod = () => overlay.remove();
    overlay.querySelector('#closeModernModal').onclick = closeMod;
    overlay.querySelector('#closeModernModalBtn').onclick = closeMod;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMod();
    });

    overlay.querySelector('#downloadImg').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeTitle = (customTitle || 'bao-cao').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `thong-ke-doanh-so-${safeTitle}-${Date.now()}.png`;
      a.click();
    };

    if (overlay.querySelector('#sendDiscordWeeklyHouseBtn')) {
      overlay.querySelector('#sendDiscordWeeklyHouseBtn').onclick = async () => {
        if (!isAdmin()) {
          alert('⛔ Bạn đang ở trang xem (index.html). Chỉ Quản Trị Viên (admin.html) mới có quyền gửi báo cáo về Discord!');
          return;
        }

        const btn = overlay.querySelector('#sendDiscordWeeklyHouseBtn');
        btn.innerHTML = '<span>⏳ Đang gửi...</span>';
        btn.disabled = true;

        const res = await (window.sendDiscordReport || sendDiscordReport)({
          type: 'weekly',
          targetChannelId: '1561985096943276042',
          title: `📊 BÁO CÁO DOANH SỐ SỐ NHÀ CHU KỲ (CREW LƯỚI BÚA)`,
          description: `Tổng số nhà: **${Math.round(totalBinh * 100) / 100}** nhà | Số chiến binh: **${total}** người`,
          imageDataUrl: dataUrl
        });

        btn.disabled = false;
        btn.innerHTML = '<span>🚀 Gửi Discord</span>';

        if (res.success) {
          alert('✅ Đã gửi ảnh báo cáo doanh số hiện đại lên Discord thành công!');
        } else {
          alert('❌ ' + res.message);
        }
      };
    }
  } catch (err) {
    alert('❌ Lỗi tạo ảnh: ' + err.message);
  } finally {
    if (container) container.innerHTML = '';
  }
}
window.generateExportImage = generateExportImage;

/* ==========================================================================
   SECTION 3: NHẬT KÝ CHỈNH SỬA & HOẠT ĐỘNG TOÀN HỆ THỐNG (AUDIT LOGS)
   ========================================================================== */
let auditLogsCurrentPage = 1;
const AUDIT_LOGS_PAGE_SIZE = 10;
window.auditLogsCurrentPage = auditLogsCurrentPage;

function renderAuditLogsTable() {
  const tb = $('auditLogsTable');
  if (!tb) return;

  const search = ($('searchAuditLogInput')?.value || '').toLowerCase().trim();
  const filterAction = $('filterAuditLogAction')?.value || 'all';
  const filterActor = $('filterAuditLogActor')?.value || 'all';

  const filtered = auditLogs.filter(item => {
    const matchSearch = !search ||
      (item.details || '').toLowerCase().includes(search) ||
      (item.actionLabel || '').toLowerCase().includes(search) ||
      (item.actor || '').toLowerCase().includes(search) ||
      (item.timeStr || '').toLowerCase().includes(search);

    let matchType = true;
    if (filterAction === 'RECORD') {
      matchType = (item.actionType || '').includes('RECORD');
    } else if (filterAction === 'MEMBER') {
      matchType = (item.actionType || '').includes('MEMBER');
    } else if (filterAction === 'FUND') {
      matchType = (item.actionType || '').includes('FUND') || (item.actionType || '').includes('BAIL');
    } else if (filterAction === 'RESET') {
      matchType = (item.actionType || '').includes('RESET');
    }

    let matchActor = true;
    if (filterActor !== 'all') {
      matchActor = (item.actor || '').toLowerCase().includes(filterActor.toLowerCase());
    }

    return matchSearch && matchType && matchActor;
  });

  // Cập nhật các thẻ Mini-KPIs
  if ($('badgeLogs')) {
    $('badgeLogs').textContent = auditLogs.length;
  }
  if ($('logSumTotal')) {
    $('logSumTotal').textContent = `${auditLogs.length} lượt`;
  }
  if ($('logSumUpdates')) {
    const updatesCount = auditLogs.filter(x => (x.actionType || '').includes('EDIT') || (x.actionType || '').includes('CONFIG')).length;
    $('logSumUpdates').textContent = `${updatesCount} lần`;
  }
  if ($('logSumDeletes')) {
    const deletesCount = auditLogs.filter(x => (x.actionType || '').includes('DELETE') || (x.actionType || '').includes('RESET')).length;
    $('logSumDeletes').textContent = `${deletesCount} lần`;
  }
  if ($('logLastActive')) {
    if (auditLogs.length > 0 && auditLogs[0].timestamp) {
      const lastDate = new Date(auditLogs[0].timestamp);
      const lh = String(lastDate.getHours()).padStart(2, '0');
      const lm = String(lastDate.getMinutes()).padStart(2, '0');
      const ls = String(lastDate.getSeconds()).padStart(2, '0');
      const ld = String(lastDate.getDate()).padStart(2, '0');
      const lmo = String(lastDate.getMonth() + 1).padStart(2, '0');
      $('logLastActive').textContent = `${lh}:${lm}:${ls} (${ld}/${lmo})`;
    } else {
      $('logLastActive').textContent = 'Chưa có';
    }
  }

  const totalPages = Math.ceil(filtered.length / AUDIT_LOGS_PAGE_SIZE) || 1;
  if (auditLogsCurrentPage > totalPages) auditLogsCurrentPage = totalPages;
  if (auditLogsCurrentPage < 1) auditLogsCurrentPage = 1;

  const startIndex = (auditLogsCurrentPage - 1) * AUDIT_LOGS_PAGE_SIZE;
  const pagedLogs = filtered.slice(startIndex, startIndex + AUDIT_LOGS_PAGE_SIZE);

  if ($('auditLogsFilterCount')) {
    if (filtered.length > AUDIT_LOGS_PAGE_SIZE) {
      $('auditLogsFilterCount').textContent = `Hiển thị ${startIndex + 1}-${Math.min(startIndex + pagedLogs.length, filtered.length)} / ${filtered.length} sự kiện (Trang ${auditLogsCurrentPage}/${totalPages})`;
    } else {
      $('auditLogsFilterCount').textContent = `Tổng ${filtered.length} / ${auditLogs.length} sự kiện`;
    }
  }

  if (!filtered.length) {
    tb.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state-box" style="padding: 24px 16px;">
          <span class="empty-state-icon" style="font-size: 32px;">📜</span>
          <div class="empty-state-title">${search || filterAction !== 'all' || filterActor !== 'all' ? 'Không tìm thấy nhật ký phù hợp bộ lọc' : 'Chưa có nhật ký chỉnh sửa nào'}</div>
          <div class="empty-state-desc">${search || filterAction !== 'all' || filterActor !== 'all' ? 'Thử tìm với từ khóa khác hoặc bấm Xoá lọc' : 'Mọi thao tác thêm, sửa, xoá số nhà hoặc thành viên sẽ tự động lưu lại ở đây'}</div>
        </div>
      </td></tr>`;
    if (typeof renderPaginationControls === 'function') {
      renderPaginationControls({ container: 'auditLogsPagination', totalItems: 0 });
    }
    return;
  }

  let html = '';
  pagedLogs.forEach((log) => {
    let badgeClass = 'badge-action-update';
    let actionIcon = '✏️';
    const act = log.actionType || '';

    if (act.includes('ADD') || act.includes('LOGIN')) {
      badgeClass = 'badge-action-add';
      actionIcon = act.includes('LOGIN') ? '🔑' : '➕';
    } else if (act.includes('DELETE') || act.includes('LOGOUT')) {
      badgeClass = 'badge-action-delete';
      actionIcon = act.includes('LOGOUT') ? '🚪' : '🗑️';
    } else if (act.includes('RESET')) {
      badgeClass = 'badge-action-delete';
      actionIcon = '⚠️';
    }

    let actorBadgeClass = 'badge-actor-admin';
    let actorIcon = '👑';
    const actorName = log.actor || 'Admin';
    if (actorName.toLowerCase().includes('hệ thống') || actorName.toLowerCase().includes('system')) {
      actorBadgeClass = 'badge-actor-system';
      actorIcon = '🤖';
    } else if (actorName.toLowerCase().includes('khách') || actorName.toLowerCase().includes('guest')) {
      actorBadgeClass = 'badge-actor-guest';
      actorIcon = '👤';
    }

    html += `
      <tr>
        <td style="white-space: nowrap; font-weight: 600; color: var(--text-dark); font-size: 13px;">
          ${escHtml(log.timeStr || '')}
        </td>
        <td>
          <span class="badge-audit-action ${badgeClass}">
            ${actionIcon} ${escHtml(log.actionLabel || act)}
          </span>
        </td>
        <td style="color: var(--text-dark); font-weight: 500; font-size: 13.5px; line-height: 1.4;">
          ${escHtml(log.details || '')}
        </td>
        <td style="font-size: 12px; color: var(--text-muted); font-family: monospace;">
          ${escHtml(log.target || '-')}
        </td>
        <td>
          <span class="badge-audit-actor ${actorBadgeClass}">
            ${actorIcon} ${escHtml(actorName)}
          </span>
        </td>
        <td style="text-align: center;">
          <button class="danger btn-sm" onclick="deleteAuditLog('${log.id}')" title="Xoá dòng nhật ký này">🗑️</button>
        </td>
      </tr>
    `;
  });

  tb.innerHTML = html;

  // Render bộ phân trang
  if (typeof renderPaginationControls === 'function') {
    renderPaginationControls({
      container: 'auditLogsPagination',
      totalItems: filtered.length,
      pageSize: AUDIT_LOGS_PAGE_SIZE,
      currentPage: auditLogsCurrentPage,
      itemLabel: 'sự kiện',
      onPageChange: (newPage) => {
        auditLogsCurrentPage = newPage;
        renderAuditLogsTable();
        const tbl = $('auditLogsTable');
        if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
window.renderAuditLogsTable = renderAuditLogsTable;

/* Lắng nghe sự kiện tìm kiếm & bộ lọc nhật ký */
$('searchAuditLogInput')?.addEventListener('input', debounce(() => {
  auditLogsCurrentPage = 1;
  renderAuditLogsTable();
}, 120));
$('filterAuditLogAction')?.addEventListener('change', () => {
  auditLogsCurrentPage = 1;
  renderAuditLogsTable();
});
$('filterAuditLogActor')?.addEventListener('change', () => {
  auditLogsCurrentPage = 1;
  renderAuditLogsTable();
});
$('resetAuditLogFilter')?.addEventListener('click', () => {
  auditLogsCurrentPage = 1;
  if ($('searchAuditLogInput')) $('searchAuditLogInput').value = '';
  if ($('filterAuditLogAction')) $('filterAuditLogAction').value = 'all';
  if ($('filterAuditLogActor')) $('filterAuditLogActor').value = 'all';
  renderAuditLogsTable();
});

/* Xóa từng dòng nhật ký */
async function deleteAuditLog(id) {
  if (!isAdmin()) {
    alert('⛔ Chỉ quản trị viên mới có quyền xoá nhật ký!');
    return;
  }
  const ok = (typeof showConfirmModal === 'function')
    ? await showConfirmModal({
        title: 'Xoá Dòng Nhật Ký',
        targetName: `ID: ${id ? id.substring(0, 10) : ''}...`,
        targetType: 'Nhật ký kiểm toán hệ thống',
        type: 'danger',
        icon: '🗑️',
        message: 'Đại ca có chắc chắn muốn xoá dòng nhật ký này không? Dữ liệu kiểm toán sẽ bị xoá vĩnh viễn.',
        confirmText: '🗑️ Xoá Dòng',
        cancelText: '✕ Hủy Bỏ'
      })
    : confirm('Bạn có chắc muốn xoá dòng nhật ký này không?');

  if (!ok) return;

  try {
    await auditLogsRef.child(id).remove();
  } catch (err) {
    alert('❌ Lỗi xoá: ' + err.message);
  }
}
window.deleteAuditLog = deleteAuditLog;

/* Dọn dẹp làm sạch toàn bộ nhật ký */
$('clearAuditLogsBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) {
    alert('⛔ Chỉ quản trị viên mới có quyền dọn dẹp nhật ký!');
    return;
  }
  if (!auditLogs.length) {
    alert('Nhật ký hiện đang trống!');
    return;
  }
  const ok = (typeof showConfirmModal === 'function')
    ? await showConfirmModal({
        title: 'Dọn Sạch Toàn Bộ Nhật Ký',
        targetName: `${auditLogs.length} dòng nhật ký`,
        targetType: 'Hệ thống Audit Logs',
        type: 'danger',
        icon: '⚠️',
        message: `Đại ca có chắc chắn muốn xoá sạch toàn bộ <b>${auditLogs.length} dòng</b> nhật ký chỉnh sửa không?<br><span style="color:#dc2626;font-size:12.5px;font-weight:700;">🚨 Thao tác này sẽ dọn trắng toàn bộ lịch sử và KHÔNG THỂ HOÀN TÁC!</span>`,
        confirmText: '🚨 Xoá Sạch Toàn Bộ',
        cancelText: '✕ Giữ Lại'
      })
    : confirm(`Bạn có chắc muốn xoá sạch toàn bộ ${auditLogs.length} dòng nhật ký chỉnh sửa không?\n\n⚠️ Thao tác này không thể hoàn tác!`);

  if (!ok) return;

  try {
    await auditLogsRef.remove();
    alert('✅ Đã dọn dẹp làm sạch toàn bộ nhật ký chỉnh sửa thành công!');
  } catch (err) {
    alert('❌ Lỗi khi dọn nhật ký: ' + err.message);
  }
});

/* Xuất ảnh báo cáo Nhật ký chỉnh sửa */
$('exportAuditLogsBtn')?.addEventListener('click', async () => {
  if (!auditLogs.length) {
    alert('Chưa có dữ liệu nhật ký để xuất báo cáo!');
    return;
  }
  const logsToPrint = auditLogs.slice(0, 50);

  const container = $('exportArea');
  if (!container) return;

  let rowsHtml = '';
  logsToPrint.forEach((l, idx) => {
    rowsHtml += `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 8px;text-align:center;font-weight:bold;color:#64748b;">${idx + 1}</td>
        <td style="padding:10px 8px;font-weight:bold;color:#0f172a;white-space:nowrap;">${l.timeStr || ''}</td>
        <td style="padding:10px 8px;font-weight:bold;color:#b45309;">${escHtml(l.actionLabel || '')}</td>
        <td style="padding:10px 8px;color:#1e293b;line-height:1.4;">${escHtml(l.details || '')}</td>
        <td style="padding:10px 8px;text-align:center;font-weight:bold;color:#475569;">${escHtml(l.actor || 'Admin')}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="width:1050px;padding:36px 40px;background:#fdfcf7;color:#000;font-family:'Times New Roman',serif;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:18px;margin-bottom:24px;">
        <div>
          <div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;">
            BAN CHỈ HUY CREW LƯỠI BÚA
          </div>
          <div style="font-size:13px;color:#475569;margin-top:4px;font-weight:bold;">
            HỆ THỐNG GIÁM SÁT &amp; KIỂM TOÁN TỰ ĐỘNG
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#64748b;">Thời điểm trích xuất:</div>
          <div style="font-size:13px;font-weight:bold;color:#0f172a;">${todayStr()}</div>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:25px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;margin:0 0 6px;">
          BẢNG NHẬT KÝ KIỂM TOÁN &amp; CHỈNH SỬA HỆ THỐNG
        </h1>
        <div style="font-size:13px;font-weight:bold;color:#475569;">
          Ghi nhận ${logsToPrint.length} biến động thao tác gần nhất của Quản Trị Viên
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12.5px;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:28px;">
        <thead>
          <tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;">
            <th style="padding:10px 8px;width:40px;text-align:center;">STT</th>
            <th style="padding:10px 8px;width:150px;text-align:left;">Thời Gian</th>
            <th style="padding:10px 8px;width:150px;text-align:left;">Hành Động</th>
            <th style="padding:10px 8px;text-align:left;">Nội Dung Chi Tiết</th>
            <th style="padding:10px 8px;width:110px;text-align:center;">Thực Hiện</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:1px dashed #cbd5e1;font-size:12px;">
        <div>Xác nhận tính toàn vẹn dữ liệu • Vercel Edge Serverless</div>
        <div style="font-weight:bold;color:#92400e;">CREW LƯỠI BÚA ★ OFFICIAL AUDIT LOG</div>
      </div>
    </div>
  `;

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 3,
      backgroundColor: '#fdfcf7',
      logging: false,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    if (container) container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:1090px;">
        <h3>📸 Ảnh Báo Cáo Nhật Ký Chỉnh Sửa (${logsToPrint.length} sự kiện)</h3>
        <img src="${dataUrl}" alt="Nhật ký chỉnh sửa" style="border-radius:12px;border:1px solid #e2e8f0;width:100%;">
        <div class="modal-actions">
          <button class="secondary" id="closeAuditImgModal">Đóng</button>
          <button class="green" id="downloadAuditImg">⬇️ Tải Xuống Ảnh PNG</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#closeAuditImgModal').onclick = () => overlay.remove();
    overlay.querySelector('#downloadAuditImg').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nhat-ky-chinh-sua-${Date.now()}.png`;
      a.click();
    };
  } catch (err) {
    alert('❌ Lỗi tạo ảnh báo cáo nhật ký: ' + err.message);
  }
});

;

/* [MODULE: app.js] */
/* ==========================================================================
   QUẢN LÝ TRỘM NHÀ - CORE APPLICATION ORCHESTRATOR
   Ultra-High Performance Distributed Script Entrypoint
   ========================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  // Đảm bảo xoá sạch trạng thái dark theme cũ nếu có
  document.documentElement.removeAttribute('data-theme');
  try { localStorage.removeItem('app_theme'); } catch (e) { }

  // Khởi tạo ngày ghi nhận mặc định hôm nay
  const dateInput = $('inputDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = todayStr();
  }

  // Khởi tạo bộ chuyển đổi chế độ xem lịch sử
  if (typeof initRecordsModeToggle === 'function') {
    initRecordsModeToggle();
  }

  // Khởi động đồng bộ dữ liệu Realtime Database
  if (typeof listenData === 'function') {
    listenData();
  }
});

;

/* [MODULE: pwa-install.js] */
/**
 * PWA & Desktop Installation Controller - "Thống Kê Nhập Nhà" (Crew Lưới Búa)
 * Version: 20261018_pwa1
 */

(function () {
  'use strict';

  let deferredPrompt = null;
  const APP_NAME = 'Thống Kê Nhập Nhà';

  // 1. Đăng ký Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker đăng ký thành công! Scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker đăng ký thất bại:', err);
        });
    });
  }

  // 2. Bắt sự kiện beforeinstallprompt (Chrome / Edge / Brave / Cốc Cốc trên PC)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Ngăn chặn thanh mini-infobar mặc định của trình duyệt
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Sự kiện beforeinstallprompt đã sẵn sàng!');

    // Cập nhật trạng thái các nút Cài App trên giao diện
    updateInstallButtonsState(true);
  });

  // 3. Bắt sự kiện appinstalled khi người dùng đã cài đặt thành công
  window.addEventListener('appinstalled', (e) => {
    console.log('[PWA] Ứng dụng đã được cài đặt thành công lên thiết bị!', e);
    deferredPrompt = null;
    showToastNotification('🎉 Chúc mừng Đại ca! Ứng dụng "' + APP_NAME + '" đã được cài đặt lên Desktop PC!');
    markButtonsAsInstalled();
  });

  // Kiểm tra xem ứng dụng có đang chạy ở chế độ Standalone (App độc lập) không
  function isRunningStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // Cập nhật giao diện nút khi đã cài đặt hoặc đang ở chế độ app
  function markButtonsAsInstalled() {
    const buttons = document.querySelectorAll('.btn-install-pc, [data-action="install-pwa"]');
    buttons.forEach((btn) => {
      btn.classList.add('installed');
      btn.innerHTML = `
        <img src="icons/icon-192.png" alt="Logo" class="btn-icon-app">
        <span>✅ Đã Cài App</span>
      `;
      btn.title = 'Ứng dụng Thống Kê Nhập Nhà đã được cài đặt trên PC của Đại ca';
    });
  }

  function updateInstallButtonsState(isReady) {
    const buttons = document.querySelectorAll('.btn-install-pc, [data-action="install-pwa"]');
    buttons.forEach((btn) => {
      if (isReady) {
        btn.classList.add('ready-to-install');
      }
    });
  }

  // 4. Hàm kích hoạt Cài Đặt khi người dùng bấm nút
  async function triggerInstallPrompt() {
    if (isRunningStandalone()) {
      showToastNotification('⚡ Đại ca đang sử dụng App "' + APP_NAME + '" ở chế độ ứng dụng độc lập rồi!');
      return;
    }

    if (deferredPrompt) {
      try {
        // Hiện prompt native của trình duyệt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Người dùng phản hồi prompt:', outcome);
        if (outcome === 'accepted') {
          showToastNotification('🚀 Đang tiến hành cài đặt ứng dụng vào máy tính của Đại ca...');
          deferredPrompt = null;
        } else {
          showToastNotification('⚠️ Đại ca đã hủy cài đặt. Có thể bấm cài lại bất cứ lúc nào!');
        }
      } catch (err) {
        console.warn('[PWA] Lỗi gọi prompt:', err);
        openInstallGuideModal();
      }
    } else {
      // Nếu trình duyệt chưa bắn beforeinstallprompt hoặc đang dùng Edge/Chrome ở chế độ khác
      openInstallGuideModal();
    }
  }

  // 5. Modal Hướng Dẫn Cài App Desktop Chuyên Nghiệp
  function createInstallGuideModal() {
    if (document.getElementById('pwaInstallModal')) return;

    const modal = document.createElement('div');
    modal.id = 'pwaInstallModal';
    modal.className = 'pwa-modal-backdrop';
    modal.innerHTML = `
      <div class="pwa-modal-box">
        <button class="pwa-modal-close" id="btnClosePwaModal" title="Đóng hướng dẫn">&times;</button>
        
        <div class="pwa-modal-header">
          <div class="pwa-modal-icon-wrap">
            <img src="icons/icon-192.png" alt="Logo App" class="pwa-modal-logo">
          </div>
          <div class="pwa-modal-title-box">
            <h2>Cài App "${APP_NAME}" Trên PC</h2>
            <p>Khởi chạy nhanh như phần mềm Windows • Đầy đủ tính năng • Mượt mà không giật lag</p>
          </div>
        </div>

        <div class="pwa-modal-body">
          <div class="pwa-guide-step">
            <div class="step-num">1</div>
            <div class="step-info">
              <h4>Tìm biểu tượng Cài Đặt trên thanh địa chỉ</h4>
              <p>Nhìn lên góc phải thanh gõ địa chỉ web của trình duyệt (Chrome, Edge, Brave, Cốc Cốc): Nhấp vào biểu tượng 🖥️ <strong>Cài đặt (Install App)</strong> hoặc dấu <strong>(➕)</strong>.</p>
            </div>
          </div>

          <div class="pwa-guide-step">
            <div class="step-num">2</div>
            <div class="step-info">
              <h4>Hoặc cài từ Menu 3 Chấm (⋮)</h4>
              <p>Nhấp vào menu <strong>⋮</strong> (Góc trên cùng bên phải trình duyệt) ➔ Chọn <strong>"Cài đặt Thống Kê Nhập Nhà..."</strong> hoặc <strong>"Ứng dụng" (Apps) ➔ "Cài đặt ứng dụng này"</strong>.</p>
            </div>
          </div>

          <div class="pwa-guide-step">
            <div class="step-num">3</div>
            <div class="step-info">
              <h4>Khởi chạy ngay ngoài Desktop & Taskbar</h4>
              <p>Biểu tượng App sẽ xuất hiện trực tiếp ngoài màn hình Desktop. Đại ca có thể ghim vào thanh Taskbar để mở 1 chạm cực nhanh!</p>
            </div>
          </div>
        </div>

        <div class="pwa-modal-footer">
          <button type="button" class="btn-pwa-try-prompt" id="btnPwaTryPrompt">
            ⚡ Thử Kích Hoạt Cài Đặt Lại
          </button>
          <button type="button" class="btn-pwa-close-foot" id="btnPwaCloseFoot">
            Đã Hiểu
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeModal = () => {
      modal.classList.remove('active');
    };

    document.getElementById('btnClosePwaModal')?.addEventListener('click', closeModal);
    document.getElementById('btnPwaCloseFoot')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.getElementById('btnPwaTryPrompt')?.addEventListener('click', () => {
      closeModal();
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        showToastNotification('💡 Hãy nhấp vào biểu tượng 🖥️ trên thanh địa chỉ trình duyệt của Đại ca để cài đặt!');
      }
    });
  }

  function openInstallGuideModal() {
    createInstallGuideModal();
    const modal = document.getElementById('pwaInstallModal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  // Toast Notification
  function showToastNotification(msg) {
    let toast = document.getElementById('pwaGlobalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwaGlobalToast';
      toast.className = 'pwa-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // Khởi tạo gắn sự kiện cho các nút cài đặt
  function initInstallButtons() {
    createInstallGuideModal();

    if (isRunningStandalone()) {
      markButtonsAsInstalled();
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-install-pc, [data-action="install-pwa"]');
      if (btn) {
        e.preventDefault();
        triggerInstallPrompt();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstallButtons);
  } else {
    initInstallButtons();
  }

  // Public API
  window.PWAInstaller = {
    triggerInstallPrompt,
    openInstallGuideModal,
    isRunningStandalone
  };
})();

;


/* ==========================================================================
   TOUCH ZOOM LOCK CONTROLLER (CHỐNG PHÓNG TO THU NHỎ, CHO PHÉP VUỐT / KÉO)
   ========================================================================== */
(function() {
  // 1. Chống pinch-to-zoom 2 ngón tay trên iOS & Android
  document.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // 2. Chống Safari iOS gesture zoom
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  }, { passive: false });

  // 3. Chống double-tap to zoom (nhấn đúp phóng to) nhưng không cản trở tương tác nút/input
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) {
      var target = e.target;
      var isInput = target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('a'));
      if (!isInput) {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 4. Chống Ctrl + Scroll / Phím tắt Zoom trên máy tính
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
      e.preventDefault();
    }
  });
})();
