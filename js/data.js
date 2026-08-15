    // Data Store chuẩn theo prompt thực tế
    let currentUser = 'Kudo'; // 'Chú Cẩn' hoặc 'Kudo'
    function toggleUserRole() {
      currentUser = currentUser === 'Kudo' ? 'Chú Cẩn' : 'Kudo';
      document.getElementById('current-user-role').innerText = `Đang dùng: ${currentUser} (${currentUser === 'Chú Cẩn' ? 'Chủ xưởng - Toàn quyền' : 'Hỗ trợ / Thợ'})`;
      alert(`Đã chuyển vai trò sang: ${currentUser}`);
    }

    let inventory = [
      { id: 'INV-01', name: 'Kim Sa Trung (Tấm 1)', ma: 'Kim Sa Trung', ownerType: 'customer', ownerName: 'Anh Nam Thầu (Đơn DH-101)', size: '280 x 160 cm', qty: 1, photo: '', note: 'Đá khách gửi tự mua' },
      { id: 'INV-02', name: 'Marble Trắng Ý (2 tấm)', ma: 'Marble Trắng Ý', ownerType: 'customer', ownerName: 'Chị Lan (Đơn DH-102)', size: '260 x 140 cm', qty: 2, photo: '', note: 'Đá khách gửi' },
      { id: 'INV-03', name: 'Đá Vàng Cổ Điển (Dư)', ma: 'Đá Vàng Cổ Điển', ownerType: 'shop', ownerName: 'Kho Xưởng (Đá dư đơn DH-104)', size: '120 x 60 cm', qty: 1, photo: '', note: 'Đá dư khách bỏ lại, tái sử dụng' },
      { id: 'INV-04', name: 'Đen Núi Lửa (Lỗi cắt bù)', ma: 'Đen Núi Lửa', ownerType: 'shop', ownerName: 'Kho Xưởng (Tấm bù lỗi DH-101)', size: '200 x 150 cm', qty: 1, photo: '', note: 'Đá lỗi xưởng phải bù' }
    ];

    let receiveSeq = 1; // đếm số lần nhận đá

    let orders = [
      {
        id: 'DH-101',
        customer: 'Anh Nam Thầu',
        phone: '0903 123 456',
        stone: 'Kim Sa Trung',
        branch: '45', // kiểu gia công: Ghép 45°
        status: 'dang_gia_cong',
        total: 12500000,
        payFlag: 'thu_truoc',
        notes: 'Mặt bếp chữ L, ghép 45 độ.',
        slabs: [
          { dai: 280, rong: 60, kieu: 'Ghép 45°', donGia: 2500000, note: 'Cạnh bếp dài' },
          { dai: 160, rong: 60, kieu: 'Ghép 45°', donGia: 1800000, note: 'Cạnh bếp ngắn' }
        ],
        photos: [],
        extraTasks: [{name: 'Khoét lỗ chậu rửa bát', done: true}],
        // Quy trình khép kín (thay cho "steps" cũ)
        workflow: {
          nhanDon: true,        // 1. Nhận đơn, kiểm tra đá nhập
          cat: 'cat',           // 2. Cắt / Không cắt
          catQuyCach: true,     //   - Cắt quy cách
          soLieuCat: '280x60, 160x60', //   - Số liệu cắt
          lip: true,            // 3a. Líp (mặt + chỉ)
          ghep45: false,        // 3b. Ghép (45°)
          ghepBo: false, boKieu: false, danhBong: false, // nhánh bo (không dùng)
          hoanThanh: false,     // 4. Hoàn thành đơn, chờ giao
          daGiao: false,        //   Chưa giao / Đã giao
          tamHoan: false, tamHoanNote: ''
        }
      },
      {
        id: 'DH-102',
        customer: 'Chị Lan Q.7',
        phone: '0988 765 432',
        stone: 'Marble Trắng Ý',
        branch: 'bo', // kiểu gia công: Ghép bo
        status: 'dang_gia_cong',
        total: 18000000,
        payFlag: 'thu_sau',
        notes: 'Ốp cầu thang tay vịn.',
        slabs: [],
        photos: [],
        extraTasks: [],
        workflow: {
          nhanDon: true,
          cat: 'khong_cat',     // đá khách cắt sẵn
          catQuyCach: false,
          soLieuCat: '',
          lip: false, ghep45: false,
          ghepBo: true,         // 3a. Ghép (bo)
          boKieu: true,         // 3b. Bo kiểu
          danhBong: false,      // 3c. Đánh bóng
          hoanThanh: false,
          daGiao: false,
          tamHoan: false, tamHoanNote: ''
        }
      },
      {
        id: 'DH-103',
        customer: 'Anh Bảy Xưởng Gỗ',
        phone: '0912 345 678',
        stone: 'Đá Vàng Cổ Điển',
        branch: '45',
        status: 'cho_giao',
        total: 8500000,
        payFlag: 'thu_sau',
        notes: 'Mặt tiền bàn quầy.',
        slabs: [],
        photos: [],
        extraTasks: [],
        workflow: {
          nhanDon: true,
          cat: 'cat',
          catQuyCach: true,
          soLieuCat: '240x60',
          lip: true,
          ghep45: true,
          ghepBo: false, boKieu: false, danhBong: false,
          hoanThanh: true,      // hoàn thành, chờ giao
          daGiao: false,        // Chưa giao
          tamHoan: false, tamHoanNote: ''
        }
      }
    ];

    // Nhật ký giao nhận / hoạt động xưởng (từ ECC skill: logistics-exception-management)
    let activities = [];
