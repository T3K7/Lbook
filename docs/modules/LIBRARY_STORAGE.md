# Đặc Tả Module: Thư Viện & Lưu Trữ Bền Vững (MOD-02) — Lbook

> **Phạm vi**: Lưu trữ Hybrid IndexedDB + In-Memory, bóc tách sách TXT/EPUB/PGP, dọn dẹp thư viện an toàn và xuất/nhập gói `.storytts`.

---

## 1. Thành phần cấu tạo Module

- **`src/services/storage.ts`**: Lõi lưu trữ trung tâm của ứng dụng. Cung cấp API đồng bộ (Synchronous in-memory) và bất đồng bộ (Asynchronous IndexedDB).
- **`src/services/txtParser.ts`**: Bộ phân tích văn bản thuần, tự động nhận diện mẫu tiêu đề chương tiếng Việt qua Regular Expression và hỗ trợ tệp mã hóa OpenPGP.
- **`src/services/epubParser.ts`**: Bộ phân tích tệp nén `.epub` sử dụng JSZip, đọc metadata `content.opf`, trích xuất ảnh bìa và cây mục lục HTML.
- **`src/services/backupService.ts`**: Đóng gói toàn bộ cơ sở dữ liệu thành tệp JSON `.storytts` để sao lưu và khôi phục nguyên vẹn trên máy khác.

---

## 2. Kiến trúc Hybrid IndexedDB (`storage.ts`)

Để giải quyết bài toán:
1. React component cần dữ liệu ngay lập tức khi render (không muốn bị màn hình trắng loading giật lag).
2. LocalStorage bị giới hạn cứng 5MB (chỉ chứa được 1-2 cuốn truyện ngắn).

Lbook áp dụng mô hình lai:
- **IndexedDB (`StoryTTS_IndexedDB_v2`)**: Là nguồn lưu trữ sự thật (Source of Truth), lưu trữ vĩnh viễn không giới hạn dung lượng:
  - Object Store `books`: Lưu trữ metadata của sách (tiêu đề, tác giả, số chương, lượt nghe, ngày tạo).
  - Object Store `chapters`: Lưu trữ toàn bộ nội dung văn bản chi tiết của từng chương.
- **In-Memory Cache (`memoryCache`)**: Khi ứng dụng khởi động, toàn bộ danh sách `books` được nạp vào RAM. Khi mở một cuốn sách, các chương của sách đó được nạp vào `memoryCache.chapters`. Mọi hàm đọc `getBooks()`, `getChapters()` đều đọc từ RAM với độ trễ 0ms.
- **Ghi đồng thời (Write-Through)**: Khi thêm sách hoặc sửa chương, dữ liệu vừa được ghi vào cache RAM vừa được ghi ngầm vào IndexedDB.

---

## 3. Khởi tạo an toàn & Đồng bộ đa cửa sổ (Cross-Window Sync)

- **Khởi tạo an toàn không xóa đè (`StorageService.init()`)**: 
  - Đọc dữ liệu sách tức thì từ `localStorage` để render giao diện không độ trễ.
  - Đồng thời kích hoạt bất đồng bộ `loadBooksAsync()` để hòa giải và nạp bổ sung bất kỳ truyện nào từ IndexedDB.
  - Tuyệt đối không thực thi các thao tác xóa store hay xóa sạch dữ liệu người dùng khi mở cửa sổ mới.
- **Kênh đồng bộ thời gian thực (`BroadcastChannel` & `storage` event)**:
  - Khi Cửa sổ A lưu thêm, cập nhật hoặc xóa sách, sự kiện `BOOKS_UPDATED` được phát đi tức thì trên kênh `lbook_cross_window_sync`.
  - Cửa sổ B nhận sự kiện, đồng bộ bộ nhớ đệm và kích hoạt cập nhật React state ngay lập tức mà không cần tải lại trang.
- **Dọn dẹp thư viện chủ động (`StorageService.deleteAllBooks()`)**:
  - Chỉ thực hiện khi người dùng chủ động nhấn nút xóa toàn bộ thư viện trong Cài đặt.
  - Xóa sạch store `books` và `chapters` trong IndexedDB.
  - Xóa sạch bộ nhớ đệm `memoryCache.chapters` và `memoryCache.books`.
  - Đặt lại lịch sử nghe và dấu trang.
  - **Giữ nguyên 100%**: Toàn bộ cấu hình cá nhân của người dùng (`lbook_settings`, `lbook_dictionaries`, token giọng đọc, hình nền tùy chọn).

---

## 4. Giải mã tài liệu tiếng Việt (`txtParser.ts`)

### Regex nhận diện chương tiếng Việt:
Bộ lọc nhận diện thông minh các biến thể chương phổ biến:
```typescript
const CHAPTER_REGEX = /^(?:Chương|Hồi|Tiết|Quyển|Phần|Mục|Bài|Bản|Cục|Tập|Trận|Kỳ|Episode|Chapter)\s+([0-9IVXLCDM\s]+|[一二三四五六七八九十百千万]+)?[:\.\-\s]*(.*)$/i;
```

### Các tính năng nâng cao:
1. **Bảo vệ mã hóa**: Tự động nhận diện UTF-8, UTF-16LE, UTF-16BE và Windows-1258 tiếng Việt.
2. **Hỗ trợ tệp PGP/GPG**: Giải mã trực tiếp tệp mã hóa có mật khẩu hoặc tệp chữ ký điện tử mà không cần cài thêm phần mềm ngoài.
3. **Giới hạn an toàn**: Tự động chia nhỏ các chương quá dài (> 80.000 ký tự) thành các phần phụ để trình duyệt không bị đơ giật khi đọc.
