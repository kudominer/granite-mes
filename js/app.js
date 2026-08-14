    // Toggle Theme (dark mode class)
    function toggleTheme() {
      const root = document.documentElement;
      root.classList.toggle('dark');
      localStorage.setItem('stoneflow-theme', root.classList.contains('dark') ? 'dark' : 'light');
    }
    // Apply saved theme on load
    (function () {
      const saved = localStorage.getItem('stoneflow-theme');
      if (saved === 'dark') document.documentElement.classList.add('dark');
    })();

    // Tab switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${tabId}`).classList.remove('hidden');

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-amber-600', 'dark:text-amber-400', 'bg-amber-50', 'dark:bg-amber-950/40');
        btn.classList.add('text-slate-600', 'dark:text-slate-400');
      });

      const activeBtn = document.getElementById(`nav-${tabId}`);
      activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
      activeBtn.classList.add('text-amber-600', 'dark:text-amber-400', 'bg-amber-50', 'dark:bg-amber-950/40');

      if (tabId === 'inventory') renderInventory();
      if (tabId === 'orders') renderOrdersTable();
      if (tabId === 'dashboard') renderDashboard();
    }

    // Format currency
    function formatMoney(amount) {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
    }

    // Render Dashboard
    function renderDashboard() {
      document.getElementById('kpi-active-orders').innerText = orders.length;
      document.getElementById('kpi-cust-stone').innerText = inventory.filter(i => i.ownerType === 'customer').length + ' tấm';
      document.getElementById('kpi-shop-stone').innerText = inventory.filter(i => i.ownerType === 'shop').length + ' tấm';

      const tbody = document.getElementById('dashboard-orders-list');
      tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="py-3 font-semibold text-amber-600 cursor-pointer" onclick="openOrderModal('${o.id}')">
            ${o.id} <span class="block text-xs font-normal text-slate-500">${o.customer}</span>
          </td>
          <td class="py-3">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${o.branch === '45' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-purple-50 text-purple-600 dark:bg-purple-950'}">
              ${o.branch === '45' ? 'Nhánh A: Ghép 45°' : 'Nhánh B: Ghép Bo'}
            </span>
          </td>
          <td class="py-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/50">Đang xử lý</span>
          </td>
          <td class="py-3 text-right font-bold tabular-nums">${formatMoney(o.total)}</td>
        </tr>
      `).join('');
    }

    // Render Inventory
    let currentInvTab = 'customer';
    function setInventoryTab(tab) {
      currentInvTab = tab;
      ['cust', 'shop', 'fin'].forEach(t => {
        const btn = document.getElementById(`inv-tab-${t}`);
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition ' + (
          (tab === 'customer' && t === 'cust') || (tab === 'shop' && t === 'shop') || (tab === 'finished' && t === 'fin')
          ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        );
      });
      renderInventory();
    }

    function renderInventory() {
      const tbody = document.getElementById('inventory-table-body');
      let filtered = [];
      if (currentInvTab === 'customer') {
        filtered = inventory.filter(i => i.ownerType === 'customer');
      } else if (currentInvTab === 'shop') {
        filtered = inventory.filter(i => i.ownerType === 'shop');
      } else {
        // finished goods mock
        tbody.innerHTML = `
          <tr><td colspan="5" class="p-6 text-center text-slate-400">Kho thành phẩm trống hoặc đã xuất giao công trình.</td></tr>
        `;
        return;
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Không có tấm đá nào trong mục này.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(item => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="p-4 font-semibold" data-label="Mã & Tên">
            <div class="flex items-center space-x-3">
              ${item.photo ? `<img src="${item.photo}" class="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700">` : `<div class="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><i class="fa-solid fa-image"></i></div>`}
              <div>
                <div>${item.name}</div>
                <span class="block text-xs text-slate-400">Mã: ${item.id} ${item.ma ? '· ' + item.ma : ''}</span>
              </div>
            </div>
          </td>
          <td class="p-4" data-label="Chủ Sở Hữu">
            <span class="px-2 py-1 rounded text-xs font-bold ${item.ownerType === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}">
              ${item.ownerType === 'customer' ? 'Khách gửi' : 'Sở hữu Kho'}
            </span>
            <div class="text-xs text-slate-500 mt-0.5">${item.ownerName}</div>
          </td>
          <td class="p-4 tabular-nums text-slate-600 dark:text-slate-300" data-label="Kích Thước & SL">
            ${item.size}${item.qty ? ` <span class="text-xs text-slate-400">(${item.qty} tấm)</span>` : ''}
          </td>
          <td class="p-4 text-xs text-slate-500" data-label="Ghi Chú">${item.note}</td>
          <td class="p-4 text-right" data-label="Thao Tác">
            <div class="flex flex-col items-end space-y-1.5">
              <button onclick="openEditPhotoModal('${item.id}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold transition">
                <i class="fa-solid fa-camera mr-1"></i> ${item.photo ? 'Sửa ảnh' : 'Thêm ảnh'}
              </button>
              <button onclick="transferOwnership('${item.id}')" class="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-semibold transition">
                <i class="fa-solid fa-exchange-alt mr-1"></i> Chuyển sở hữu
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    function transferOwnership(id) {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      if (item.ownerType === 'customer') {
        if (confirm(`Chuyển tấm đá ${item.name} từ "Khách gửi" sang "Kho xưởng" (do đá dư hoặc đá lỗi bù)?`)) {
          item.ownerType = 'shop';
          item.ownerName = 'Kho Xưởng (Đá dư/lỗi thu hồi)';
          renderInventory();
          alert('Đã chuyển sở hữu tấm đá về kho xưởng thành công!');
        }
      } else {
        alert('Tấm đá này hiện đã thuộc sở hữu kho xưởng.');
      }
    }

    // Render Orders
    function renderOrdersTable() {
      const tbody = document.getElementById('orders-table-body');
      tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="p-4 font-bold text-amber-600 cursor-pointer" onclick="openOrderModal('${o.id}')">
            ${o.id} <span class="block text-xs font-normal text-slate-500">${o.customer}</span>
          </td>
          <td class="p-4">
            <div class="font-semibold">${o.stone}</div>
          </td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${o.branch === '45' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}">
              ${o.branch === '45' ? 'Nhánh A: Ghép 45°' : 'Nhánh B: Ghép Bo'}
            </span>
          </td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Đang thực hiện</span>
          </td>
          <td class="p-4 text-right">
            <button onclick="openOrderModal('${o.id}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold transition">
              Cập nhật tiến độ <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Order Modal Logic
    let activeOrderId = null;
    function openOrderModal(orderId) {
      activeOrderId = orderId;
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      document.getElementById('modal-order-title').innerText = `Đơn Hàng #${order.id} - ${order.customer} (${order.branch === '45' ? 'Nhánh Ghép 45°' : 'Nhánh Ghép Bo'})`;

      const body = document.getElementById('modal-order-body');
      body.innerHTML = `
        <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-xs">
          <div><span class="text-slate-400 block">Khách hàng:</span> <strong class="text-sm">${order.customer} (${order.phone})</strong></div>
          <div><span class="text-slate-400 block">Loại đá:</span> <strong class="text-sm">${order.stone}</strong></div>
          <div><span class="text-slate-400 block">Tổng tiền:</span> <strong class="text-emerald-600 text-sm">${formatMoney(order.total)}</strong></div>
          <div><span class="text-slate-400 block">Thanh toán:</span> <strong>${order.payFlag === 'thu_truoc' ? 'Thu cọc trước' : 'Thu sau giao'}</strong></div>
        </div>

        <div>
          <h4 class="font-bold text-sm mb-3">Các bước gia công chuẩn theo nhánh (${order.branch === '45' ? 'Ghép 45°' : 'Ghép Bo'})</h4>
          <div class="space-y-2.5">
            ${order.steps.map((s, idx) => `
              <div class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div class="flex items-center space-x-3">
                  <input type="checkbox" id="step-${idx}" ${s.done ? 'checked' : ''} onchange="toggleStepItem('${order.id}', ${idx})" class="w-4 h-4 rounded text-amber-600">
                  <label for="step-${idx}" class="text-xs font-bold cursor-pointer">${s.name}</label>
                </div>
                <span class="text-xs px-2 py-0.5 rounded ${s.done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">
                  ${s.done ? 'Xong' : 'Chờ'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 space-y-2">
          <h5 class="text-xs font-bold text-amber-800 dark:text-amber-300"><i class="fa-solid fa-plus-circle mr-1"></i> Công đoạn phụ động phát sinh (Khoét lavabo, khoan lỗ...)</h5>
          <div id="extra-tasks-list" class="space-y-1">
            ${order.extraTasks.map(et => `<div class="text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border flex justify-between items-center"><span>✓ ${et.name}</span><span class="text-emerald-600 text-[10px]">Đã thêm</span></div>`).join('')}
          </div>
          <div class="flex space-x-2 pt-2">
            <input type="text" id="new-extra-task-input" placeholder="Nhập tên công đoạn phát sinh..." class="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs">
            <button onclick="addExtraTask('${order.id}')" class="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold">Thêm</button>
          </div>
        </div>
        <div class="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold text-emerald-800 dark:text-emerald-300"><i class="fa-solid fa-layer-group mr-1"></i> Danh sách tấm đá (${order.slabs ? order.slabs.length : 0} tấm)</h5>
            <button onclick="openSlabTable('${order.id}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold">+ Thêm tấm</button>
          </div>
          <div id="slabs-list" class="space-y-1.5">
            ${(order.slabs || []).map((s, i) => `
              <div class="text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border flex justify-between items-center gap-2">
                <div class="flex-1">
                  <strong>#${i+1}</strong> ${s.dai} x ${s.rong} cm · <span class="text-emerald-600 font-semibold">${s.kieu}</span>
                  ${s.note ? `<div class="text-slate-400 text-[11px]">${s.note}</div>` : ''}
                </div>
                <div class="text-right text-emerald-600 font-bold tabular-nums">${formatMoney(s.donGia)}</div>
              </div>
            `).join('')}
            ${(!order.slabs || order.slabs.length === 0) ? '<div class="text-xs text-slate-400 text-center py-1">Chưa có tấm nào. Bấm "+ Thêm tấm" để nhập.</div>' : ''}
          </div>
        </div>
      `;

      document.getElementById('order-modal').classList.remove('hidden');
      document.getElementById('order-modal').classList.add('flex');
    }

    function closeOrderModal() {
      document.getElementById('order-modal').classList.remove('flex');
      document.getElementById('order-modal').classList.add('hidden');
    }

    function toggleStepItem(orderId, stepIdx) {
      const order = orders.find(o => o.id === orderId);
      if (order && order.steps[stepIdx]) {
        order.steps[stepIdx].done = !order.steps[stepIdx].done;
      }
    }

    function addExtraTask(orderId) {
      const input = document.getElementById('new-extra-task-input');
      const val = input.value.trim();
      if (!val) return;
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.extraTasks.push({ name: val, done: true });
        input.value = '';
        openOrderModal(orderId);
      }
    }

    function saveOrderChanges() {
      closeOrderModal();
      renderDashboard();
      renderOrdersTable();
      alert('Đã lưu tiến độ gia công thành công!');
    }

    // New Order Modal
    function openNewOrderModal() {
      document.getElementById('new-order-modal').classList.remove('hidden');
      document.getElementById('new-order-modal').classList.add('flex');
    }

    function closeNewOrderModal() {
      document.getElementById('new-order-modal').classList.remove('flex');
      document.getElementById('new-order-modal').classList.add('hidden');
    }

    function createNewOrder() {
      const name = document.getElementById('new-cust-name').value.trim();
      const phone = document.getElementById('new-cust-phone').value.trim();
      const stone = document.getElementById('new-stone-type').value.trim();
      const branch = document.getElementById('new-branch').value;
      const total = parseInt(document.getElementById('new-total-price').value.replace(/\D/g, '')) || 10000000;
      const payFlag = document.getElementById('new-pay-flag').value;
      const notes = document.getElementById('new-notes').value.trim();

      if (!name || !stone) {
        alert('Vui lòng nhập tên khách và loại đá!');
        return;
      }

      const newId = 'DH-' + (100 + orders.length + 1);
      const steps = branch === '45' ? [
        { key: 'nhan_don', name: '1. Nhận đơn & Đo đạc', done: true },
        { key: 'cat', name: '2. Cắt phôi', done: false },
        { key: 'ghep_45', name: '3. Ghép 45°', done: false },
        { key: 'lip_45', name: '4. Líp 45° (Tách Líp mặt + Líp chỉ)', done: false },
        { key: 'ghep_cuoi_45', name: '5. Ghép (Kết thúc nhánh 45°)', done: false }
      ] : [
        { key: 'nhan_don', name: '1. Nhận đơn & Đo đạc', done: true },
        { key: 'khong_cat', name: '2. Không cắt (Cắt sẵn)', done: false },
        { key: 'ghep_bo', name: '3. Ghép bo', done: false },
        { key: 'ghep_giua', name: '4. Ghép', done: false },
        { key: 'bo_kieu', name: '5. Bo kiểu', done: false },
        { key: 'danh_bong', name: '6. Đánh bóng (Bắt buộc nhánh Bo)', done: false }
      ];

      orders.unshift({
        id: newId,
        customer: name,
        phone: phone || '0900...',
        stone: stone,
        branch: branch,
        status: 'moi_nhan',
        total: total,
        payFlag: payFlag,
        notes: notes,
        extraTasks: [],
        steps: steps
      });

      closeNewOrderModal();
      renderDashboard();
      renderOrdersTable();
      alert(`Đã nhận đơn hàng mới ${newId} (${branch === '45' ? 'Nhánh Ghép 45°' : 'Nhánh Ghép Bo'}) thành công!`);
    }

    // Receive Stone (Khách đem đá tới - chụp & lưu)
    function openReceiveStoneModal() {
      document.getElementById('receive-stone-modal').classList.remove('hidden');
      document.getElementById('receive-stone-modal').classList.add('flex');
    }
    function closeReceiveStoneModal() {
      document.getElementById('receive-stone-modal').classList.remove('flex');
      document.getElementById('receive-stone-modal').classList.add('hidden');
      // reset
      ['rec-cust-name','rec-order-id','rec-ma','rec-size','rec-qty','rec-notes'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('rec-photo').value = '';
      document.getElementById('rec-photo-preview').classList.add('hidden');
    }
    // Preview ảnh khi chọn file
    document.getElementById('rec-photo').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('rec-photo-img').src = ev.target.result;
        document.getElementById('rec-photo-preview').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });

    function createReceiveStone() {
      const cust = document.getElementById('rec-cust-name').value.trim();
      const orderId = document.getElementById('rec-order-id').value.trim();
      const ma = document.getElementById('rec-ma').value.trim();
      const size = document.getElementById('rec-size').value.trim();
      const qty = parseInt(document.getElementById('rec-qty').value) || 1;
      const notes = document.getElementById('rec-notes').value.trim();
      const photoInput = document.getElementById('rec-photo');
      const photoFile = photoInput.files[0];

      if (!cust || !ma) {
        alert('Vui lòng nhập Tên khách và Mẫu mã đá!');
        return;
      }

      const doSave = (photoBase64) => {
        const newId = 'RCV-' + String(receiveSeq++).padStart(3, '0');
        inventory.unshift({
          id: newId,
          name: (ma + (qty > 1 ? ` (${qty} tấm)` : '')),
          ma: ma,
          ownerType: 'customer',
          ownerName: cust + (orderId ? ` (Đơn ${orderId})` : ' (Đá khách đem tới)'),
          size: size || 'Chưa đo',
          qty: qty,
          photo: photoBase64 || '',
          note: notes || 'Nhận trực tiếp từ khách'
        });
        closeReceiveStoneModal();
        if (currentInvTab !== 'customer') setInventoryTab('customer');
        else renderInventory();
        alert(`Đã nhận đá "${ma}" từ ${cust} (${qty} tấm) và lưu vào kho khách gửi!`);
      };

      if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(ev) { doSave(ev.target.result); };
        reader.readAsDataURL(photoFile);
      } else {
        doSave('');
      }
    }

    // ===== SLAB TABLE (Phương án A: bảng nhập liệu, paste Excel) =====
    let slabOrderId = null;

    function openSlabTable(orderId) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      slabOrderId = orderId;
      document.getElementById('slab-paste').value = '';
      const tbody = document.getElementById('slab-table-body');
      tbody.innerHTML = '';
      // Nạp sẵn các tấm hiện có (nếu có)
      (order.slabs || []).forEach(s => addSlabRow(s.dai, s.rong, s.kieu, s.donGia, s.note));
      if (!(order.slabs && order.slabs.length)) addSlabRow();
      updateSlabCount();
      document.getElementById('slab-table-modal').classList.remove('hidden');
      document.getElementById('slab-table-modal').classList.add('flex');
    }

    function closeSlabTable() {
      document.getElementById('slab-table-modal').classList.remove('flex');
      document.getElementById('slab-table-modal').classList.add('hidden');
      slabOrderId = null;
    }

    function addSlabRow(dai = '', rong = '', kieu = '', donGia = '', note = '') {
      const tbody = document.getElementById('slab-table-body');
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 dark:border-slate-800';
      tr.innerHTML = `
        <td class="p-1 text-slate-400 text-xs">${tbody.children.length + 1}</td>
        <td class="p-1"><input class="slab-dai w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" value="${dai}" inputmode="decimal"></td>
        <td class="p-1"><input class="slab-rong w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" value="${rong}" inputmode="decimal"></td>
        <td class="p-1"><input class="slab-kieu w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" value="${kieu}"></td>
        <td class="p-1"><input class="slab-gia w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" value="${donGia}" inputmode="decimal"></td>
        <td class="p-1"><input class="slab-note w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" value="${note}"></td>
        <td class="p-1"><button onclick="this.closest('tr').remove(); renumberSlabs(); updateSlabCount();" class="text-red-500 hover:text-red-700 px-1" title="Xoá dòng"><i class="fa-solid fa-trash"></i></button></td>
      `;
      // Enter trong input -> thêm dòng mới
      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSlabRow(); document.querySelector('#slab-table-body tr:last-child input').focus(); } });
      });
      tbody.appendChild(tr);
      renumberSlabs();
      updateSlabCount();
    }

    function renumberSlabs() {
      document.querySelectorAll('#slab-table-body tr').forEach((tr, i) => {
        tr.children[0].textContent = i + 1;
      });
    }

    function updateSlabCount() {
      const n = document.querySelectorAll('#slab-table-body tr').length;
      document.getElementById('slab-count').textContent = `${n} tấm trong bảng`;
    }

    function parseSlabPaste() {
      const raw = document.getElementById('slab-paste').value.trim();
      if (!raw) return;
      const lines = raw.split(/\n+/);
      const tbody = document.getElementById('slab-table-body');
      tbody.innerHTML = '';
      lines.forEach(line => {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 2) return;
        addSlabRow(cols[0] || '', cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || '');
      });
      updateSlabCount();
    }

    function saveSlabTable() {
      if (!slabOrderId) return;
      const order = orders.find(o => o.id === slabOrderId);
      if (!order) return;
      const rows = document.querySelectorAll('#slab-table-body tr');
      const slabs = [];
      rows.forEach(tr => {
        const dai = parseFloat(tr.querySelector('.slab-dai').value) || 0;
        const rong = parseFloat(tr.querySelector('.slab-rong').value) || 0;
        const kieu = tr.querySelector('.slab-kieu').value.trim();
        const donGia = parseInt((tr.querySelector('.slab-gia').value || '0').replace(/\D/g, '')) || 0;
        const note = tr.querySelector('.slab-note').value.trim();
        if (dai > 0 && rong > 0) slabs.push({ dai, rong, kieu, donGia, note });
      });
      order.slabs = slabs;
      closeSlabTable();
      openOrderModal(slabOrderId);
      alert(`Đã lưu ${slabs.length} tấm vào đơn ${order.id}!`);
    }

    // Edit Photo (thêm/sửa ảnh đá trong kho)
    let editPhotoId = null;
    function openEditPhotoModal(id) {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      editPhotoId = id;
      document.getElementById('edit-photo-name').innerText = `${item.name} (${item.id})`;
      document.getElementById('edit-photo-input').value = '';
      document.getElementById('edit-photo-preview').classList.add('hidden');
      document.getElementById('edit-photo-modal').classList.remove('hidden');
      document.getElementById('edit-photo-modal').classList.add('flex');
    }
    function closeEditPhotoModal() {
      document.getElementById('edit-photo-modal').classList.remove('flex');
      document.getElementById('edit-photo-modal').classList.add('hidden');
      editPhotoId = null;
    }
    document.getElementById('edit-photo-input').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('edit-photo-img').src = ev.target.result;
        document.getElementById('edit-photo-preview').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
    function saveEditPhoto() {
      if (!editPhotoId) return;
      const item = inventory.find(i => i.id === editPhotoId);
      const file = document.getElementById('edit-photo-input').files[0];
      if (!file) { alert('Vui lòng chọn ảnh!'); return; }
      const reader = new FileReader();
      reader.onload = function(ev) {
        item.photo = ev.target.result;
        closeEditPhotoModal();
        renderInventory();
        alert('Đã lưu ảnh cho ' + item.name + '!');
      };
      reader.readAsDataURL(file);
    }

    // Init
    renderDashboard();
    renderOrdersTable();
