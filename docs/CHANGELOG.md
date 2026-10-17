# Nhật Ký Thay Đổi (Changelog) — Lbook

> **Mục tiêu**: Ghi lại lịch sử cập nhật tính năng, sửa lỗi và tái cấu trúc hệ thống theo từng phiên bản hoặc phiên làm việc.

---

## Phiên bản 0.1.1 (2026-10-16)

### 1. Sửa lỗi Thư viện trống khi mở nhiều cửa sổ (BUG-005)
- **Đồng nhất Origin và Session trong Electron (`electron/main.ts`)**:
  - Áp dụng `app.requestSingleInstanceLock()` để ngăn chặn tiến trình thứ hai khởi tạo backend trên port khác.
  - Khi người dùng mở thêm cửa sổ trên Windows, sự kiện `second-instance` tạo cửa sổ phụ trên cùng backend và cùng web origin.
  - Xử lý các sự kiện IPC `window-minimize`, `window-maximize`, `window-close` theo `event.sender` để mỗi cửa sổ điều khiển độc lập.
- **Khởi tạo an toàn & Đồng bộ Cross-Window (`src/services/storage.ts`)**:
  - Loại bỏ hoàn toàn cơ chế xóa đè `clearStore` khi khởi tạo cửa sổ mới.
  - Tích hợp `BroadcastChannel('lbook_cross_window_sync')` và sự kiện `storage` chuẩn W3C để đồng bộ danh sách truyện thời gian thực giữa Cửa sổ A và Cửa sổ B mà không cần tải lại trang.
  - Thêm `loadBooksAsync()` để tự động hòa giải và hợp nhất dữ liệu từ cả `localStorage` và `IndexedDB`.
  - Cập nhật `IndexedDbHelper.setBook` chờ transaction hoàn tất (`tx.oncomplete`) trước khi xác nhận lưu thành công.
- **Kiểm thử hồi quy (`scripts/test-multiwindow-storage.mjs`)**:
  - Xây dựng bộ test suite `npm run test:multiwindow` gồm 6 bài kiểm thử tự động đạt tỷ lệ đạt 100%.

---

## Phiên bản 0.0.1 (2026-10-15)

### 1. Hệ thống Tài liệu Kỹ thuật & Bàn giao AI (TASK-001)
- Xây dựng cấu trúc tài liệu phân cấp toàn diện trong `docs/`: `AI_START_HERE.md`, `ARCHITECTURE.md`, `FILE_INDEX.md`, `PROJECT_STATUS.md`, `TASKS.md`, `BUGS.md`, `CHANGELOG.md`.
- Tạo các tài liệu chuyên đề trong `docs/architecture/` (`FRONTEND.md`, `BACKEND.md`, `ELECTRON_DESKTOP.md`, `DATA_FLOW.md`).
- Tạo các tài liệu đặc tả module trong `docs/modules/` (`TTS_PIPELINE.md`, `LIBRARY_STORAGE.md`, `AUDIO_EXPORT.md`, `READER_THEMES.md`, `DICTIONARY_RULES.md`).
- Lập hồ sơ kỹ thuật chi tiết cho các tệp cốt lõi trong `docs/files/`.
- Tạo script kiểm tra tự động `scripts/check-docs.mjs` bảo đảm 100% tệp Markdown <= 300 dòng và kiểm tra tính toàn vẹn của liên kết.

### 2. Sửa lỗi Giao diện Sáng bị Tối ở trang Tải Âm Thanh (BUG-001 / TASK-002)
- Khắc phục triệt để hiện tượng trang Tải âm thanh bị tối thẫm khi ứng dụng ở Light Mode.
- Thay thế toàn bộ các lớp màu tối cứng (`bg-slate-900`, `border-white/10`, `text-slate-200`) bằng hệ thống biến CSS token Glassmorphism (`var(--glass-bg-header)`, `var(--glass-bg)`, `var(--text-primary)`, `var(--accent)`).
- Tệp bị ảnh hưởng: `src/components/AudioDownloaderView.tsx`.
- Kiểm thử xác minh: `npm run lint` (0 lỗi), `npm run build:renderer` (thành công 100%).

### 3. Chuẩn hóa Phiên bản Hiển thị (TASK-004)
- Cập nhật số phiên bản hiển thị tại phần chân Sidebar (`src/components/Sidebar.tsx`) thành `v0.01`.
- Đồng bộ hóa `version` trong `package.json` thành `0.0.1`.

### 4. Dọn Dẹp Thư Viện & Bảo Vệ Dữ Liệu Cá Nhân (TASK-003)
- Bổ sung migration `lbook_library_cleaned_v6` trong `StorageService` để khởi tạo môi trường sạch 0 truyện mẫu.
- Bổ sung chức năng Dọn dẹp Thư viện an toàn trong `SettingsView.tsx`: Xóa sạch truyện, chương, lịch sử nghe và dấu trang nhưng **bảo lưu 100% cài đặt cá nhân, giọng đọc TTS và theme giao diện**.
- Loại bỏ toàn bộ các mô tả cũ về "sách mẫu" trong các tệp đa ngôn ngữ `src/i18n/vi.ts` và `src/i18n/en.ts`.
- Tệp bị ảnh hưởng: `src/services/storage.ts`, `src/components/SettingsView.tsx`, `src/components/BackupRestoreView.tsx`, `src/App.tsx`, `src/i18n/types.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`.
