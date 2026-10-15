# Hồ Sơ Tệp: `src/services/storage.ts`

> **Đường dẫn nguồn**: `src/services/storage.ts`  
> **Module**: MOD-02 (Storage Engine)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15 (Migration `v6` dọn sạch truyện mẫu, hàm `deleteAllBooks` bảo lưu cài đặt cá nhân)

---

## 1. Vai trò & Phạm vi trách nhiệm

`src/services/storage.ts` là lõi quản lý dữ liệu bền vững của Lbook. Tệp này chịu trách nhiệm:
1. Quản lý cơ sở dữ liệu IndexedDB `StoryTTS_IndexedDB_v2` với 2 object store: `books` và `chapters`.
2. Duy trì vùng nhớ đệm `memoryCache` trong RAM giúp các component đọc dữ liệu đồng bộ với độ trễ 0ms.
3. Thực hiện cơ chế ghi đồng thời (Write-through) giữa In-Memory Cache và IndexedDB.
4. Quản lý cấu hình người dùng, dấu trang, lịch sử và từ điển phát âm trong LocalStorage.
5. Cung cấp API dọn dẹp thư viện an toàn (`deleteAllBooks()`) mà không xóa mất cài đặt người dùng.

---

## 2. Các hàm & Class quan trọng

- `class StorageService`:
  - `init()`: Khởi tạo hệ thống, chạy migration `lbook_library_cleaned_v6`, nạp danh sách sách vào RAM.
  - `getBooks()`: Trả về danh sách sách từ RAM cache (đồng bộ).
  - `saveBooks(books)`: Ghi danh sách sách vào RAM, LocalStorage và IndexedDB.
  - `getChapters(bookId)`: Lấy danh sách chương từ RAM cache.
  - `loadChaptersAsync(bookId)`: Nạp bất đồng bộ toàn bộ chương của sách từ IndexedDB vào RAM cache.
  - `saveChapters(bookId, chapters)`: Lưu nội dung chương vào IndexedDB và RAM cache.
  - `deleteBook(bookId)`: Xóa một cuốn sách và toàn bộ chương của sách đó khỏi IndexedDB.
  - `deleteAllBooks()`: Xóa sạch toàn bộ sách, chương, dấu trang, lịch sử đọc; bảo toàn 100% cấu hình cá nhân.
  - `subscribeBooks(callback)`: Đăng ký lắng nghe sự kiện thay đổi danh sách sách.
- `class IndexedDbHelper`:
  - Helper wrapper mở database, đọc/ghi/xóa từng store trong IndexedDB thông qua Promises.

---

## 3. Các phụ thuộc (Dependencies)

- `src/types/index.ts`: Các kiểu dữ liệu domain (`Book`, `Chapter`, `Bookmark`, `Dictionary`, `AppSettings`).
- IndexedDB Browser API (`window.indexedDB`).
- LocalStorage Browser API (`window.localStorage`).

---

## 4. Tệp sử dụng `storage.ts`

- Hầu như toàn bộ các Views và Services trong ứng dụng đều sử dụng `StorageService`:
  - `src/App.tsx`, `LibraryView.tsx`, `BookDetailView.tsx`, `ReaderView.tsx`, `SettingsView.tsx`, `BackupRestoreView.tsx`, `audioExportService.ts`, `backupService.ts`.

---

## 5. Rủi ro & Hướng dẫn cho AI tiếp quản

- **Tuyệt đối không dùng `localStorage.clear()`**: `localStorage` lưu trữ cả theme, token giọng đọc và cấu hình cá nhân. Muốn xóa sách, chỉ được gọi `StorageService.deleteAllBooks()`.
- **Đồng bộ hóa RAM và IndexedDB**: Khi lưu hoặc sửa đổi chương, luôn gọi hàm qua `StorageService` để đảm bảo cả RAM và IndexedDB đều được cập nhật cùng lúc.
