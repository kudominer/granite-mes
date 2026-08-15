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
      if (tabId === 'ops') renderOpsIntelligence();
    }

    // Format currency
    function formatMoney(amount) {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
    }

    // ===== Quy trình gia công khép kín (thay cho nhánh A/B) =====
    // Mỗi đơn có order.workflow. Đơn cũ (chưa có) được chuyển đổi tự động khi mở.
    function defaultWorkflow() {
      return {
        nhanDon: true,        // 1. Nhận đơn, kiểm tra đá nhập
        cat: '',              // 2. '' | 'cat' | 'khong_cat'
        catQuyCach: false,    //   Cắt quy cách
        soLieuCat: '',        //   Số liệu cắt (Dài x Rộng)
        lip: false,           // 3a. Ghép 45°: Líp (mặt + chỉ)
        ghep45: false,        // 3b. Ghép (45°)
        ghepBo: false,        // 3a. Ghép bo: Ghép (bo)
        boKieu: false,        // 3b. Bo kiểu
        danhBong: false,      // 3c. Đánh bóng
        hoanThanh: false,     // 4. Hoàn thành đơn, chờ giao
        daGiao: false,        //   Chưa giao / Đã giao
        tamHoan: false,       //   Tạm hoãn
        tamHoanNote: ''       //   Lý do tạm hoãn (nhập tay)
      };
    }

    // Đảm bảo đơn có workflow; nếu là đơn cũ (chỉ có steps) thì chuyển đổi tạm.
    function ensureWorkflow(order) {
      // Đơn cũ có thể có workflow = {} (default cột mới) hoặc null — vẫn phải suy ra từ steps
      if (!order.workflow || Object.keys(order.workflow).length === 0) {
        const w = defaultWorkflow();
        // Đơn cũ chỉ có steps (chưa có cột workflow) -> suy ra workflow từ steps đã done
        const s = order.steps || [];
        const has = k => !!s.find(x => x.key === k && x.done);
        if (has('cat')) w.cat = 'cat';
        else if (has('khong_cat')) w.cat = 'khong_cat';
        w.catQuyCach = w.cat === 'cat';
        w.soLieuCat = '';
        w.lip = has('lip_45');
        w.ghep45 = has('ghep_cuoi_45');
        w.ghepBo = has('ghep_bo');
        w.boKieu = has('bo_kieu');
        w.danhBong = has('danh_bong');
        w.hoanThanh = order.branch === '45' ? has('ghep_cuoi_45') : has('danh_bong');
        order.workflow = w;
      }
      return order;
    }

    // Danh sách bước hiện hữu của đơn (dùng để tính tiến độ % và đếm bước)
    function workflowStepList(order) {
      const w = ensureWorkflow(order).workflow;
      const steps = [];
      steps.push({ name: 'Nhận đơn, kiểm tra đá nhập', done: !!w.nhanDon });
      if (w.cat === 'cat') {
        steps.push({ name: 'Cắt quy cách', done: !!w.catQuyCach });
      } else if (w.cat === 'khong_cat') {
        steps.push({ name: 'Không cắt (đá cắt sẵn)', done: true });
      }
      if (order.branch === '45') {
        steps.push({ name: 'Líp 45°', done: !!w.lip });
        steps.push({ name: 'Ghép 45°', done: !!w.ghep45 });
      } else {
        steps.push({ name: 'Ghép bo', done: !!w.ghepBo });
        steps.push({ name: 'Bo kiểu', done: !!w.boKieu });
        steps.push({ name: 'Đánh bóng', done: !!w.danhBong });
      }
      steps.push({ name: 'Hoàn thành, chờ giao', done: !!w.hoanThanh });
      return steps;
    }

    // Nhãn trạng thái đơn — "tiến độ thật": suy ra đơn đang dừng ở công đoạn nào
    // Trả về [nhãn, màu chữ, màu pill nền] để dùng ở bảng & modal.
    function orderStatusLabel(order) {
      const w = ensureWorkflow(order).workflow;
      const pill = (bg, text) => `${bg} ${text}`;
      if (w.tamHoan) return ['⏸️ Tạm hoãn', 'text-rose-600', pill('bg-rose-100 dark:bg-rose-950', 'text-rose-600')];
      if (w.hoanThanh && w.daGiao) return ['🚚 Đã giao', 'text-emerald-600', pill('bg-emerald-100 dark:bg-emerald-950', 'text-emerald-600')];
      if (w.hoanThanh) return ['📦 Chờ giao', 'text-amber-600', pill('bg-amber-100 dark:bg-amber-950', 'text-amber-600')];
      // Đang thực hiện → suy ra công đoạn hiện tại từ workflow
      if (w.cat === '') return ['⏳ Chờ chọn cắt', 'text-slate-500', pill('bg-slate-100 dark:bg-slate-800', 'text-slate-500')];
      if (w.cat === 'cat' && !w.catQuyCach) return ['🔪 Đang cắt quy cách', 'text-sky-600', pill('bg-sky-100 dark:bg-sky-950', 'text-sky-600')];
      if (order.branch === '45') {
        if (!w.lip) return ['🪚 Đang líp 45°', 'text-purple-600', pill('bg-purple-100 dark:bg-purple-950', 'text-purple-600')];
        if (!w.ghep45) return ['🔗 Đang ghép 45°', 'text-purple-600', pill('bg-purple-100 dark:bg-purple-950', 'text-purple-600')];
      } else {
        if (!w.ghepBo) return ['🪚 Đang ghép bo', 'text-purple-600', pill('bg-purple-100 dark:bg-purple-950', 'text-purple-600')];
        if (!w.boKieu) return ['🎨 Đang bo kiểu', 'text-purple-600', pill('bg-purple-100 dark:bg-purple-950', 'text-purple-600')];
        if (!w.danhBong) return ['✨ Đang đánh bóng', 'text-purple-600', pill('bg-purple-100 dark:bg-purple-950', 'text-purple-600')];
      }
      return ['⚙️ Đang thực hiện', 'text-sky-600', pill('bg-sky-100 dark:bg-sky-950', 'text-sky-600')];
    }

    function kieuGiaCongLabel(order) {
      return order.branch === '45' ? 'Ghép 45°' : 'Ghép bo';
    }

    // Render Dashboard
    function renderDashboard() {
      document.getElementById('kpi-active-orders').innerText = orders.length;
      document.getElementById('kpi-cust-stone').innerText = inventory.filter(i => i.ownerType === 'customer').length + ' tấm';
      document.getElementById('kpi-shop-stone').innerText = inventory.filter(i => i.ownerType === 'shop').length + ' tấm';

      const tbody = document.getElementById('dashboard-orders-list');
      tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td data-label="Đơn hàng" class="py-3 font-semibold text-amber-600 cursor-pointer" onclick="openOrderModal('${o.id}')">
            ${o.id} <span class="block text-sm font-normal text-slate-600 dark:text-slate-400">${o.customer}</span>
          </td>
          <td data-label="Trạng thái" class="py-3">
            <span class="font-semibold ${orderStatusLabel(o)[1]}">${orderStatusLabel(o)[0]}</span>
          </td>
          <td data-label="Tổng tiền" class="py-3 text-right font-bold tabular-nums">${formatMoney(o.total)}</td>
        </tr>
      `).join('');
    }

    // Render Inventory
    let currentInvTab = 'customer';
    function setInventoryTab(tab) {
      currentInvTab = tab;
      ['cust', 'shop', 'fin'].forEach(t => {
        const btn = document.getElementById(`inv-tab-${t}`);
        btn.className = 'px-5 py-3 rounded-xl text-base font-bold transition ' + (
          (tab === 'customer' && t === 'cust') || (tab === 'shop' && t === 'shop') || (tab === 'finished' && t === 'fin')
          ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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
              <button onclick="openEditItemModal('${item.id}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold transition">
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
          saveInventoryToSupabase(item);
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
          <td data-label="Đơn hàng" class="p-4 font-bold text-amber-600 cursor-pointer" onclick="openOrderModal('${o.id}')">
            ${o.id} <span class="block text-sm font-normal text-slate-600 dark:text-slate-400">${o.customer}</span>
          </td>
          <td data-label="Loại đá" class="p-4">
            <div class="font-semibold">${o.stone}</div>
          </td>
          <td data-label="Kiểu gia công" class="p-4">
            <span class="font-bold ${o.branch === '45' ? 'text-emerald-600' : 'text-purple-600'}">
              ${kieuGiaCongLabel(o)}
            </span>
          </td>
          <td data-label="Trạng thái" class="p-4">
            <span class="font-semibold ${orderStatusLabel(o)[1]}">${orderStatusLabel(o)[0]}</span>
          </td>
          <td data-label="Thao tác" class="p-4 text-right">
            <button onclick="openOrderModal('${o.id}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-sm font-semibold transition">
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

      ensureWorkflow(order);
      const w = order.workflow;

      document.getElementById('modal-order-title').innerText = `Đơn Hàng #${order.id} - ${order.customer} (Kiểu ${kieuGiaCongLabel(order)})`;

      const body = document.getElementById('modal-order-body');
      body.innerHTML = `
        <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-sm">
          <div><span class="text-slate-500 dark:text-slate-400 block">Khách hàng:</span> <strong class="text-base">${order.customer} (${order.phone})</strong></div>
          <div><span class="text-slate-500 dark:text-slate-400 block">Loại đá:</span> <strong class="text-base">${order.stone}</strong></div>
          <div><span class="text-slate-500 dark:text-slate-400 block">Tổng tiền:</span> <strong class="text-emerald-600 text-base">${formatMoney(order.total)}</strong></div>
          <div><span class="text-slate-500 dark:text-slate-400 block">Thanh toán:</span> <strong class="text-base">${order.payFlag === 'thu_truoc' ? 'Thu cọc trước' : 'Thu sau giao'}</strong></div>
        </div>

        <!-- 1. ĐÁ NHẬP cho đơn này (muốn làm thì phải có đá nhập) -->
        <div class="bg-teal-50 dark:bg-teal-950/30 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/50 space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold text-teal-800 dark:text-teal-300"><i class="fa-solid fa-cubes-stack mr-1"></i> Đá Nhập cho đơn ${order.id} (${orderInventory(order.id).length} tấm)</h5>
            <button onclick="openReceiveStoneModal('${order.id}')" class="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700">+ Nhận đá</button>
          </div>
          <div id="order-inventory" class="space-y-1.5">
            ${orderInventory(order.id).length === 0 ? '<div class="text-sm text-slate-500 dark:text-slate-400 text-center py-1">Chưa có đá nhập. Muốn gia công phải nhập đá trước.</div>' : renderOrderInvItems(order.id)}
          </div>
        </div>

        <!-- 2. QUY TRÌNH KHÉP KÍN -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-base">Quy Trình Gia Công (Kiểu ${kieuGiaCongLabel(order)})</h4>
            <span class="text-xs font-semibold px-2 py-1 rounded-full ${orderStatusLabel(order)[2]}">${orderStatusLabel(order)[0]}</span>
          </div>
          <div class="space-y-1">
            ${workflowStepList(order).map((s, i) => `
              <div class="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm ${s.done ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'}">
                <span class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}">${i + 1}</span>
                <span class="flex-1 font-semibold">${s.name}</span>
                <span class="text-xs">${s.done ? '✓' : '·'}</span>
              </div>
            `).join('')}
          </div>

          <!-- Lựa chọn Cắt / Không cắt -->
          <div class="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="text-sm font-bold text-slate-700 dark:text-slate-200">2. Cắt / Không cắt</div>
            <div class="flex space-x-2">
              <button onclick="setWorkflowCat('${order.id}','cat')" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition ${w.cat === 'cat' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">✂ Cắt</button>
              <button onclick="setWorkflowCat('${order.id}','khong_cat')" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition ${w.cat === 'khong_cat' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">Không cắt (đá cắt sẵn)</button>
            </div>

            <!-- Cắt quy cách + Số liệu cắt (chỉ khi chọn Cắt) -->
            ${w.cat === 'cat' ? `
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-catqc" ${w.catQuyCach ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','catQuyCach',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>Cắt quy cách</span>
                </label>
                <span class="text-xs ${w.catQuyCach ? 'text-emerald-600' : 'text-slate-400'}">${w.catQuyCach ? '✓ Đã cắt' : 'Chưa'}</span>
              </div>
              <div class="px-3 space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold text-slate-500">Số liệu cắt (Dài x Rộng)</label>
                  <button onclick="toggleCutAdd('${order.id}')" class="text-xs font-semibold text-amber-600">＋ Thêm miếng cắt</button>
                </div>
                ${renderCutPieces(order.id)}
                ${cutAddingOrder === order.id ? `
                  <div class="flex space-x-2">
                    <input id="new-cut-input" placeholder="VD: 100x60" class="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-sm">
                    <button onclick="addCutPiece('${order.id}')" class="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-sm font-semibold">Thêm</button>
                  </div>` : ''}
              </div>
            ` : ''}

            <!-- Các bước gia công theo kiểu -->
            ${(order.branch === '45') ? `
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-lip" ${w.lip ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','lip',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>3a. Líp (mặt + chỉ)</span>
                </label>
                <span class="text-xs ${w.lip ? 'text-emerald-600' : 'text-slate-400'}">${w.lip ? '✓ Xong' : 'Chưa'}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-ghep45" ${w.ghep45 ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','ghep45',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>3b. Ghép</span>
                </label>
                <span class="text-xs ${w.ghep45 ? 'text-emerald-600' : 'text-slate-400'}">${w.ghep45 ? '✓ Xong' : 'Chưa'}</span>
              </div>
            ` : `
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-ghepbo" ${w.ghepBo ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','ghepBo',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>3a. Ghép (bo)</span>
                </label>
                <span class="text-xs ${w.ghepBo ? 'text-emerald-600' : 'text-slate-400'}">${w.ghepBo ? '✓ Xong' : 'Chưa'}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-bokieu" ${w.boKieu ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','boKieu',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>3b. Bo kiểu</span>
                </label>
                <span class="text-xs ${w.boKieu ? 'text-emerald-600' : 'text-slate-400'}">${w.boKieu ? '✓ Xong' : 'Chưa'}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <label class="text-sm font-semibold cursor-pointer flex items-center space-x-2">
                  <input type="checkbox" id="wf-danhbong" ${w.danhBong ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','danhBong',this.checked)" class="w-4 h-4 rounded text-amber-600">
                  <span>3c. Đánh bóng</span>
                </label>
                <span class="text-xs ${w.danhBong ? 'text-emerald-600' : 'text-slate-400'}">${w.danhBong ? '✓ Xong' : 'Chưa'}</span>
              </div>
            `}

            <!-- 4. Hoàn thành đơn, chờ giao -->
            <div class="pt-1">
              <label class="text-sm font-bold cursor-pointer flex items-center space-x-2 px-3 py-2 rounded-xl border ${w.hoanThanh ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}">
                <input type="checkbox" id="wf-hoanthanh" ${w.hoanThanh ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','hoanThanh',this.checked)" class="w-4 h-4 rounded text-emerald-600">
                <span>4. Hoàn thành đơn, chờ giao</span>
                <span class="ml-auto text-xs ${w.hoanThanh ? 'text-emerald-600' : 'text-slate-400'}">${w.hoanThanh ? '✓ Xong' : 'Chưa'}</span>
              </label>
              ${w.hoanThanh ? `
                <div class="flex space-x-2 mt-2 px-3">
                  <button onclick="setWorkflowDaGiao('${order.id}', false)" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition ${!w.daGiao ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}">Chưa giao</button>
                  <button onclick="setWorkflowDaGiao('${order.id}', true)" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition ${w.daGiao ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}">Đã giao</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 3. TẠM HOÃN (mô tả thủ công) -->
        <div class="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 space-y-2">
          <label class="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" id="wf-tamhoan" ${w.tamHoan ? 'checked' : ''} onchange="toggleWorkflowBool('${order.id}','tamHoan',this.checked)" class="w-4 h-4 rounded text-rose-600">
            <span><i class="fa-solid fa-pause mr-1"></i> Đang tạm hoãn</span>
          </label>
          ${w.tamHoan ? `
            <input type="text" id="wf-tamhoannote" value="${w.tamHoanNote}" onchange="setWorkflowText('${order.id}','tamHoanNote',this.value)" placeholder="VD: Đang tạm hoãn vì công trình có phát sinh..." class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-sm">
            <p class="text-xs text-rose-600 dark:text-rose-300">Đơn đang tạm hoãn: ${w.tamHoanNote || '(chưa nhập lý do)'}</p>
          ` : ''}
        </div>

        <div class="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 space-y-2">
          <h5 class="text-xs font-bold text-amber-800 dark:text-amber-300"><i class="fa-solid fa-plus-circle mr-1"></i> Công đoạn phụ động phát sinh (Khoét lavabo, khoan lỗ...)</h5>
          <div id="extra-tasks-list" class="space-y-1">
            ${order.extraTasks.map(et => `<div class="text-sm bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border flex justify-between items-center"><span>✓ ${et.name}</span><span class="text-emerald-600 text-xs">Đã thêm</span></div>`).join('')}
          </div>
          <div class="flex space-x-2 pt-2">
            <input type="text" id="new-extra-task-input" placeholder="Nhập tên công đoạn phát sinh..." class="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-sm">
            <button onclick="addExtraTask('${order.id}')" class="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-sm font-semibold">Thêm</button>
          </div>
        </div>
        <div class="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold text-emerald-800 dark:text-emerald-300"><i class="fa-solid fa-layer-group mr-1"></i> Danh sách tấm đá (${order.slabs ? order.slabs.length : 0} tấm)</h5>
            <button onclick="openSlabTable('${order.id}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold">+ Thêm tấm</button>
          </div>
          <div id="slabs-list" class="space-y-1.5">
            ${(order.slabs || []).map((s, i) => `
              <div class="text-sm bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border flex justify-between items-center gap-2">
                <div class="flex-1">
                  <strong>#${i+1}</strong> ${s.dai} x ${s.rong} cm · <span class="text-emerald-600 font-semibold">${s.kieu}</span>
                  ${s.defect ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-xs">LỖI</span>' : ''}
                  ${s.note ? `<div class="text-slate-500 dark:text-slate-400 text-xs">${s.note}</div>` : ''}
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-right text-emerald-600 font-bold tabular-nums">${formatMoney(s.donGia)}</div>
                  <button onclick="openEditSlabModal('${order.id}', ${i})" class="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600"><i class="fa-solid fa-pen mr-1"></i>Sửa</button>
                  <button onclick="toggleSlabDefect('${order.id}', ${i})" class="px-2 py-1 rounded-lg text-xs font-bold ${s.defect ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">${s.defect ? 'Hủy lỗi' : 'Đánh dấu lỗi'}</button>
                </div>
              </div>
            `).join('')}
            ${(!order.slabs || order.slabs.length === 0) ? '<div class="text-sm text-slate-500 dark:text-slate-400 text-center py-1">Chưa có tấm nào. Bấm "+ Thêm tấm" để nhập.</div>' : ''}
          </div>
        </div>
        <div class="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold text-blue-800 dark:text-blue-300"><i class="fa-solid fa-images mr-1"></i> Ảnh Đơn Hàng & Tấm Đá (${order.photos ? order.photos.length : 0})</h5>
            <label class="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-700">
              + Thêm ảnh
              <input type="file" accept="image/*" capture="environment" class="hidden" onchange="addOrderPhoto('${order.id}', this)">
            </label>
          </div>
          <div id="order-photos" class="grid grid-cols-3 gap-2">
            ${(order.photos || []).map(p => `<img src="${p}" class="w-full h-24 object-cover rounded-lg border border-blue-200 dark:border-blue-800">`).join('')}
            ${(!order.photos || order.photos.length === 0) ? '<div class="col-span-3 text-sm text-slate-500 dark:text-slate-400 text-center py-1">Chưa có ảnh. Thêm ảnh chụp tấm đá, biên bản giao nhận...</div>' : ''}
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

    // Lọc đá nhập thuộc đơn (nối theo mã đơn trong ownerName, format "(Đơn DH-xxx)")
    function orderInventory(orderId) {
      return inventory.filter(i => i.ownerName && i.ownerName.includes('(Đơn ' + orderId + ')'));
    }

    // ===== Danh sách Đá Nhập trong modal đơn: thu gọn + sửa kích thước inline =====
    let invExpandedOrder = null;   // orderId đang sổ hết danh sách đá nhập
    const MAX_INV_ITEMS = 3;       // số tấm hiện trước khi thu gọn

    function renderOrderInvItems(orderId) {
      const items = orderInventory(orderId);
      const showAll = invExpandedOrder === orderId;
      const visible = showAll ? items : items.slice(0, MAX_INV_ITEMS);
      const hidden = items.length - visible.length;
      return `
        ${visible.map(iv => `
          <div class="text-sm bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                ${iv.photo ? `<img src="${iv.photo}" class="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-700">` : '<div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs"><i class="fa-solid fa-image"></i></div>'}
                <div class="min-w-0">
                  <strong>${iv.name}</strong> <span class="text-xs text-slate-400">(${iv.id})</span>
                  <div class="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                    <span>${iv.size}</span>
                    <span class="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <button onclick="incInvQty('${iv.id}', -1)" class="w-5 h-5 rounded-full bg-white dark:bg-slate-700 text-slate-600 hover:bg-rose-100 hover:text-rose-600 font-bold leading-none flex items-center justify-center" title="Giảm 1 tấm">−</button>
                      <b class="text-slate-700 dark:text-slate-200 tabular-nums">${iv.qty} tấm</b>
                      <button onclick="incInvQty('${iv.id}', 1)" class="w-5 h-5 rounded-full bg-white dark:bg-slate-700 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 font-bold leading-none flex items-center justify-center" title="Thêm 1 tấm">+</button>
                    </span>
                    ${iv.note ? `<span>· ${iv.note}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
            <button onclick="openEditItemModal('${iv.id}', true)" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold whitespace-nowrap"><i class="fa-solid fa-pen mr-1"></i>Chỉnh sửa</button>
          </div>
        `).join('')}
        ${hidden > 0 ? `<button onclick="toggleInvExpanded('${orderId}')" class="w-full text-center text-xs font-semibold text-teal-600 hover:text-teal-700 py-1">${showAll ? '▲ Thu gọn' : `▶ Xem thêm ${hidden} tấm ▾`}</button>` : ''}
      `;
    }

    function toggleInvExpanded(orderId) {
      invExpandedOrder = invExpandedOrder === orderId ? null : orderId;
      if (activeOrderId) openOrderModal(activeOrderId);
    }

    // ===== SỬA TẤM ĐÁ (modal đầy đủ: ảnh + mẫu mã + số tấm + kích thước + ghi chú) =====
    let editItemId = null;

    function openEditItemModal(id, fromOrder) {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      editItemId = id;
      document.getElementById('edit-item-title').innerText = `${item.name} (${item.id})`;
      document.getElementById('edit-item-photo').value = '';
      document.getElementById('edit-item-preview').classList.add('hidden');
      document.getElementById('edit-item-ma').value = item.ma || '';
      document.getElementById('edit-item-qty').value = item.qty || 1;
      const m = (item.size || '').match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
      document.getElementById('edit-item-dai').value = m ? m[1] : '';
      document.getElementById('edit-item-rong').value = m ? m[2] : '';
      document.getElementById('edit-item-note').value = item.note || '';
      document.getElementById('edit-item-modal').classList.remove('hidden');
      document.getElementById('edit-item-modal').classList.add('flex');
    }
    function closeEditItemModal() {
      document.getElementById('edit-item-modal').classList.remove('flex');
      document.getElementById('edit-item-modal').classList.add('hidden');
      editItemId = null;
    }
    document.getElementById('edit-item-photo').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('edit-item-preview-img').src = ev.target.result;
        document.getElementById('edit-item-preview').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
    function saveEditItem() {
      if (!editItemId) return;
      const item = inventory.find(i => i.id === editItemId);
      if (!item) return;
      const dai = document.getElementById('edit-item-dai').value.trim();
      const rong = document.getElementById('edit-item-rong').value.trim();
      item.size = (dai && rong) ? `${dai} x ${rong} cm` : (dai ? `${dai} cm` : (rong ? `${rong} cm` : 'Chưa đo'));
      item.qty = Math.max(1, parseInt(document.getElementById('edit-item-qty').value) || 1);
      const ma = document.getElementById('edit-item-ma').value.trim();
      if (ma) item.ma = ma;
      item.note = document.getElementById('edit-item-note').value.trim();
      const file = document.getElementById('edit-item-photo').files[0];
      const doSave = (photoBase64) => {
        if (photoBase64) item.photo = photoBase64;
        saveInventoryToSupabase(item);
        closeEditItemModal();
        if (activeOrderId) openOrderModal(activeOrderId);
        else renderInventory();
        alert('Đã lưu thay đổi cho ' + item.name + '!');
      };
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) { doSave(ev.target.result); };
        reader.readAsDataURL(file);
      } else {
        doSave(null);
      }
    }

    // ===== SỬA TẤM ĐÁ GIA CÔNG (order.slabs) — modal đầy đủ =====
    let editSlab = null;   // {orderId, idx}
    function openEditSlabModal(orderId, idx) {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.slabs || !order.slabs[idx]) return;
      editSlab = { orderId, idx };
      const s = order.slabs[idx];
      document.getElementById('edit-slab-title').innerText = `Tấm #${idx + 1} - ${order.id}`;
      document.getElementById('edit-slab-dai').value = s.dai || '';
      document.getElementById('edit-slab-rong').value = s.rong || '';
      document.getElementById('edit-slab-kieu').value = s.kieu || '';
      document.getElementById('edit-slab-dongia').value = s.donGia || '';
      document.getElementById('edit-slab-note').value = s.note || '';
      document.getElementById('edit-slab-modal').classList.remove('hidden');
      document.getElementById('edit-slab-modal').classList.add('flex');
    }
    function closeEditSlabModal() {
      document.getElementById('edit-slab-modal').classList.remove('flex');
      document.getElementById('edit-slab-modal').classList.add('hidden');
      editSlab = null;
    }
    function saveEditSlab() {
      if (!editSlab) return;
      const order = orders.find(o => o.id === editSlab.orderId);
      const idx = editSlab.idx;
      if (!order || !order.slabs || !order.slabs[idx]) return;
      const s = order.slabs[idx];
      s.dai = parseFloat(document.getElementById('edit-slab-dai').value) || 0;
      s.rong = parseFloat(document.getElementById('edit-slab-rong').value) || 0;
      s.kieu = document.getElementById('edit-slab-kieu').value.trim();
      s.donGia = parseFloat(document.getElementById('edit-slab-dongia').value) || 0;
      s.note = document.getElementById('edit-slab-note').value.trim();
      saveOrderToSupabase(order);
      closeEditSlabModal();
      openOrderModal(order.id);
      alert('Đã lưu thay đổi tấm đá!');
    }
    function deleteSlab() {
      if (!editSlab) return;
      const order = orders.find(o => o.id === editSlab.orderId);
      const idx = editSlab.idx;
      if (!order || !order.slabs) return;
      if (!confirm('Xóa tấm #' + (idx + 1) + ' khỏi danh sách?')) return;
      order.slabs.splice(idx, 1);
      saveOrderToSupabase(order);
      closeEditSlabModal();
      openOrderModal(order.id);
    }

    // ===== SỬA MIẾNG CẮT QUY CÁCH (soLieuCat) =====
    let editCut = null;   // {orderId, idx}
    function openEditCutModal(orderId, idx) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const cuts = (order.workflow.soLieuCat || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!cuts[idx]) return;
      editCut = { orderId, idx };
      document.getElementById('edit-cut-title').innerText = `Miếng cắt #${idx + 1} - ${order.id}`;
      document.getElementById('edit-cut-value').value = cuts[idx];
      document.getElementById('edit-cut-modal').classList.remove('hidden');
      document.getElementById('edit-cut-modal').classList.add('flex');
    }
    function closeEditCutModal() {
      document.getElementById('edit-cut-modal').classList.remove('flex');
      document.getElementById('edit-cut-modal').classList.add('hidden');
      editCut = null;
    }
    function saveEditCut() {
      if (!editCut) return;
      const order = orders.find(o => o.id === editCut.orderId);
      const idx = editCut.idx;
      if (!order) return;
      const val = document.getElementById('edit-cut-value').value.trim();
      if (!val) return;
      const cuts = (order.workflow.soLieuCat || '').split(',').map(s => s.trim()).filter(Boolean);
      cuts[idx] = val;
      order.workflow.soLieuCat = cuts.join(', ');
      saveWorkflowOrder(order);
      closeEditCutModal();
      openOrderModal(order.id);
    }

    // ===== Danh sách miếng cắt quy cách: chips + thu gọn + thêm/xóa =====
    let cutExpandedOrder = null;   // orderId đang sổ hết miếng cắt
    let cutAddingOrder = null;     // orderId đang hiện ô thêm miếng cắt
    const MAX_CUT_PIECES = 3;      // số miếng hiện trước khi thu gọn

    function renderCutPieces(orderId) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return '';
      const cuts = (order.workflow.soLieuCat || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!cuts.length) return '<div class="text-xs text-slate-400">Chưa nhập số liệu cắt.</div>';
      const showAll = cutExpandedOrder === orderId;
      const visible = showAll ? cuts : cuts.slice(0, MAX_CUT_PIECES);
      const hidden = cuts.length - visible.length;
      return `
        <div class="flex flex-wrap gap-1.5">
          ${visible.map((c, i) => `
            <span class="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
              ${c}
              <button onclick="openEditCutModal('${orderId}', ${i})" class="text-slate-500 hover:text-amber-600" title="Sửa miếng này">✏️</button>
              <button onclick="removeCutPiece('${orderId}', ${i})" class="text-slate-400 hover:text-rose-500" title="Xóa miếng này">✕</button>
            </span>`).join('')}
        </div>
        ${hidden > 0 ? `<button onclick="toggleCutExpanded('${orderId}')" class="text-xs font-semibold text-amber-600 hover:text-amber-700">${showAll ? '▲ Thu gọn' : `▶ Xem thêm ${hidden} miếng ▾`}</button>` : ''}
      `;
    }

    function toggleCutExpanded(orderId) {
      cutExpandedOrder = cutExpandedOrder === orderId ? null : orderId;
      openOrderModal(orderId);
    }
    function toggleCutAdd(orderId) {
      cutAddingOrder = cutAddingOrder === orderId ? null : orderId;
      openOrderModal(orderId);
    }
    function addCutPiece(orderId) {
      const val = document.getElementById('new-cut-input').value.trim();
      if (!val) return;
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      const cuts = (order.workflow.soLieuCat || '').split(',').map(s => s.trim()).filter(Boolean);
      cuts.push(val);
      order.workflow.soLieuCat = cuts.join(', ');
      cutAddingOrder = null;
      cutExpandedOrder = orderId;
      saveWorkflowOrder(order);
      openOrderModal(orderId);
    }
    function removeCutPiece(orderId, idx) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      const cuts = (order.workflow.soLieuCat || '').split(',').map(s => s.trim()).filter(Boolean);
      cuts.splice(idx, 1);
      order.workflow.soLieuCat = cuts.join(', ');
      saveWorkflowOrder(order);
      openOrderModal(orderId);
    }

    // Bật/tắt 1 cờ quy trình (checkbox trong modal)
    function toggleWorkflowBool(orderId, key, val) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      order.workflow[key] = !!val;
      saveWorkflowOrder(order);
      openOrderModal(orderId);
    }

    // Chọn Cắt / Không cắt
    function setWorkflowCat(orderId, cat) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      order.workflow.cat = cat;
      if (cat === 'khong_cat') order.workflow.catQuyCach = false;
      saveWorkflowOrder(order);
      openOrderModal(orderId);
    }

    // Nhập text (số liệu cắt / lý do tạm hoãn)
    function setWorkflowText(orderId, key, val) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      order.workflow[key] = val;
      saveWorkflowOrder(order);
    }

    // Đánh dấu Đã giao / Chưa giao
    function setWorkflowDaGiao(orderId, val) {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      ensureWorkflow(order);
      order.workflow.daGiao = !!val;
      saveWorkflowOrder(order);
      openOrderModal(orderId);
    }

    // Lưu workflow + render lại các bảng phụ thuộc trạng thái
    function saveWorkflowOrder(order) {
      order.status = order.workflow.tamHoan ? 'tam_hoan'
        : (order.workflow.hoanThanh ? (order.workflow.daGiao ? 'da_giao' : 'cho_giao') : 'dang_gia_cong');
      saveOrderToSupabase(order);
      renderDashboard();
      renderOrdersTable();
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
      const order = orders.find(o => o.id === activeOrderId);
      if (order) {
        ensureWorkflow(order);
        saveOrderToSupabase(order);
      }
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
      // Quy trình khép kín: bắt đầu từ "Nhận đơn, kiểm tra đá nhập"
      const w = defaultWorkflow();

      orders.unshift({
        id: newId,
        customer: name,
        phone: phone || '0900...',
        stone: stone,
        branch: branch,
        status: 'dang_gia_cong',
        total: total,
        payFlag: payFlag,
        notes: notes,
        extraTasks: [],
        steps: [],
        workflow: w
      });

      closeNewOrderModal();
      renderDashboard();
      renderOrdersTable();
      const newOrder = orders.find(o => o.id === newId);
      if (newOrder) saveOrderToSupabase(newOrder);
      logActivity('order', `Nhận đơn ${newId} · Kiểu ${branch === '45' ? 'Ghép 45°' : 'Ghép bo'} · ${name}`);
      alert(`Đã nhận đơn hàng mới ${newId} (Kiểu ${branch === '45' ? 'Ghép 45°' : 'Ghép bo'}) thành công!`);
    }

    // Receive Stone (Khách đem đá tới - chụp & lưu)
    function openReceiveStoneModal(prefillOrderId) {
      if (prefillOrderId) {
        document.getElementById('rec-order-id').value = prefillOrderId;
      }
      document.getElementById('receive-stone-modal').classList.remove('hidden');
      document.getElementById('receive-stone-modal').classList.add('flex');
    }
    function closeReceiveStoneModal() {
      document.getElementById('receive-stone-modal').classList.remove('flex');
      document.getElementById('receive-stone-modal').classList.add('hidden');
      // reset
      ['rec-cust-name','rec-order-id','rec-ma','rec-size-dai','rec-size-rong','rec-qty','rec-notes'].forEach(id => document.getElementById(id).value = '');
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
      // Kích thước: 2 ô Dài × Rộng (cm), bỏ trống 1 bên → coi như chưa đo
      const dai = document.getElementById('rec-size-dai').value.trim();
      const rong = document.getElementById('rec-size-rong').value.trim();
      const size = (dai && rong) ? `${dai} x ${rong} cm` : '';
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
        saveInventoryToSupabase(inventory[0]);
        logActivity('receive', `Nhận đá "${ma}" · ${qty} tấm · từ ${cust} (Đơn ${orderId || '—'})`);
        alert(`Đã nhận đá "${ma}" từ ${cust} (${qty} tấm) và lưu vào kho khách gửi!`);
        // Nếu nhận từ chi tiết đơn, làm mới lại modal đơn để hiện Đá Nhập
        if (orderId) openOrderModal(orderId);
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
      saveOrderToSupabase(order);
      alert(`Đã lưu ${slabs.length} tấm vào đơn ${order.id}!`);
    }

    function addOrderPhoto(orderId, input) {
      const file = input.files[0];
      if (!file) return;
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      if (!order.photos) order.photos = [];
      const reader = new FileReader();
      reader.onload = function(ev) {
        order.photos.push(ev.target.result);
        openOrderModal(orderId); // render lại để hiện ảnh
        saveOrderToSupabase(order);
      };
      reader.readAsDataURL(file);
      input.value = '';
    }

    // ===== Quality (nonconformance) + Logistics (activity log) từ ECC skills =====
    function toggleSlabDefect(orderId, idx) {
      const order = (typeof orders !== 'undefined' ? orders : []).find(o => o.id === orderId);
      if (!order || !order.slabs || !order.slabs[idx]) return;
      order.slabs[idx].defect = !order.slabs[idx].defect;
      saveOrderToSupabase(order);
      openOrderModal(orderId);
    }

    function logActivity(type, text) {
      if (typeof activities === 'undefined') return;
      activities.unshift({ t: new Date().toISOString(), type, text });
      if (activities.length > 100) activities.pop();
    }

    // ===== OPS INTELLIGENCE (từ ECC skills: inventory-demand-planning + production-scheduling) =====
    function renderOpsIntelligence() {
      const all = (typeof orders !== 'undefined' ? orders : []);
      const inv = (typeof inventory !== 'undefined' ? inventory : []);
      // Đơn đang làm = có workflow và chưa hoàn thành (bỏ qua tạm hoãn vẫn tính là đang làm)
      const active = all.filter(o => {
        ensureWorkflow(o);
        return !o.workflow.hoanThanh;
      });
      const done = all.filter(o => {
        ensureWorkflow(o);
        return !!o.workflow.hoanThanh;
      });

      // KPI
      const ontime = all.length ? Math.round(done.length / all.length * 100) : 0;
      document.getElementById('ops-ontime').textContent = ontime + '%';
      document.getElementById('ops-late').textContent = active.length;
      const val = active.reduce((s, o) => s + (o.total || 0), 0);
      document.getElementById('ops-value').textContent = (val / 1e6).toFixed(1) + 'M';
      const warn = inv.filter(i => !i.photo).length + (all.reduce((s, o) => s + (o.slabs || []).filter(sl => sl.defect).length, 0));
      document.getElementById('ops-warn').textContent = warn;

      // Tải trọng theo kiểu gia công (Kiểu nào nhiều đơn đang làm = ràng buộc, ưu tiên đẩy)
      const aN = active.filter(o => o.branch === '45').length;
      const bN = active.filter(o => o.branch === 'bo').length;
      const maxB = Math.max(aN, bN, 1);
      document.getElementById('ops-branch-a-n').textContent = aN + ' đơn';
      document.getElementById('ops-branch-b-n').textContent = bN + ' đơn';
      document.getElementById('ops-branch-a-bar').style.width = (aN / maxB * 100) + '%';
      document.getElementById('ops-branch-b-bar').style.width = (bN / maxB * 100) + '%';

      // ABC classification by mẫu đá (theo số lượng tấm)
      const byMa = {};
      inv.forEach(i => {
        const k = i.ma || i.name || 'Khác';
        byMa[k] = (byMa[k] || 0) + (i.qty || 1);
      });
      const entries = Object.entries(byMa).sort((a, b) => b[1] - a[1]);
      const totalQ = entries.reduce((s, e) => s + e[1], 0) || 1;
      let cum = 0;
      const abcHtml = entries.slice(0, 6).map(([ma, q]) => {
        cum += q;
        const pct = Math.round(cum / totalQ * 100);
        const cls = pct <= 80 ? 'text-rose-600 font-bold' : (pct <= 95 ? 'text-amber-600' : 'text-slate-400');
        const tag = pct <= 80 ? 'A' : (pct <= 95 ? 'B' : 'C');
        return `<div class="flex justify-between items-center"><span>${ma}</span><span class="${cls}">${q} tấm · ${tag}</span></div>`;
      }).join('');
      document.getElementById('ops-abc').innerHTML = abcHtml || '<div class="text-slate-400">Chưa có dữ liệu kho</div>';

      // Priority table (EDD: sắp xếp theo id tăng dần giả lập due date + buffer color)
      const ranked = active.slice().sort((a, b) => (parseInt(a.id.replace(/\D/g, '')) || 0) - (parseInt(b.id.replace(/\D/g, '')) || 0));
      const body = document.getElementById('ops-priority-body');
      if (!ranked.length) {
        body.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Không có đơn đang gia công</td></tr>';
        return;
      }
      body.innerHTML = ranked.map(o => {
        const stepList = workflowStepList(o);
        const doneSteps = stepList.filter(s => s.done).length;
        const totalSteps = stepList.length || 1;
        const ratio = doneSteps / totalSteps;
        let buf = 'text-emerald-600'; let label = 'An toàn';
        if (ratio < 0.34) { buf = 'text-rose-600'; label = 'Gấp'; }
        else if (ratio < 0.67) { buf = 'text-amber-600'; label = 'Chú ý'; }
        const branch = kieuGiaCongLabel(o);
        return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td data-label="Đơn" class="p-4 font-semibold text-amber-600 cursor-pointer" onclick="openOrderModal('${o.id}')">${o.id} <span class="block text-sm font-normal text-slate-600 dark:text-slate-400">${o.customer}</span></td>
          <td data-label="Kiểu gia công" class="p-4 text-sm font-bold ${o.branch === '45' ? 'text-emerald-600' : 'text-purple-600'}">${branch}</td>
          <td data-label="Bước" class="p-4"><span class="font-semibold">${doneSteps}/${totalSteps} bước</span></td>
          <td data-label="Ưu tiên" class="p-4"><span class="font-semibold ${buf}">${label}</span></td>
          <td data-label="Thao tác" class="p-4 text-right"><button onclick="openOrderModal('${o.id}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-sm font-semibold transition">Xem</button></td>
        </tr>`;
      }).join('');

      // Nhật ký giao nhận
      const act = document.getElementById('ops-activity');
      if (!act) return;
      if (!activities.length) { act.innerHTML = '<div class="text-slate-400 text-center py-4">Chưa có hoạt động nào</div>'; return; }
      const ic = { order: '📋', receive: '📥', photo: '📷', warehouse: '🏭', ship: '🚚' };
      act.innerHTML = activities.slice(0, 30).map(a => {
        const d = new Date(a.t);
        const time = `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        return `<div class="flex items-start gap-2"><span>${ic[a.type] || '•'}</span><span class="flex-1">${a.text}</span><span class="text-slate-400 text-xs whitespace-nowrap">${time}</span></div>`;
      }).join('');
    }

    // Init
    (async function initApp() {
      initSupabase();
      await loadAllFromSupabase();
      renderDashboard();
      renderOrdersTable();
      if (typeof renderInventory === 'function') renderInventory();
      console.log('[StoneFlow] Khởi tạo xong. Supabase:', sbClient ? 'OK' : 'OFF (dùng bộ nhớ tạm)');
    })();
