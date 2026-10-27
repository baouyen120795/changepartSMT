const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');
const path = require('path');
const { db } = require('../database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend build if dist exists
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Route tải schema.sql
app.get('/database/schema.sql', (req, res) => {
    res.download(path.join(__dirname, '../database/schema.sql'));
});

// API Kích hoạt đồng bộ / nạp dữ liệu từ các file Excel trong các thư mục SMT
app.post('/api/import-excel', (req, res) => {
    const { exec } = require('child_process');
    const pyScript = path.join(__dirname, '../database/seed_real_factory_data.py');
    exec(`python "${pyScript}"`, (err, stdout, stderr) => {
        if (err) {
            console.error('Import error:', stderr || err.message);
            return res.status(500).json({ error: 'Lỗi nạp dữ liệu: ' + (stderr || err.message) });
        }
        res.json({ message: 'Đã nạp và đồng bộ dữ liệu từ tất cả các file Excel thành công!', output: stdout });
    });
});

// ==========================================
// 1. APIs CHO THIẾT BỊ (EQUIPMENTS)
// ==========================================

// 1.1 GET /api/equipments - Lấy danh sách thiết bị theo bộ lọc
app.get('/api/equipments', (req, res) => {
    const { category, line, status, search } = req.query;
    try {
        let query = 'SELECT * FROM equipments WHERE 1=1';
        const params = [];

        if (category && category !== 'ALL') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (line && line !== 'ALL') {
            if (line.includes('-')) {
                query += ' AND line_name = ?';
                params.push(line);
            } else {
                query += ' AND (line_name = ? OR line_name LIKE ?)';
                params.push(line, `${line}-%`);
            }
        }
        if (status && status !== 'ALL') {
            query += ' AND status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (equipment_code LIKE ? OR equipment_name LIKE ? OR model LIKE ? OR serial_number LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        query += ' ORDER BY line_name ASC, equipment_code ASC';

        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching equipments:', err);
        res.status(500).json({ error: err.message });
    }
});

// 1.2 GET /api/equipments/:id - Chi tiết thiết bị & lịch sử thay thế của máy đó
app.get('/api/equipments/:id', (req, res) => {
    try {
        const eq = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
        if (!eq) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
        }

        // Lấy lịch sử thay thế của thiết bị
        const logs = db.prepare(`
            SELECT m.*, s.part_number, s.part_name, s.category as part_category
            FROM maintenance_logs m
            LEFT JOIN spare_parts s ON m.part_id = s.id
            WHERE m.equipment_id = ?
            ORDER BY m.replaced_date DESC
        `).all(req.params.id);

        res.json({ equipment: eq, maintenance_history: logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1.3 POST /api/equipments - Thêm thiết bị mới
app.post('/api/equipments', (req, res) => {
    const { equipment_code, equipment_name, category, line_name, model, serial_number, installation_date, status } = req.body;
    if (!equipment_code || !equipment_name || !category || !line_name) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: mã máy, tên thiết bị, phân loại, chuyền (line)' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO equipments (equipment_code, equipment_name, category, line_name, model, serial_number, installation_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            equipment_code,
            equipment_name,
            category,
            line_name,
            model || null,
            serial_number || null,
            installation_date || null,
            status || 'Running'
        );

        const newEq = db.prepare('SELECT * FROM equipments WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Thêm thiết bị thành công', equipment: newEq });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Mã thiết bị đã tồn tại trong hệ thống' });
        }
        res.status(500).json({ error: err.message });
    }
});

// 1.4 PUT /api/equipments/:id - Cập nhật thiết bị
app.put('/api/equipments/:id', (req, res) => {
    const { equipment_name, category, line_name, model, serial_number, installation_date, status } = req.body;
    try {
        const stmt = db.prepare(`
            UPDATE equipments
            SET equipment_name = COALESCE(?, equipment_name),
                category = COALESCE(?, category),
                line_name = COALESCE(?, line_name),
                model = COALESCE(?, model),
                serial_number = COALESCE(?, serial_number),
                installation_date = COALESCE(?, installation_date),
                status = COALESCE(?, status)
            WHERE id = ?
        `);
        stmt.run(equipment_name, category, line_name, model, serial_number, installation_date, status, req.params.id);

        const updated = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
        res.json({ message: 'Cập nhật thiết bị thành công', equipment: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1.5 DELETE /api/equipments/:id - Xóa thiết bị
app.delete('/api/equipments/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM equipments WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Đã xóa thiết bị thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. APIs CHO LỊCH SỬ THAY THẾ (MAINTENANCE)
// ==========================================

// 2.1 GET /api/maintenance - Danh sách toàn bộ lịch sử thay thế
app.get('/api/maintenance', (req, res) => {
    const { equipment_id, category, line, search } = req.query;
    try {
        let query = `
            SELECT m.*, 
                   e.equipment_code, e.equipment_name, e.category as equipment_category, e.line_name, e.serial_number, e.asset_no,
                   s.part_number, s.part_name, s.category as part_category
            FROM maintenance_logs m
            JOIN equipments e ON m.equipment_id = e.id
            LEFT JOIN spare_parts s ON m.part_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (equipment_id) {
            query += ' AND m.equipment_id = ?';
            params.push(equipment_id);
        }
        if (category && category !== 'ALL') {
            query += ' AND e.category = ?';
            params.push(category);
        }
        if (line && line !== 'ALL') {
            if (line.includes('-')) {
                query += ' AND e.line_name = ?';
                params.push(line);
            } else {
                query += ' AND (e.line_name = ? OR e.line_name LIKE ?)';
                params.push(line, `${line}-%`);
            }
        }
        if (search) {
            query += ' AND (e.equipment_code LIKE ? OR e.equipment_name LIKE ? OR e.serial_number LIKE ? OR s.part_name LIKE ? OR s.part_number LIKE ? OR m.technician_name LIKE ? OR m.failure_reason LIKE ? OR m.source_file LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term, term, term, term, term, term);
        }

        query += ' ORDER BY m.replaced_date DESC, m.id DESC';

        const rows = db.prepare(query).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2.2 POST /api/maintenance - Ghi nhận lịch sử thay thế linh kiện (theo spec yêu cầu)
app.post('/api/maintenance', (req, res) => {
    const { equipment_id, part_id, quantity_used, failure_reason, technician_name, notes, replaced_date } = req.body;

    if (!equipment_id || !technician_name || !quantity_used) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mã thiết bị, kỹ thuật viên và số lượng linh kiện' });
    }

    try {
        const qty = parseInt(quantity_used, 10);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Số lượng thay thế phải là số nguyên dương' });
        }

        // Bắt đầu transaction ghi log và trừ kho nếu có part_id
        const dateToUse = replaced_date || new Date().toISOString().replace('T', ' ').substring(0, 19);

        const insertStmt = db.prepare(`
            INSERT INTO maintenance_logs (equipment_id, part_id, quantity_used, failure_reason, technician_name, notes, replaced_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
            equipment_id,
            part_id || null,
            qty,
            failure_reason || '',
            technician_name,
            notes || '',
            dateToUse
        );

        // Trừ số lượng trong kho spare_parts
        if (part_id) {
            const updateStock = db.prepare(`
                UPDATE spare_parts
                SET stock_quantity = MAX(0, stock_quantity - ?)
                WHERE id = ?
            `);
            updateStock.run(qty, part_id);
        }

        const newLog = db.prepare(`
            SELECT m.*, e.equipment_code, e.equipment_name, s.part_name, s.part_number
            FROM maintenance_logs m
            JOIN equipments e ON m.equipment_id = e.id
            LEFT JOIN spare_parts s ON m.part_id = s.id
            WHERE m.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Đã ghi nhận lịch sử thay thế linh kiện thành công!',
            log: newLog
        });
    } catch (err) {
        console.error('Error logging maintenance:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2.3 DELETE /api/maintenance/:id - Xóa một bản ghi lịch sử
app.delete('/api/maintenance/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM maintenance_logs WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Xóa lịch sử bảo dưỡng thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. API XUẤT EXCEL (EXCELJS THEO ĐÚNG SPEC)
// ==========================================

// 3.1 GET /api/maintenance/export-excel
app.get('/api/maintenance/export-excel', async (req, res) => {
    const { category, line, equipment_id } = req.query;
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SMT Maintenance System';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Lich Su Thay The Linh Kien');

        // Định dạng tiêu đề cột
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Mã Thiết Bị', key: 'equipment_code', width: 18 },
            { header: 'Số Serial Máy', key: 'serial_number', width: 22 },
            { header: 'Tên Thiết Bị', key: 'equipment_name', width: 32 },
            { header: 'Phân Loại', key: 'category', width: 18 },
            { header: 'Chuyền (Line)', key: 'line_name', width: 15 },
            { header: 'Mã Part Number', key: 'part_number', width: 20 },
            { header: 'Tên Linh Kiện', key: 'part_name', width: 32 },
            { header: 'Số Lượng', key: 'quantity_used', width: 12 },
            { header: 'Nguyên Nhân / Chi Tiết', key: 'failure_reason', width: 38 },
            { header: 'Kỹ Thuật Viên', key: 'technician_name', width: 20 },
            { header: 'Thời Gian Thay', key: 'replaced_date', width: 22 },
            { header: 'Ghi Chú Vị Trí', key: 'notes', width: 30 },
            { header: 'Nguồn File Excel', key: 'source_file', width: 35 }
        ];

        // Format header theo spec: nền 1E3A8A, chữ trắng, in đậm
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 28;

        // Lấy dữ liệu thực từ CSDL
        let query = `
            SELECT m.id, e.equipment_code, e.serial_number, e.equipment_name, e.category, e.line_name,
                   COALESCE(s.part_name, 'Linh kiện ngoài') as part_name,
                   COALESCE(s.part_number, 'N/A') as part_number,
                   m.quantity_used, m.failure_reason, m.technician_name, m.replaced_date, m.notes, m.source_file
            FROM maintenance_logs m
            JOIN equipments e ON m.equipment_id = e.id
            LEFT JOIN spare_parts s ON m.part_id = s.id
            WHERE 1=1
        `;
        const params = [];
        if (category && category !== 'ALL') {
            query += ' AND e.category = ?';
            params.push(category);
        }
        if (line && line !== 'ALL') {
            query += ' AND e.line_name = ?';
            params.push(line);
        }
        if (equipment_id) {
            query += ' AND m.equipment_id = ?';
            params.push(equipment_id);
        }
        query += ' ORDER BY m.replaced_date DESC';

        const rows = db.prepare(query).all(...params);

        rows.forEach((row, index) => {
            const addedRow = worksheet.addRow({
                stt: index + 1,
                equipment_code: row.equipment_code,
                serial_number: row.serial_number || '',
                equipment_name: row.equipment_name,
                category: row.category,
                line_name: row.line_name,
                part_number: row.part_number,
                part_name: row.part_name,
                quantity_used: row.quantity_used,
                failure_reason: row.failure_reason,
                technician_name: row.technician_name,
                replaced_date: row.replaced_date ? row.replaced_date.substring(0, 10) : '',
                notes: row.notes || '',
                source_file: row.source_file || ''
            });

            // Định dạng border & alignment cho từng hàng
            addedRow.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
                if (colNumber === 1 || colNumber === 8 || colNumber === 11) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });

            // Zebra background striping
            if (index % 2 === 1) {
                addedRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9FAFB' }
                };
            }
        });

        // Tên file theo ngày
        const filename = `SMT_Maintenance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error generating Excel:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. APIs KHO LINH KIỆN (SPARE PARTS)
// ==========================================

// 4.1 GET /api/spare-parts - Danh sách linh kiện trong kho
app.get('/api/spare-parts', (req, res) => {
    const { category, lowStockOnly, search } = req.query;
    try {
        let query = 'SELECT *, (stock_quantity <= min_stock_alert) AS is_low_stock FROM spare_parts WHERE 1=1';
        const params = [];

        if (category && category !== 'ALL') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (lowStockOnly === 'true') {
            query += ' AND stock_quantity <= min_stock_alert';
        }
        if (search) {
            query += ' AND (part_number LIKE ? OR part_name LIKE ? OR category LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' ORDER BY is_low_stock DESC, part_number ASC';

        const rows = db.prepare(query).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4.2 POST /api/spare-parts - Thêm linh kiện mới
app.post('/api/spare-parts', (req, res) => {
    const { part_number, part_name, category, stock_quantity, min_stock_alert } = req.body;
    if (!part_number || !part_name) {
        return res.status(400).json({ error: 'Vui lòng điền mã linh kiện và tên linh kiện' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO spare_parts (part_number, part_name, category, stock_quantity, min_stock_alert)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            part_number,
            part_name,
            category || 'General',
            parseInt(stock_quantity || 0, 10),
            parseInt(min_stock_alert || 5, 10)
        );

        const newPart = db.prepare('SELECT * FROM spare_parts WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Thêm linh kiện thành công', part: newPart });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Mã Part Number này đã tồn tại' });
        }
        res.status(500).json({ error: err.message });
    }
});

// 4.3 PUT /api/spare-parts/:id - Cập nhật tồn kho hoặc thông tin linh kiện
app.put('/api/spare-parts/:id', (req, res) => {
    const { part_name, category, stock_quantity, min_stock_alert, add_stock } = req.body;
    try {
        if (add_stock !== undefined) {
            // Nhập thêm kho
            const qtyToAdd = parseInt(add_stock, 10) || 0;
            db.prepare('UPDATE spare_parts SET stock_quantity = stock_quantity + ? WHERE id = ?').run(qtyToAdd, req.params.id);
        } else {
            // Cập nhật thông số
            db.prepare(`
                UPDATE spare_parts
                SET part_name = COALESCE(?, part_name),
                    category = COALESCE(?, category),
                    stock_quantity = COALESCE(?, stock_quantity),
                    min_stock_alert = COALESCE(?, min_stock_alert)
                WHERE id = ?
            `).run(
                part_name,
                category,
                stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
                min_stock_alert !== undefined ? parseInt(min_stock_alert, 10) : null,
                req.params.id
            );
        }

        const updated = db.prepare('SELECT *, (stock_quantity <= min_stock_alert) as is_low_stock FROM spare_parts WHERE id = ?').get(req.params.id);
        res.json({ message: 'Cập nhật kho linh kiện thành công', part: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4.4 DELETE /api/spare-parts/:id
app.delete('/api/spare-parts/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM spare_parts WHERE id = ?').run(req.params.id);
        res.json({ message: 'Đã xóa linh kiện khỏi kho' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. API BÁO CÁO THỐNG KÊ DASHBOARD (STATS)
// ==========================================
app.get('/api/stats', (req, res) => {
    try {
        const totalEquipments = db.prepare('SELECT COUNT(*) as c FROM equipments').get().c;
        const runningEquipments = db.prepare("SELECT COUNT(*) as c FROM equipments WHERE status = 'Running'").get().c;
        const maintenanceEquipments = db.prepare("SELECT COUNT(*) as c FROM equipments WHERE status = 'Maintenance'").get().c;
        const stoppedEquipments = db.prepare("SELECT COUNT(*) as c FROM equipments WHERE status = 'Stopped'").get().c;

        const lowStockParts = db.prepare('SELECT COUNT(*) as c FROM spare_parts WHERE stock_quantity <= min_stock_alert').get().c;
        const totalLogs = db.prepare('SELECT COUNT(*) as c FROM maintenance_logs').get().c;

        const categoryStats = db.prepare(`
            SELECT category, COUNT(*) as count
            FROM equipments
            GROUP BY category
            ORDER BY count DESC
        `).all();

        const lineStats = db.prepare(`
            SELECT line_name, COUNT(*) as count
            FROM equipments
            GROUP BY line_name
            ORDER BY line_name ASC
        `).all();

        const lowStockItems = db.prepare(`
            SELECT * FROM spare_parts
            WHERE stock_quantity <= min_stock_alert
            ORDER BY stock_quantity ASC
            LIMIT 5
        `).all();

        const recentLogs = db.prepare(`
            SELECT m.*, e.equipment_code, e.equipment_name, s.part_name, s.part_number
            FROM maintenance_logs m
            JOIN equipments e ON m.equipment_id = e.id
            LEFT JOIN spare_parts s ON m.part_id = s.id
            ORDER BY m.replaced_date DESC
            LIMIT 5
        `).all();

        res.json({
            totals: {
                equipments: totalEquipments,
                running: runningEquipments,
                maintenance: maintenanceEquipments,
                stopped: stoppedEquipments,
                low_stock_parts: lowStockParts,
                maintenance_events: totalLogs
            },
            categories: categoryStats,
            lines: lineStats,
            low_stock_items: lowStockItems,
            recent_logs: recentLogs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    if (req.accepts('html')) {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                res.status(200).send(`
                    <div style="font-family: sans-serif; padding: 40px; text-align: center;">
                        <h2>SMT Equipment Maintenance Server is Running!</h2>
                        <p>API endpoints ready at <code>/api/equipments</code>, <code>/api/maintenance</code>, <code>/api/maintenance/export-excel</code></p>
                        <p>Frontend is currently building or running in Vite dev mode.</p>
                    </div>
                `);
            }
        });
    } else {
        res.status(404).json({ error: 'Endpoint not found' });
    }
});

app.listen(PORT, () => {
    console.log(`SMT Maintenance Server running on port ${PORT}`);
    console.log(`- Web UI: http://localhost:${PORT}`);
    console.log(`- API Equipments: http://localhost:${PORT}/api/equipments`);
    console.log(`- API Maintenance: http://localhost:${PORT}/api/maintenance`);
    console.log(`- API Export Excel: http://localhost:${PORT}/api/maintenance/export-excel`);
});
