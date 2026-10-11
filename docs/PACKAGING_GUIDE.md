# Hướng Dẫn Đóng Gói Ứng Dụng Windows (.EXE) Cho Lbook

## 1. Cấu Trúc Đóng Gói
Dự án Lbook đã được thiết kế sẵn sàng theo mô hình Electron + Express nội bộ:
- **`electron/main.ts`**: Main process quản lý cửa sổ Desktop Lbook, IPC, vòng đời ứng dụng và tự động kích hoạt backend Express nội bộ trên cổng loopback `127.0.0.1` động (hoặc 38240) an toàn.
- **`electron/preload.cjs`**: Preload script bảo mật chuẩn (`contextIsolation: true`, `nodeIntegration: false`, sandbox).
- **`server/app.ts`**: Express backend dạng module có thể chạy độc lập trong Node.js hoặc tích hợp vào Electron process.
- **`server/ffmpegResolver.ts`**: Tự động phát hiện file `ffmpeg.exe` từ thư mục `resources/bin/ffmpeg.exe` của ứng dụng hoặc trong hệ thống.
- **`electron-builder.json`**: Cấu hình đóng gói NSIS tạo bộ cài đặt `Lbook-Setup-{version}.exe` với Desktop & Start Menu shortcut.

## 2. Chuẩn Bị Binary FFmpeg Cho Windows
1. Tải bản build tĩnh của `ffmpeg.exe` dành cho Windows 64-bit từ:
   - https://www.gyan.dev/ffmpeg/builds/ (bản `ffmpeg-release-essentials.zip`)
2. Giải nén và copy file `ffmpeg.exe` vào thư mục:
   - `bin/ffmpeg.exe`
3. File này sẽ tự động được `electron-builder` đưa vào thư mục `extraResources` của bộ cài Windows (không bị nén ASAR, đảm bảo quyền thực thi trực tiếp).

## 3. Các Lệnh Đóng Gói
Khi chạy trên máy phát triển hoặc CI/CD Windows có cài sẵn `electron` và `electron-builder`:

```bash
# 1. Cài đặt các gói phụ thuộc (nếu chưa cài)
npm install

# 2. Build cả giao diện React và mã nguồn Electron
npm run build:all

# 3. Đóng gói ra bộ cài đặt Windows NSIS (Lbook-Setup.exe)
npm run electron:build
```

File cài đặt kết quả sẽ nằm tại thư mục `release/`:
- `release/Lbook-Setup-0.0.0.exe` (Bộ cài đặt Windows tự động)

## 4. Kiểm Thử Trực Tiếp Trong Quá Trình Phát Triển
- Chạy môi trường Web / AI Studio: `npm run dev` (hoặc `npm start`).
- Kiểm tra tính toàn vẹn của mã nguồn: `npm run build:all`.
