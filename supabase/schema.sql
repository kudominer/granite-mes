-- ============================================================
-- StoneFlow Pro - Supabase Schema (Project: granite-mes)
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- (Dashboard -> Project granite-mes -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

-- 1. BẢNG ĐƠN HÀNG
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,           -- VD: DH-101
  customer    TEXT NOT NULL,
  phone       TEXT,
  stone       TEXT,
  branch      TEXT,                       -- kiểu gia công: '45' hoặc 'bo'
  status      TEXT,
  total       BIGINT DEFAULT 0,           -- tổng tiền đơn (VNĐ)
  pay_flag    TEXT,                       -- 'thu_truoc' | 'thu_sau'
  notes       TEXT,
  steps       JSONB DEFAULT '[]'::jsonb,  -- tiến độ các bước (quy trình cũ, giữ để đọc dữ liệu cũ)
  extra_tasks JSONB DEFAULT '[]'::jsonb,  -- công đoạn phụ
  workflow    JSONB DEFAULT '{}'::jsonb,  -- quy trình khép kín mới (nhan_don, cat, so_lieu_cat, lip, ghep, bo_kieu, danh_bong, hoan_thanh, da_giao, tam_hoan...)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG TẤM ĐÁ (mỗi đơn có nhiều tấm)
CREATE TABLE IF NOT EXISTS slabs (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
  dai         NUMERIC DEFAULT 0,          -- cm
  rong        NUMERIC DEFAULT 0,          -- cm
  kieu        TEXT,                       -- kiểu gia công cạnh
  don_gia     BIGINT DEFAULT 0,           -- VNĐ/tấm
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG KHO (đá khách gửi / đá dư / thành phẩm)
CREATE TABLE IF NOT EXISTS inventory (
  id          TEXT PRIMARY KEY,           -- VD: INV-01, RCV-001
  name        TEXT,
  ma          TEXT,                        -- mẫu mã
  owner_type  TEXT,                        -- 'customer' | 'shop'
  owner_name  TEXT,
  size        TEXT,
  qty         INT DEFAULT 1,
  photo       TEXT,                        -- base64 (tạm thời; sau này chuyển Storage)
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG ẢNH ĐƠN HÀNG
CREATE TABLE IF NOT EXISTS order_photos (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
  photo       TEXT,                        -- base64
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEX (tăng tốc truy vấn)
CREATE INDEX IF NOT EXISTS idx_slabs_order ON slabs(order_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON order_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_owner ON inventory(owner_type);

-- 6. ROW LEVEL SECURITY (bật để an toàn)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;

-- Policy: cho phép anon đọc/ghi (vì app nội bộ, không login)
-- LƯU Ý: nếu sau này thêm Auth, sửa policy này.
-- 7. CẬP NHẬT CHO DB ĐÃ TẠO TỪ TRƯỚC (chạy lại script này là an toàn)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '{}'::jsonb;

CREATE POLICY "allow_all_orders"   ON orders        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_slabs"   ON slabs         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_inv"     ON inventory     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_photos"  ON order_photos  FOR ALL USING (true) WITH CHECK (true);
