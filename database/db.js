const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, 'smt_management.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Verify tables exist, if not run seed_real_factory_data.py
try {
    const tableCheck = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='equipments'").get();
    if (!tableCheck || tableCheck.count === 0) {
        console.log('--- Bảng dữ liệu chưa tồn tại, đang nạp dữ liệu chuẩn từ Master Machine SMT ---');
        execSync('python database/seed_real_factory_data.py', { stdio: 'inherit' });
    }
} catch (e) {
    console.error('Error verifying database:', e);
}

module.exports = {
    db
};
