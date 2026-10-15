# Project Status — Lbook

> **Phiên bản hiện tại**: `v0.01` (`package.json: 0.0.1`)  
> **Cập nhật gần nhất**: 2026-10-15  
> **Nền tảng**: Windows Desktop x64 (Electron 44) & Web Applet (Express 4 + Vite 8)

Hệ thống theo dõi chi tiết toàn bộ trạng thái kỹ thuật, ma trận tính năng đã xác minh, và các quyết định kiến trúc (ADR) được lưu trữ và cập nhật tại:

👉 **[`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md)**

---

## Tóm tắt trạng thái các phân hệ chính

- [x] **01 Thư viện & Bóc tách sách**: Quản lý metadata, nạp TXT/EPUB/PGP, dọn dẹp thư viện an toàn (`VERIFIED`).
- [x] **02 Lưu trữ bền vững**: Hybrid IndexedDB (`storytts_db_v1`) + Cache RAM, migration `v6` (`VERIFIED`).
- [x] **03 Trình đọc truyện thông minh**: Bôi màu câu đọc karaoke thời gian thực, tua câu tức thì, 6 bảng màu (`VERIFIED`).
- [x] **04 Pipeline âm thanh (TTS)**: Google TTS tự nhiên, Edge Neural, Browser SAPI, `GlobalAudioGuard` Master Mutex (`VERIFIED`).
- [x] **05 Tải & Xuất MP3/ZIP**: Xuất file MP3 chuẩn 128k CBR qua FFmpeg backend, giao diện đồng bộ cả Light & Dark mode (`VERIFIED`).
- [x] **06 Từ điển phát âm**: 4 chế độ khớp (Exact, Contains, StartsWith, Regex), bàn test bench trực tiếp (`VERIFIED`).
- [x] **07 Sao lưu & Phục hồi**: Xuất/nhập file `.storytts` định dạng JSON (`VERIFIED`).
- [x] **08 Giao diện Glassmorphism**: 3 chế độ (Light, Dark, System), biến CSS ngữ nghĩa (`VERIFIED`).
- [x] **09 Đóng gói Windows Desktop**: Electron 44 + `electron-builder` tạo file NSIS `.exe` và Portable `.zip` (`VERIFIED`).
- [ ] **10 Giọng đọc AI VinaTTS Offline**: Mô hình neural ONNX cục bộ (`IMPLEMENTED_UNVERIFIED`).

---

Xem chi tiết danh sách nhiệm vụ tại [`docs/TASKS.md`](./docs/TASKS.md) và danh mục lỗi tại [`docs/BUGS.md`](./docs/BUGS.md).
