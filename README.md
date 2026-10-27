# ỨNG DỤNG QUẢN LÝ THIẾT BỊ VÀ LỊCH SỬ THAY THẾ LINH KIỆN SMT

Hệ thống theo dõi PM (Preventive Maintenance), bảo trì, sửa chữa và thay thế linh kiện chuyên dụng cho nhà máy SMT (Surface Mount Technology), hỗ trợ đầy đủ các dòng máy:
- **Mounter** (Máy gắp linh kiện: Panasonic NPM-D3, NPM-TT2, Yamaha YSM20R...)
- **Printer** (Máy in kem hàn: DEK Horizon 03iX, NeoHorizon, Yamaha YCP10, MPM Momentum...)
- **Auto Labeler** (Máy dán tem nhãn tự động: BISL-T180-D...)
- **Buffer Conveyor** (Băng chuyền đệm / Loader: SSB-200D NG Buffer, SVL-200 Vacuum Loader, SCC-800D...)
- **Reflow** (Lò hàn đối lưu: TSM N2 Reflow...)

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```
c:\webchangepart\
├── database\
│   ├── schema.sql              # File DDL chuẩn cho PostgreSQL / MySQL
│   ├── db.js                   # Kết nối SQLite tự động khởi tạo & seed dữ liệu thực tế
│   └── smt_management.db       # CSDL SQLite lưu trữ dữ liệu bền vững
├── server\
│   └── server.js               # Backend Express REST APIs & xuất Excel bằng ExcelJS
├── src\
│   ├── App.jsx                 # Giao diện React hoàn chỉnh (Dashboard, Thiết bị, Lịch sử, Kho, Schema)
│   ├── main.jsx                # Entry point React
│   └── index.css               # Tailwind CSS & Typography
├── dist\                       # Bản build nén tối ưu của Frontend
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### 1. Khởi động ứng dụng (Chế độ Production - Cả Backend & Frontend)
Ứng dụng đã được biên dịch sẵn. Chỉ cần chạy:
```bash
npm start
# Hoặc: node server/server.js
```
Mở trình duyệt truy cập:
👉 **http://localhost:3000**

### 2. Chế độ Phát triển (Development Mode với Vite Hot Reload)
```bash
npm run dev
```
Trình duyệt mở tại `http://localhost:5173` (tự động proxy API sang `http://localhost:3000`).

### 3. Build lại giao diện sau khi chỉnh sửa
```bash
npm run build
```

---

## 🗄️ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

File DDL lưu tại `database/schema.sql`.

```sql
-- 1. Bảng danh mục thiết bị SMT
CREATE TABLE equipments (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) UNIQUE NOT NULL, -- Ví dụ: MNT-L1-01
    equipment_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,              -- 'MOUNTER', 'PRINTER', 'AUTO_LABEL', 'BUFFER_CONVEYOR'
    line_name VARCHAR(50) NOT NULL,             -- Line 1, Line 2...
    model VARCHAR(50),
    serial_number VARCHAR(50),
    installation_date DATE,
    status VARCHAR(20) DEFAULT 'Running',       -- 'Running', 'Maintenance', 'Stopped'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng danh mục linh kiện (Spare Parts)
CREATE TABLE spare_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5
);

-- 3. Bảng lịch sử thay thế linh kiện (Maintenance & Replacement History)
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    equipment_id INT REFERENCES equipments(id) ON DELETE CASCADE,
    part_id INT REFERENCES spare_parts(id),
    quantity_used INT NOT NULL,
    replaced_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_reason TEXT,
    technician_name VARCHAR(100) NOT NULL,
    notes TEXT
);
```

---

## 📡 DANH SÁCH RESTFUL APIS

| Phương thức | Đường dẫn | Chức năng | Tham số / Body |
|---|---|---|---|
| **GET** | `/api/equipments` | Lấy danh sách thiết bị | `category`, `line`, `status`, `search` |
| **GET** | `/api/equipments/:id` | Chi tiết thiết bị & toàn bộ lịch sử thay part của máy | `id` |
| **POST** | `/api/equipments` | Thêm thiết bị mới | `{ equipment_code, equipment_name, category, line_name, model, serial_number, installation_date, status }` |
| **PUT** | `/api/equipments/:id` | Cập nhật thiết bị / đổi trạng thái | `{ status, line_name, equipment_name, ... }` |
| **DELETE** | `/api/equipments/:id` | Xóa thiết bị khỏi hệ thống | `id` |
| **GET** | `/api/maintenance` | Danh sách lịch sử thay thế linh kiện | `equipment_id`, `category`, `line`, `search` |
| **POST** | `/api/maintenance` | Ghi nhận thay thế linh kiện (Tự động trừ tồn kho) | `{ equipment_id, part_id, quantity_used, failure_reason, technician_name, notes, replaced_date }` |
| **DELETE** | `/api/maintenance/:id` | Xóa một bản ghi lịch sử bảo dưỡng | `id` |
| **GET** | `/api/maintenance/export-excel` | Xuất file báo cáo Excel định dạng chuẩn màu `#1E3A8A` | `category`, `line`, `equipment_id` |
| **GET** | `/api/spare-parts` | Danh sách kho linh kiện & cờ cảnh báo sắp hết | `category`, `lowStockOnly`, `search` |
| **POST** | `/api/spare-parts` | Thêm linh kiện mới vào kho | `{ part_number, part_name, category, stock_quantity, min_stock_alert }` |
| **PUT** | `/api/spare-parts/:id` | Nhập thêm hàng kho hoặc cập nhật thông tin | `{ add_stock, stock_quantity, min_stock_alert, ... }` |
| **GET** | `/api/stats` | Thống kê số lượng máy, trạng thái, cảnh báo tồn kho | Không |

---

## 🌟 CÁC TÍNH NĂNG CHÍNH CỦA GIAO DIỆN

1. **Dashboard KPI**:
   - Thống kê tổng số thiết bị, số lượng máy đang chạy (Running), đang bảo dưỡng (Maintenance), tạm dừng (Stopped).
   - Cảnh báo trực quan danh sách linh kiện dưới định mức tồn tối thiểu (`min_stock_alert`) và nút nhập kho nhanh (+).
   - Feed dòng thời gian các sự kiện thay thế phụ tùng gần nhất.
2. **Quản lý thiết bị SMT**:
   - Bộ lọc nhanh theo chủng loại: ALL, MOUNTER, PRINTER, AUTO_LABEL, BUFFER_CONVEYOR, REFLOW.
   - Bộ lọc nhanh theo Chuyền: Line 1 đến Line 6.
   - Thay đổi trạng thái máy tức thời (Running, Maintenance, Stopped) ngay trên từng dòng.
   - Nút **"Xem Lịch Sử Thay Thế"** mở popup chi tiết toàn bộ lịch sử thay linh kiện riêng của thiết bị đó.
3. **Ghi nhận lịch sử thay thế (Modal tiện ích)**:
   - Chọn máy từ danh sách, chọn linh kiện kho (tự động hiển thị tồn kho hiện có), nhập số lượng.
   - Gợi ý nguyên nhân nhanh: "Mòn đầu hút", "Đứt dây đai belt", "Hỏng van vacuum", "Sensor chập chờn"...
   - Khi lưu, hệ thống **tự động trừ số lượng trong kho** tương ứng.
4. **Xuất báo cáo Excel với ExcelJS**:
   - Tạo file `.xlsx` chuyên nghiệp, tiêu đề in đậm nền xanh navy (`#1E3A8A`), chữ trắng, kẻ viền ô, căn lề và sọc vằn zebra cho từng dòng.
5. **Quản lý kho linh kiện (Spare Parts)**:
   - Danh sách chi tiết Part number, tên phụ tùng, số lượng tồn kho, định mức tối thiểu.
   - Huy hiệu đỏ cảnh báo khi sắp hết hàng.
   - Chức năng nhập thêm hàng (+ Nhập Kho) nhanh chóng.
