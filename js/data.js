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
        branch: '45', // Nhánh A: Ghép 45 độ
        status: 'dang_ghep_45',
        total: 12500000,
        payFlag: 'thu_truoc',
        notes: 'Bặt bếp chữ L, ghép 45 độ.',
        slabs: [
          { dai: 280, rong: 60, kieu: 'Ghép 45°', donGia: 2500000, note: 'Cạnh bếp dài' },
          { dai: 160, rong: 60, kieu: 'Ghép 45°', donGia: 1800000, note: 'Cạnh bếp ngắn' }
        ],
        extraTasks: [{name: 'Khoét lỗ chậu rửa bát', done: true}],
        steps: [
          { key: 'nhan_don', name: '1. Nhận đơn & Đo đạc', done: true },
          { key: 'cat', name: '2. Cắt phôi', done: true },
          { key: 'ghep_45', name: '3. Ghép 45°', done: true },
          { key: 'lip_45', name: '4. Líp 45° (Tách Líp mặt + Líp chỉ)', done: true },
          { key: 'ghep_cuoi_45', name: '5. Ghép (Kết thúc nhánh 45°)', done: false }
        ]
      },
      {
        id: 'DH-102',
        customer: 'Chị Lan Q.7',
        phone: '0988 765 432',
        stone: 'Marble Trắng Ý',
        branch: 'bo', // Nhánh B: Ghép bo
        status: 'dang_danh_bong',
        total: 18000000,
        payFlag: 'thu_sau',
        notes: 'Ốp cầu thang tay vịn.',
        extraTasks: [],
        steps: [
          { key: 'nhan_don', name: '1. Nhận đơn & Đo đạc', done: true },
          { key: 'khong_cat', name: '2. Không cắt (Cắt sẵn)', done: true },
          { key: 'ghep_bo', name: '3. Ghép bo', done: true },
          { key: 'ghep_giua', name: '4. Ghép', done: true },
          { key: 'bo_kieu', name: '5. Bo kiểu', done: true },
          { key: 'danh_bong', name: '6. Đánh bóng (Bắt buộc nhánh Bo)', done: false }
        ]
      }
    ];
