# Hồ Sơ Tệp: `server/app.ts`

> **Đường dẫn nguồn**: `server/app.ts`  
> **Module**: Backend & Media Services  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`server/app.ts` định nghĩa máy chủ Express chính của ứng dụng Lbook. Tệp này chịu trách nhiệm:
1. Thiết lập máy chủ Express với hỗ trợ CORS cho renderer desktop và web applet.
2. Proxy các request tổng hợp âm thanh Google TTS (`GET /api/tts/google`) kèm User-Agent hợp lệ.
3. Tích hợp tiến trình con FFmpeg (`child_process.spawn`) để áp dụng bộ lọc `atempo` thay đổi tốc độ đọc mà không làm méo cao độ giọng.
4. Ghép nối hàng chục đoạn audio nhỏ thành một file MP3 hoàn chỉnh với bitrate chuẩn 128k CBR 44.1kHz (`POST /api/audio/export-chapter`).
5. Quản lý Download Store trong RAM (`downloadStore`) để cung cấp endpoint tải file trực tiếp có header `Content-Disposition: attachment`.
6. Cung cấp API kiểm tra và tải các bản build phát hành (`/api/release/*`).

---

## 2. Các hàm & Cấu trúc dữ liệu nội bộ

- `ttsBufferCache`: `Map<string, Buffer>` lưu trữ tối đa 2000 đoạn audio đã xử lý để tránh gọi lại Google TTS và chạy lại FFmpeg không cần thiết.
- `downloadStore`: `Map<string, DownloadItem>` lưu trữ tạm các file tải về trong RAM, tự động dọn dẹp các file cũ hơn 2 giờ.
- `buildAtempoFilter(speed: number)`: Thuật toán xây dựng chuỗi filter FFmpeg (ví dụ với tốc độ `3.0x`, FFmpeg chỉ nhận tối đa 2.0x mỗi filter, hàm sẽ tự động tách thành `atempo=2.0000,atempo=1.5000`).
- `applyTempoToMp3Buffer(inputBuffer, speed)`: Spawn tiến trình FFmpeg, truyền audio qua `stdin` và nhận kết quả qua `stdout`.
- `stitchAndExportChapterMp3(inputBuffer, speed)`: Nối và chuẩn hóa audio chương hoàn chỉnh.

---

## 3. Các phụ thuộc (Dependencies)

- `express`: Framework máy chủ HTTP.
- `getFfmpegPath` (`server/ffmpegResolver.ts`): Lấy đường dẫn nhị phân FFmpeg khả dụng.
- Node.js built-ins: `http`, `https`, `child_process`, `path`, `fs`.

---

## 4. Tệp sử dụng `server/app.ts`

- `server.ts`: Khởi chạy máy chủ độc lập hoặc kèm Vite dev server.
- `electron/main.ts`: Khởi chạy máy chủ nội bộ trong quá trình khởi động Electron Desktop.

---

## 5. Rủi ro & Hướng dẫn cho AI tiếp quản

- **Xử lý Stream Error**: Luôn lắng nghe cả sự kiện `error` và `close` trên tiến trình FFmpeg để không làm treo Promise khi FFmpeg gặp lỗi định dạng.
- **Dung lượng RAM**: Giới hạn kích thước payload `express.json({ limit: '50mb' })` và `express.raw({ limit: '200mb' })` để bảo vệ máy chủ khỏi bị tràn bộ nhớ.
