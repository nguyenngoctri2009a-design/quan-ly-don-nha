---
name: t1-design-system
description: >-
  Use this skill whenever the user types 't1', says 'giao diện t1', 'design t1',
  or wants to design, build, or style ANY website, dashboard, landing page, or web app
  using the signature T1 3D Neumorphic-Glass Design System (crisp white theme, 3D pressable buttons,
  multi-layer soft shadows, metric cards, pro tables, and luxury glass modals).
---

# T1 Universal UI Design System (Hệ Thống Giao Diện T1 Cho Mọi Website)

Hệ thống thiết kế **T1** là một UI Framework / Design System độc lập, thuần về mặt **GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)**, có thể áp dụng cho **BẤT KỲ DỰ ÁN WEB NÀO** (Quản trị, Dashboard, Bán hàng, Tool, Mạng xã hội, Landing Page, v.v.).

Khi Đại ca ra lệnh **`t1`** hoặc yêu cầu làm giao diện dạng T1 cho bất kỳ website nào, hãy áp dụng ngay bộ UI Kit chuẩn 3D hiện đại dưới đây.

---

## 1. Triết Lý Thiết Kế T1 (Design Philosophy)

1. **Light & Bright (Sáng & Sạch Sẽ)**: Nền trắng xám siêu mịn (`#f8fafc`), kết hợp lưới chấm mờ vi tế (`radial-gradient(#cbd5e1 0.75px, transparent 0.75px)` kích thước 24px x 24px).
2. **Chiều Sâu 3D Đa Tầng (Multi-layer Elevation)**: Bo góc lớn (`16px` đến `24px`), bóng đổ mềm nhiều lớp (`box-shadow: 0 4px 14px rgba(0,0,0,0.05), inset 0 1px 2px #ffffff`).
3. **Nút Bấm Xúc Giác 3D (3D Tactile Buttons)**:
   - Viền nổi tinh tế bằng kỹ thuật kép: `linear-gradient(...) padding-box, linear-gradient(...) border-box`.
   - Rê chuột (Hover): Nổi bổng lên (`transform: translateY(-2px); box-shadow: ...`).
   - Nhấn chuột (Active): Lún sâu thật (`transform: translateY(1px); box-shadow: inset 0 2px 4px ...`).
4. **Màu Sắc Nhận Diện Sống Động (Vibrant Accents)**:
   - **Chủ đạo (Primary / Cyan Sky)**: `#0284c7` -> `#0ea5e9`
   - **Thành công (Success / Emerald)**: `#059669` -> `#10b981`
   - **Nổi bật / VIP (Gold / Amber)**: `#fbbf24` -> `#d97706`
   - **Cảnh báo (Danger / Rose)**: `#ef4444` -> `#dc2626`
   - **Chữ nét cao (Slate Dark)**: `#0f172a`, phụ `#64748b`

---

## 2. Thư Viện CSS Cốt Lõi T1 (Copy-Paste Sử Dụng Cho Mọi Web)

```css
/* ==========================================================================
   T1 UNIVERSAL DESIGN SYSTEM CORE
   ========================================================================== */
:root {
  --t1-bg: #f8fafc;
  --t1-card-bg: #ffffff;
  --t1-border: #e2e8f0;
  --t1-text: #0f172a;
  --t1-text-muted: #64748b;

  --t1-primary: #0284c7;
  --t1-primary-gradient: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
  --t1-success: #10b981;
  --t1-success-gradient: linear-gradient(135deg, #059669 0%, #10b981 100%);
  --t1-gold: #f59e0b;
  --t1-gold-gradient: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
  --t1-danger: #ef4444;
  --t1-danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

/* Nền Lưới Chấm T1 */
body.t1-theme, .t1-bg-grid {
  background-color: var(--t1-bg);
  background-image: radial-gradient(#cbd5e1 0.8px, transparent 0.8px);
  background-size: 24px 24px;
  color: var(--t1-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* 1. NÚT BẤM 3D (3D BUTTONS) */
.t1-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 850;
  border-radius: 14px;
  border: 1.5px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
}
.t1-btn:hover {
  transform: translateY(-2px);
}
.t1-btn:active {
  transform: translateY(1px);
}

/* Nút Cyan / Primary */
.t1-btn-primary {
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%) padding-box,
              linear-gradient(135deg, #0284c7, #38bdf8) border-box;
  color: #0369a1;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.16), inset 0 1px 1px #ffffff;
}
.t1-btn-primary:hover {
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.3);
}
.t1-btn-primary:active {
  box-shadow: inset 0 2px 4px rgba(2, 132, 199, 0.25);
}

/* Nút Xanh Lá / Success */
.t1-btn-success {
  background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%) padding-box,
              linear-gradient(135deg, #10b981, #34d399) border-box;
  color: #047857;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.16), inset 0 1px 1px #ffffff;
}
.t1-btn-success:hover {
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
}
.t1-btn-success:active {
  box-shadow: inset 0 2px 4px rgba(16, 185, 129, 0.25);
}

/* Nút Vàng / Gold / VIP */
.t1-btn-gold {
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%) padding-box,
              linear-gradient(135deg, #f59e0b, #fbbf24) border-box;
  color: #92400e;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.18), inset 0 1px 1px #ffffff;
}

/* Nút Đỏ / Danger */
.t1-btn-danger {
  background: linear-gradient(180deg, #fee2e2 0%, #fecaca 100%) padding-box,
              linear-gradient(135deg, #ef4444, #f43f5e) border-box;
  color: #991b1b;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.16), inset 0 1px 1px #ffffff;
}

/* Nút Trắng / Secondary */
.t1-btn-secondary {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #475569;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.t1-btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

/* 2. CARD & CONTAINER 3D */
.t1-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 2px #ffffff;
  padding: 20px 24px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.t1-card-hover:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

/* 3. CARD THỐNG KÊ (KPI METRICS CARD) */
.t1-kpi-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  padding: 16px 20px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 2px #ffffff;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}
.t1-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.07);
}
.t1-kpi-title {
  font-size: 11.5px;
  font-weight: 850;
  color: #64748b;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.t1-kpi-number {
  font-size: 30px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.6px;
  line-height: 1.1;
}
.t1-kpi-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  margin-top: 4px;
}

/* 4. Ô NHẬP LIỆU CHUẨN T1 (INPUTS & FORMS) */
.t1-input, .t1-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}
.t1-input:focus, .t1-select:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* 5. HUY HIỆU & STATUS PILLS */
.t1-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 850;
  white-space: nowrap;
}
.t1-pill-success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.t1-pill-warning {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}
.t1-pill-danger {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
.t1-pill-cyan {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

/* 6. BẢNG DỮ LIỆU CHUYÊN NGHIỆP (PRO TABLE) */
.t1-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 18px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}
.t1-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13.5px;
}
.t1-table thead tr {
  background: #f8fafc;
  border-bottom: 1.5px solid #e2e8f0;
  font-weight: 850;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.t1-table th, .t1-table td {
  padding: 12px 16px;
}
.t1-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
}
.t1-table tbody tr:hover {
  background: #f8fafc;
}

/* 7. MODAL THỦY TINH MỜ (LUXURY GLASS MODAL) */
.t1-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.t1-modal-box {
  background: #ffffff;
  border-radius: 24px;
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 520px;
  padding: 24px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}
```

---

## 3. Bố Cục Chuẩn Cho Mọi Dự Án Web Khi Nhận Lệnh `t1`

Khi Đại ca yêu cầu: **`t1`** hoặc **`áp dụng giao diện t1 cho [dự án bất kỳ]`**:
1. **Chỉ tập trung thuần túy vào Giao diện (UI/UX)**: Layout, màu sắc, hiệu ứng nút bấm, card, table, modal, typography — phù hợp với nghiệp vụ của website đó.
2. **Không phụ thuộc nghiệp vụ riêng**: Không nhét logic "trộm nhà" hay "chuộc tù" vào web khác; chỉ lấy đúng phong cách thẩm mỹ:
   - Sạch sẽ, sáng tinh khôi, tone xanh ngọc / trắng / vàng kim.
   - Nút bấm nổi 3D có độ lún thật khi bấm.
   - Card thống kê bo tròn đa tầng.
   - Bảng biểu pro sạch đẹp, hiện đại.
3. **Sẵn sàng triển khai (Ready-to-deploy)**: Cung cấp code HTML/CSS hoàn chỉnh, copy-paste chạy được ngay trên bất kỳ website nào của Đại ca.
