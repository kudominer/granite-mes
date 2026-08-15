// scripts/db-exec.js — Chạy 1 câu lệnh SQL DDL/DML trên Supabase Postgres của granite-mes.
// Dùng khi cần tạo bảng/cột (thay vì dán SQL thủ công vào SQL Editor).
// Usage: node scripts/db-exec.js "CREATE TABLE IF NOT EXISTS x (...);"
// Yêu cầu: biến DATABASE_URL trong .env (thêm vào từ Supabase Dashboard -> Settings -> Database -> Connection string).
try { require('dotenv').config(); } catch (e) {}
const { Client } = require('pg');

const sql = process.argv[2];
if (!sql) {
  console.error('Thiếu câu lệnh SQL. Usage: node scripts/db-exec.js "SQL..."');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Thiếu DATABASE_URL trong .env (lấy từ Supabase Dashboard project granite-mes -> Settings -> Database)');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect()
  .then(() => client.query(sql))
  .then(res => {
    console.log('✅ THÀNH CÔNG. rows:', res.rowCount);
    if (res.rows && res.rows.length) console.log(JSON.stringify(res.rows, null, 2));
    return client.end();
  })
  .catch(e => {
    console.error('❌ LỖI:', e.message);
    client.end().catch(() => {});
    process.exit(1);
  });
