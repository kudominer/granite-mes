// ===== StoneFlow Pro - Supabase Integration =====
// Dùng anon key (từ js/config.js). Data lưu bền vững trên project granite-mes.
let sbClient = null;
// Quy trình khép kín (workflow) được lưu NGAY TRONG cột steps (JSONB) đã có sẵn,
// dưới dạng 1 phần tử đánh dấu { key: '__wf', data: {...} }.
// Vì vậy KHÔNG cần tạo cột mới, KHÔNG phải chạy ALTER TABLE trên Supabase.

function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('[StoneFlow] Chưa cấu hình Supabase (js/config.js). Dùng data tạm bộ nhớ.');
    return false;
  }
  sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return true;
}

// Load toàn bộ data từ Supabase vào biến global (orders, inventory)
async function loadAllFromSupabase() {
  if (!sbClient) return false;
  try {
    // Orders
    const { data: ordersData, error: e1 } = await sbClient.from('orders').select('*');
    if (e1) throw e1;
    // Slabs
    const { data: slabsData, error: e2 } = await sbClient.from('slabs').select('*');
    if (e2) throw e2;
    // Photos
    const { data: photosData, error: e3 } = await sbClient.from('order_photos').select('*');
    if (e3) throw e3;
    // Inventory
    const { data: invData, error: e4 } = await sbClient.from('inventory').select('*');
    if (e4) throw e4;

    // Ghép slabs vào orders
    const ordersMerged = (ordersData || []).map(o => {
      // Lấy quy trình khép kín từ phần tử đánh dấu __wf trong steps (đã có sẵn, không cần cột mới)
      const allSteps = o.steps || [];
      const wfMarker = allSteps.find(s => s && s.key === '__wf');
      return {
        ...o,
        workflow: (wfMarker && wfMarker.data) || null,
        steps: allSteps.filter(s => !(s && s.key === '__wf')),
        extraTasks: o.extra_tasks || [],
        slabs: slabsData.filter(s => s.order_id === o.id).map(s => ({
          dai: s.dai, rong: s.rong, kieu: s.kieu, donGia: s.don_gia, note: s.note
        })),
        photos: photosData.filter(p => p.order_id === o.id).map(p => p.photo)
      };
    });

    const invMerged = (invData || []).map(i => ({
      ...i,
      ma: i.ma || '', qty: i.qty || 1, photo: i.photo || '', note: i.note || ''
    }));

    // Gán vào global (data.js đã khai báo let orders, inventory)
    if (ordersMerged.length > 0) {
      window.orders = ordersMerged;
    } else if (typeof orders !== 'undefined' && orders.length > 0) {
      // DB rỗng nhưng có data mẫu -> push mẫu lên DB luôn
      await pushSeedToSupabase();
    }
    if (invMerged.length > 0) {
      window.inventory = invMerged;
    } else if (typeof inventory !== 'undefined' && inventory.length > 0) {
      await pushSeedInventory();
    }
    return true;
  } catch (err) {
    console.error('[StoneFlow] Lỗi load Supabase:', err.message);
    return false;
  }
}

// ===== SAVE ORDER (có slabs + photos) =====
async function saveOrderToSupabase(order) {
  if (!sbClient) return;
  // Nhúng quy trình khép kín vào steps (dưới dạng phần tử __wf) — KHÔNG cần cột mới
  const stepsForDb = [...(order.steps || [])];
  const wfIdx = stepsForDb.findIndex(s => s && s.key === '__wf');
  if (order.workflow) {
    const marker = { key: '__wf', data: order.workflow };
    if (wfIdx >= 0) stepsForDb[wfIdx] = marker;
    else stepsForDb.push(marker);
  } else if (wfIdx >= 0) {
    stepsForDb.splice(wfIdx, 1);
  }
  const orderRow = {
    id: order.id,
    customer: order.customer,
    phone: order.phone,
    stone: order.stone,
    branch: order.branch,
    status: order.status,
    total: order.total,
    pay_flag: order.payFlag,
    notes: order.notes,
    steps: stepsForDb,
    extra_tasks: order.extraTasks || []
  };
  await sbClient.from('orders').upsert(orderRow, { onConflict: 'id' });

  // Slabs: xoá cũ, thêm mới
  await sbClient.from('slabs').delete().eq('order_id', order.id);
  if (order.slabs && order.slabs.length) {
    const slabRows = order.slabs.map(s => ({
      order_id: order.id, dai: s.dai, rong: s.rong, kieu: s.kieu, don_gia: s.donGia, note: s.note
    }));
    await sbClient.from('slabs').insert(slabRows);
  }
  // Photos
  await sbClient.from('order_photos').delete().eq('order_id', order.id);
  if (order.photos && order.photos.length) {
    const photoRows = order.photos.map(p => ({ order_id: order.id, photo: p }));
    await sbClient.from('order_photos').insert(photoRows);
  }
}

// ===== SAVE INVENTORY ITEM =====
async function saveInventoryToSupabase(item) {
  if (!sbClient) return;
  const row = {
    id: item.id, name: item.name, ma: item.ma, owner_type: item.ownerType,
    owner_name: item.ownerName, size: item.size, qty: item.qty,
    photo: item.photo, note: item.note
  };
  await sbClient.from('inventory').upsert(row, { onConflict: 'id' });
}

// ===== SEED (lần đầu DB rỗng) =====
async function pushSeedToSupabase() {
  for (const o of (typeof orders !== 'undefined' ? orders : [])) {
    await saveOrderToSupabase(o);
  }
}
async function pushSeedInventory() {
  for (const i of (typeof inventory !== 'undefined' ? inventory : [])) {
    await saveInventoryToSupabase(i);
  }
}
