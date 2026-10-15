# AI Handover & Quick Start Guide — Lbook

> **Mục tiêu**: Hướng dẫn bất kỳ AI coding agent nào tiếp quản dự án Lbook nhanh chóng nắm bắt kiến trúc, tìm đúng file và thực thi nhiệm vụ an toàn mà không cần đọc toàn bộ mã nguồn.

---

## 1. Giới thiệu dự án Lbook

**Lbook** là ứng dụng máy tính Windows (và Web SPA) chuyên nghiệp dành cho việc đọc sách, nghe sách nói thông minh bằng công nghệ tổng hợp giọng nói tiếng Việt (TTS). Ứng dụng hỗ trợ nạp sách TXT, EPUB, nghe đọc câu thời gian thực (karaoke highlight), đổi tốc độ đọc với FFmpeg atempo, xuất toàn bộ sách thành file MP3 chất lượng cao hoặc gói ZIP, và lưu trữ dữ liệu an toàn trên máy người dùng.

- **Phiên bản hiện tại**: `v0.01` (`package.json: 0.0.1`)
- **Nền tảng**: Windows Desktop (Electron 44 + NSIS / Portable) & Web Applet (Express + Vite)
- **Công nghệ cốt lõi**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 4, FFmpeg, IndexedDB, Web Speech API

---

## 2. Các lệnh làm việc đã xác minh (Verified Commands)

Tất cả các lệnh dưới đây đã được kiểm thử và xác minh chạy thành công trên môi trường thực tế:

```bash
# 1. Khởi chạy máy chủ phát triển (Dev Server: Express + Vite middleware)
npm run dev

# 2. Kiểm tra lỗi cú pháp và kiểu dữ liệu TypeScript (Zero errors)
npm run lint

# 3. Biên dịch giao diện React Web cho production (Vite build)
npm run build:renderer

# 4. Biên dịch mã nguồn Electron main & preload
npm run build:electron

# 5. Đóng gói đầy đủ ứng dụng máy tính Windows
npm run pack:win          # Đóng gói bộ cài đặt Windows NSIS
npm run pack:portable     # Đóng gói bản Portable chạy ngay (.zip)

# 6. Kiểm tra tính toàn vẹn và giới hạn 300 dòng của tài liệu
npm run check:docs
```

---

## 3. Quy trình 10 bước tiếp quản nhiệm vụ cho AI

Khi nhận bất kỳ yêu cầu mới, sửa lỗi hoặc nâng cấp tính năng, AI coding agent **bắt buộc tuân thủ quy trình 10 bước** sau:

1. **Bước 1**: Đọc tệp này (`docs/AI_START_HERE.md`) để nắm rõ giới hạn và quy tắc làm việc.
2. **Bước 2**: Đọc [`docs/PROJECT_STATUS.md`](./PROJECT_STATUS.md) và [`docs/TASKS.md`](./TASKS.md) để biết trạng thái tổng thể và các nhiệm vụ đang xử lý.
3. **Bước 3**: Nếu nhiệm vụ liên quan đến lỗi, đọc [`docs/BUGS.md`](./BUGS.md) để tra cứu lịch sử sự cố và các biện pháp khắc phục.
4. **Bước 4**: Mở sơ đồ liên quan trong [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) hoặc thư mục [`docs/architecture/`](./architecture/).
5. **Bước 5**: Tra cứu file cần sửa trong [`docs/FILE_INDEX.md`](./FILE_INDEX.md) và đọc hồ sơ tương ứng tại [`docs/files/`](./files/).
6. **Bước 6**: Đọc trực tiếp code nguồn cần chỉnh sửa. Chỉ mở rộng phạm vi đọc khi cần truy vết import hoặc luồng dữ liệu.
7. **Bước 7**: Thực hiện thay đổi nhỏ nhất có thể (minimal patch), không sửa lan sang các component không liên quan.
8. **Bước 8**: Chạy `npm run lint` và `npm run build:renderer` (hoặc test tương ứng) để xác minh không gây lỗi hồi quy.
9. **Bước 9**: Cập nhật tài liệu bị ảnh hưởng, `docs/TASKS.md`, `docs/BUGS.md` hoặc `docs/CHANGELOG.md` khi có thay đổi quan trọng.
10. **Bước 10**: Chạy `npm run check:docs` để xác minh giới hạn dòng và bàn giao kết quả ngắn gọn, rõ ràng.

---

## 4. QUY TẮC CỨNG: MỖI FILE MARKDOWN TỐI ĐA 300 DÒNG

- **Giới hạn cứng**: Toàn bộ file `.md` trong dự án **không bao giờ được vượt quá 300 dòng**.
- **Mục tiêu lý tưởng**: 100 – 200 dòng/file.
- **Cách xử lý khi file dài**: Tách nội dung thành file con theo chủ đề, lưu trong các thư mục chuyên biệt (`architecture/`, `modules/`, `files/`, `bugs/`, `tasks/`) và giữ file cha làm mục lục liên kết.
- **Kiểm tra tự động**: Chạy lệnh `npm run check:docs` trước khi hoàn tất mỗi phiên làm việc. Nếu có file vượt quá 300 dòng, lệnh sẽ trả về lỗi exit code `1`.

---

## 5. Mục lục liên kết nhanh đến hệ thống tài liệu

| Tài liệu | Đường dẫn | Nội dung chính |
| :--- | :--- | :--- |
| **Kiến trúc tổng thể** | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | Sơ đồ Mermaid, cấu trúc thư mục, các lớp kiến trúc |
| **Chỉ mục tệp nguồn** | [`docs/FILE_INDEX.md`](./FILE_INDEX.md) | Danh bạ toàn bộ tệp, vai trò, module và trạng thái |
| **Trạng thái dự án** | [`docs/PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Tính năng đã xác minh, quyết định thiết kế, tồn đọng |
| **Sổ theo dõi nhiệm vụ** | [`docs/TASKS.md`](./TASKS.md) | Danh sách task: `TODO`, `IN_PROGRESS`, `DONE` |
| **Sổ theo dõi lỗi** | [`docs/BUGS.md`](./BUGS.md) | Danh sách bug: nguyên nhân, cách sửa, bằng chứng |
| **Nhật ký thay đổi** | [`docs/CHANGELOG.md`](./CHANGELOG.md) | Lịch sử cập nhật qua từng phiên bản |
| **Tài liệu theo Module** | [`docs/modules/`](./modules/) | TTS Pipeline, Library, Audio Export, Reader, v.v. |
| **Hồ sơ từng tệp code** | [`docs/files/`](./files/) | Chi tiết API, phụ thuộc, rủi ro cho từng tệp quan trọng |
| **Kiến trúc chi tiết** | [`docs/architecture/`](./architecture/) | Frontend, Backend, Electron Desktop, Data Flow |
