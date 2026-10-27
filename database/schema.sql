-- ====================================================================
-- CƠ SỞ DỮ LIỆU SMT MAINTENANCE MANAGEMENT SYSTEM (POSTGRESQL / MYSQL)
-- HỆ THỐNG QUẢN LÝ THIẾT BỊ VÀ LỊCH SỬ THAY THẾ LINH KIỆN SMT
-- ====================================================================

-- 1. Bảng danh mục thiết bị SMT
CREATE TABLE IF NOT EXISTS equipments (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) UNIQUE NOT NULL, -- Ví dụ: MNT-L1-01, PRT-L1-01
    equipment_name VARCHAR(100) NOT NULL,       -- Ví dụ: Yamaha Mounter YSM20, DEK Horizon
    category VARCHAR(50) NOT NULL,              -- 'MOUNTER', 'PRINTER', 'AUTO_LABEL', 'BUFFER_CONVEYOR', 'REFLOW', 'LASER_MARKING', 'BONDING'
    line_name VARCHAR(50) NOT NULL,             -- Line 1, Line 2, Line 3...
    model VARCHAR(50),                          -- YSM20, SVL-200, SSB-200D, BISL-T180-D...
    serial_number VARCHAR(50),                  -- Serial từ nhà máy
    installation_date DATE,                     -- Ngày lắp đặt
    status VARCHAR(20) DEFAULT 'Running',       -- 'Running', 'Maintenance', 'Stopped'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng danh mục linh kiện (Spare Parts Inventory)
CREATE TABLE IF NOT EXISTS spare_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,    -- Ví dụ: NZ-9921, SY3120-6LZ-M5, PSN17-5DN2
    part_name VARCHAR(100) NOT NULL,            -- Ví dụ: Đầu hút Nozzle S-05, Valve điều khiển Vacuum
    category VARCHAR(50),                       -- 'Nozzle', 'Belt', 'Valve', 'Sensor', 'Filter', 'Bearing', 'Motor'
    stock_quantity INT DEFAULT 0,               -- Số lượng tồn kho hiện tại
    min_stock_alert INT DEFAULT 5               -- Định mức tồn tối thiểu để kích hoạt cảnh báo đỏ/vàng
);

-- 3. Bảng lịch sử thay thế linh kiện (Maintenance & Replacement History)
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    equipment_id INT REFERENCES equipments(id) ON DELETE CASCADE,
    part_id INT REFERENCES spare_parts(id) ON DELETE SET NULL,
    quantity_used INT NOT NULL,                 -- Số lượng linh kiện xuất thay thế
    replaced_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Thời gian thay thế
    failure_reason TEXT,                        -- Nguyên nhân hỏng hóc (Mòn, đứt dây curoa, kẹt van...)
    technician_name VARCHAR(100) NOT NULL,      -- Tên kỹ thuật viên thực hiện (PIC)
    notes TEXT                                  -- Ghi chú bổ sung
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_equipments_category ON equipments(category);
CREATE INDEX IF NOT EXISTS idx_equipments_line ON equipments(line_name);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_part ON maintenance_logs(part_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_logs(replaced_date);
