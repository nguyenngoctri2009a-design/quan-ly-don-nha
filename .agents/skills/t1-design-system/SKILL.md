---
name: t1-design-system
description: >-
  Use this skill whenever the user types 't1', mentions 'giao diện t1', 'design t1',
  or requests to build, redesign, or style a web application or dashboard following the
  signature Crew Lưới Búa 3D Neumorphic-Glass Design System (modern white/cyan, 3D pressable buttons,
  multi-layer shadow cards, curved analytics charts, rank medals, dossier glass modals, and discipline meters).
---

# T1 Design System (Crew Lưới Búa 3D Dashboard UI)

Hệ thống thiết kế giao diện **T1** là ngôn ngữ thiết kế Dashboard hiện đại, kết hợp giữa phong cách **3D Neumorphism sáng**, **Glassmorphism mờ sang trọng** và **Màu sắc Gaming/Crew sống động**.

Khi người dùng ra lệnh **`t1`** hoặc yêu cầu làm giao diện kiểu **T1**, hãy luôn áp dụng đầy đủ các quy tắc, bảng màu, hiệu ứng 3D và thành phần cấu trúc chuẩn dưới đây.

---

## 1. Triết Lý & Phong Cách Cốt Lõi (Core Aesthetic)

- **Chủ đề (Theme)**: Sáng (Light Theme), sạch sẽ, sắc nét, chiều sâu 3D đa tầng.
- **Nền tổng thể**: Trắng xám dịu mắt (`#f8fafc` hoặc `#f1f5f9`), phủ lưới chấm mờ nhẹ nhàng (`radial-gradient(#cbd5e1 0.75px, transparent 0.75px)` kích thước 24px x 24px).
- **Độ bo góc (Border Radius)**: Bo lớn từ `14px` đến `24px` cho toàn bộ card và modal.
- **Nút bấm 3D (Pressable / Tactile)**:
  - Khi bình thường: Có viền gradient màu, đổ bóng mềm và viền sáng trên mép.
  - Khi rê chuột (Hover): Nổi bổng lên (`transform: translateY(-2px); box-shadow: ...`).
  - Khi bấm (Active): Lún xuống thật (`transform: translateY(1px); box-shadow: inset ...`).
- **Thẻ Kính Hồ Sơ (Luxury Glass Dossier)**: Nền kính mờ `rgba(15, 23, 42, 0.28)`, đổ bóng vàng kim sang trọng, viền mỏng tinh tế.

---

## 2. Bảng Màu Chuẩn (T1 Color Palette)

```css
:root {
  /* Nền và Khung */
  --t1-bg-main: #f8fafc;
  --t1-bg-card: #ffffff;
  --t1-border-subtle: #e2e8f0;
  --t1-border-focus: #38bdf8;

  /* Màu Điểm Nhấn (Brand Cyan / Sky) */
  --t1-cyan-50: #f0f9ff;
  --t1-cyan-500: #0ea5e9;
  --t1-cyan-600: #0284c7;
  --t1-cyan-gradient: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);

  /* Màu Thành Công & KPI (Emerald) */
  --t1-green-50: #ecfdf5;
  --t1-green-500: #10b981;
  --t1-green-700: #047857;
  --t1-green-gradient: linear-gradient(135deg, #059669 0%, #10b981 100%);

  /* Màu Top 1 / Vinh Danh (Amber Gold) */
  --t1-gold-50: #fffbeb;
  --t1-gold-500: #f59e0b;
  --t1-gold-700: #b45309;
  --t1-gold-gradient: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);

  /* Màu Kỷ Luật & Cảnh Báo (Crimson / Rose) */
  --t1-danger-50: #fee2e2;
  --t1-danger-500: #ef4444;
  --t1-danger-700: #991b1b;
  --t1-danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

  /* Chữ & Độ Tương Phản (Slate) */
  --t1-text-main: #0f172a;
  --t1-text-muted: #64748b;
  --t1-text-light: #94a3b8;
}
```

---

## 3. Các Thành Phần Giao Diện Chuẩn T1 (Component Library)

### 3.1. Hàng 4 Card Thống Kê KPI (Top 4 Metrics Grid)
Bố cục 4 cột trên desktop, 2 cột trên điện thoại. Mỗi thẻ có viền màu nhận diện riêng, icon tròn 3D và con số lớn (`font-size: 28px - 32px`, `font-weight: 900`).

```html
<div class="t1-kpi-grid">
  <!-- Card 1: Tổng số / Năng suất -->
  <div class="t1-kpi-card kpi-cyan">
    <div class="kpi-header">
      <span class="kpi-icon">🏠</span>
      <span class="kpi-label">TỔNG SỐ NHÀ</span>
    </div>
    <div class="kpi-value">882 <small>nhà</small></div>
    <div class="kpi-sub">Toàn bộ hệ thống</div>
  </div>

  <!-- Card 2: Thành viên -->
  <div class="t1-kpi-card kpi-purple">
    <div class="kpi-header">
      <span class="kpi-icon">👥</span>
      <span class="kpi-label">TỔNG THÀNH VIÊN</span>
    </div>
    <div class="kpi-value">20 / 21</div>
    <div class="kpi-sub">Đang hoạt động</div>
  </div>

  <!-- Card 3: Trung bình / Hiệu suất -->
  <div class="t1-kpi-card kpi-green">
    <div class="kpi-header">
      <span class="kpi-icon">📈</span>
      <span class="kpi-label">TRUNG BÌNH / NGƯỜI</span>
    </div>
    <div class="kpi-value">44.1</div>
    <div class="kpi-sub">Nhà trên mỗi chiến binh</div>
  </div>

  <!-- Card 4: Quán Quân Top 1 -->
  <div class="t1-kpi-card kpi-gold">
    <div class="kpi-header">
      <span class="kpi-icon">🏆</span>
      <span class="kpi-label">QUÁN QUÂN (TOP 1)</span>
    </div>
    <div class="kpi-value">BUA | Chị Cửu</div>
    <div class="kpi-sub">272 nhà (31%)</div>
  </div>
</div>
```

```css
.t1-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 900px) {
  .t1-kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.t1-kpi-card {
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1px 2px #ffffff;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.t1-kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.t1-kpi-card .kpi-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.t1-kpi-card .kpi-label {
  font-size: 11.5px;
  font-weight: 850;
  color: #64748b;
  letter-spacing: 0.3px;
}
.t1-kpi-card .kpi-value {
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
}
.t1-kpi-card .kpi-sub {
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 700;
  margin-top: 2px;
}
```

---

### 3.2. Nút Bấm 3D Chống Lún (3D Interactive Buttons)

```css
/* Nút 3D chuẩn T1 */
.btn-t1-3d {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 850;
  border-radius: 14px;
  border: 1.5px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Biến thể Cyan */
.btn-t1-cyan {
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%) padding-box,
              linear-gradient(135deg, #0284c7, #38bdf8) border-box;
  color: #0369a1;
  box-shadow: 0 4px 10px rgba(2, 132, 199, 0.15), inset 0 1px 1px #ffffff;
}
.btn-t1-cyan:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.28);
}
.btn-t1-cyan:active {
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(2, 132, 199, 0.25);
}

/* Biến thể Đỏ Kỷ Luật / Sẹo */
.btn-t1-danger {
  background: linear-gradient(180deg, #fee2e2 0%, #fecaca 100%) padding-box,
              linear-gradient(135deg, #ef4444, #f43f5e) border-box;
  color: #991b1b;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15), inset 0 1px 1px #ffffff;
}
.btn-t1-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.28);
}
.btn-t1-danger:active {
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(239, 68, 68, 0.25);
}
```

---

### 3.3. Bảng Xếp Hạng & Bảng Dữ Liệu Pro (Pro Data Table)

- Cột thứ hạng có huy hiệu: 🥇 Top 1 Vàng, 🥈 Top 2 Bạc, 🥉 Top 3 Đồng, `#n` cho các hạng còn lại.
- Tên thành viên có avatar tròn viền nổi và thẻ danh hiệu thông minh (`👑 Thủ Lĩnh Tối Cao`, `🔥 Tinh Anh Crew`, `⚡ Chiến Binh Tích Cực`).
- Cột tiến độ (% so với Top 1) có thanh gradient đổi màu mượt mà.
- Cột trạng thái có chấm tròn phát sáng (`🟢 Đang Nắm Nhà`, `🛡️ Sẵn Sàng`, `⛔ Đã Bị Đuổi`).
- Trạng thái kỷ luật sẹo (`🟢 0/3 Sẹo`, `🪓 1/3 Sẹo`, `⛔ ĐÃ ĐUỔI`).

---

### 3.4. Hệ Thống Thước Đo Kỷ Luật 3 Sẹo (3-Strike Discipline Meter)

Thành phần quản trị kỷ luật đặc trưng của T1:
- **Thang đo 3 bậc**:
  - `Sẹo 1`: Cảnh cáo (vàng nhẹ)
  - `Sẹo 2`: Nghiêm khắc (cam cảnh giác)
  - `Sẹo 3`: **ĐUỔI THẲNG** (đỏ rực, hiệu ứng pulse)
- Khi đủ 3 sẹo: Gạch ngang tên, khóa dropdown nhập liệu và đóng băng quyền hạn.

---

## 4. Hướng Dẫn Thực Thi Khi Nhận Lệnh `t1`

Khi người dùng nhập:
> **"t1"** hoặc **"làm giao diện t1 cho chức năng X"**

Hãy thực hiện theo quy trình:
1. **Thiết lập Khung Nền & Layout**:
   - Sử dụng layout Sidebar trái + Topbar tiện ích + Khu vực làm việc chính.
   - Thêm lớp nền sáng với dot grid vi tế.
2. **Triển khai Top 4 KPI Cards**:
   - Tóm tắt ngay 4 chỉ số quan trọng nhất của chức năng.
3. **Triển khai Bảng Điều Khiển / Bảng Dữ Liệu**:
   - Dùng đúng cấu trúc table bo góc `18px`, hàng hover nhấc nhẹ, các nút hành động 3D.
4. **Kiểm tra Hiệu Ứng Nổi Lún (3D Press)**:
   - Mọi nút bấm, card, tag lọc đều phải có hiệu ứng rê chuột nhấc lên và nhấn lún xuống.
5. **Code Hoàn Chỉnh Copy-Paste Chạy Ngay**:
   - Viết trọn vẹn HTML/CSS/JS, không dùng dấu ba chấm `...`, không cắt bớt hàm.
