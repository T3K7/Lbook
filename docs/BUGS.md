# Sổ Theo Dõi Lỗi Kỹ Thuật (Bug Tracker) — Lbook

> **Mục tiêu**: Quản lý các lỗi đã ghi nhận, phương án tái hiện, nguyên nhân kỹ thuật và bằng chứng kiểm tra sửa lỗi bằng mã định danh ổn định (`BUG-xxx`).

---

## 1. Trạng thái chuẩn hóa

- `OPEN`: Đã ghi nhận nhưng chưa tìm ra nguyên nhân hoặc chưa sửa.
- `IN_PROGRESS`: Đang phân tích hoặc đang sửa code.
- `FIXED`: Đã sửa và có đầy đủ bằng chứng kiểm thử xác minh.
- `NEEDS_VERIFICATION`: Đã sửa nhưng cần người dùng hoặc môi trường đặc thù kiểm tra lại.

---

## 2. Bảng tổng hợp các lỗi

| Mã Lỗi | Mô tả lỗi | Mức độ | File liên quan | Trạng thái | Hồ sơ chi tiết |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`BUG-001`** | **Giao diện sáng (Light Mode) bị tối thẫm ở trang Tải âm thanh** | `HIGH` | `src/components/AudioDownloaderView.tsx` | `FIXED` | [`bugs/BUG-001.md`](./bugs/BUG-001.md) |
| **`BUG-002`** | **Nguy cơ trùng âm thanh khi nhấp tua câu liên tục trong Reader** | `HIGH` | `src/services/tts/globalAudioGuard.ts` | `FIXED` | [`files/src__services__tts__globalAudioGuard.ts.md`](./files/src__services__tts__globalAudioGuard.ts.md) |
| **`BUG-003`** | **Đầy bộ nhớ LocalStorage 5MB khi nạp truyện dài hàng trăm chương** | `CRITICAL`| `src/services/storage.ts` | `FIXED` | [`files/src__services__storage.ts.md`](./files/src__services__storage.ts.md) |
| **`BUG-004`** | **Lỗi chọn và nghe thử bộ sưu tập giọng đọc tiếng Việt phát cùng một giọng** | `HIGH` | `src/components/VoiceSelectorModal.tsx` | `FIXED` | [`bugs/BUG-004.md`](./bugs/BUG-004.md) |

---

## 3. Quy trình xử lý lỗi chuẩn cho AI tiếp quản

1. **Cấp mã định danh ổn định** (`BUG-xxx`).
2. **Ghi nhận các bước tái hiện** và sự khác biệt giữa kết quả thực tế với kết quả mong đợi.
3. **Truy vết code nguồn** để tìm đúng nguyên nhân cốt lõi (Root Cause). Tuyệt đối phân biệt giữa *giả thuyết* và *nguyên nhân đã được xác nhận*.
4. **Áp dụng bản sửa tối thiểu** theo đúng design system của dự án.
5. **Chạy kiểm thử thực tế** (`npm run lint`, `npm run build:renderer`) và lưu lại bằng chứng.
6. **Lập hồ sơ chi tiết** tại [`docs/bugs/BUG-xxx.md`](./bugs/) nếu lỗi có nguyên nhân phức tạp hoặc phạm vi ảnh hưởng rộng.
