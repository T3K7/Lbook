# Hồ Sơ Nhiệm Vụ: TASK-001 — Xây Dựng Hệ Thống Tài Liệu Kỹ Thuật & Bàn Giao AI

> **Mã nhiệm vụ**: `TASK-001`  
> **Trạng thái**: `DONE`  
> **Mức độ ưu tiên**: `HIGH`  
> **Cập nhật**: 2026-10-15

---

## 1. Mục tiêu nhiệm vụ

Xây dựng hệ thống tài liệu kỹ thuật hoàn chỉnh bằng Markdown (`.md`) trong repository Lbook để bất kỳ AI coding agent nào cũng có thể tiếp quản dự án ngay lập tức, hiểu rõ cấu trúc, lần theo phụ thuộc, xác định đúng file cần sửa mà không cần đọc toàn bộ mã nguồn hoặc lịch sử hội thoại.

---

## 2. Các yêu cầu bắt buộc

1. **Giới hạn cứng 300 dòng**: Toàn bộ file Markdown do dự án quản lý phải có độ dài **<= 300 dòng**.
2. **Kiểm tra tự động**: Tạo script `scripts/check-docs.mjs` để kiểm tra độ dài dòng và các liên kết tương đối, tích hợp vào `package.json`.
3. **Cấu trúc phân cấp**:
   - `docs/AI_START_HERE.md`: Điểm bắt đầu cho AI mới, quy trình 10 bước.
   - `docs/ARCHITECTURE.md` + `docs/architecture/*`: Sơ đồ kiến trúc Mermaid, các lớp hệ thống.
   - `docs/modules/*`: Đặc tả chi tiết từng module tính năng.
   - `docs/FILE_INDEX.md`: Danh bạ toàn bộ tệp quan trọng.
   - `docs/PROJECT_STATUS.md`: Trạng thái thực tế và quyết định kiến trúc.
   - `docs/TASKS.md` & `docs/BUGS.md`: Sổ theo dõi nhiệm vụ và lỗi.
   - `docs/files/*`: Hồ sơ chi tiết từng tệp mã nguồn quan trọng.

---

## 3. Các bước triển khai thực tế

- [x] Khảo sát toàn bộ repository, tệp cấu hình, backend Express và Electron Desktop.
- [x] Tạo `docs/AI_START_HERE.md` với quy trình 10 bước tiếp quản.
- [x] Tạo `docs/ARCHITECTURE.md` kèm sơ đồ Mermaid các lớp hệ thống.
- [x] Tạo các tài liệu chuyên đề: `FRONTEND.md`, `BACKEND.md`, `ELECTRON_DESKTOP.md`, `DATA_FLOW.md`.
- [x] Tạo các tài liệu module: `TTS_PIPELINE.md`, `LIBRARY_STORAGE.md`, `AUDIO_EXPORT.md`, `READER_THEMES.md`, `DICTIONARY_RULES.md`.
- [x] Tạo danh bạ tệp `docs/FILE_INDEX.md`.
- [x] Tạo và chuẩn hóa `docs/PROJECT_STATUS.md`, `docs/TASKS.md`, `docs/BUGS.md`, `docs/CHANGELOG.md`.
- [x] Tạo các hồ sơ tệp chi tiết trong `docs/files/`.
- [x] Tạo script `scripts/check-docs.mjs` và thêm script `check:docs` vào `package.json`.
- [x] Chạy kiểm tra tự động và xác minh 100% file đều <= 300 dòng.

---

## 4. Kết quả & Bằng chứng xác minh

- Lệnh kiểm tra: `npm run check:docs` -> Thành công (0 lỗi, 100% file Markdown <= 300 dòng).
- Lệnh biên dịch: `npm run lint` & `npm run build:renderer` -> Thành công (0 lỗi).
