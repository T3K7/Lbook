# FFmpeg Binary for Windows Packaging

Để đóng gói bản Windows (.exe) hoàn chỉnh cùng FFmpeg:
1. Tải bản build tĩnh của ffmpeg.exe từ nguồn chính thức của dự án FFmpeg (GPL/LGPL):
   - https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)
   - hoặc https://github.com/BtbN/FFmpeg-Builds/releases
2. Giải nén và đặt file `ffmpeg.exe` trực tiếp vào thư mục `bin/ffmpeg.exe`.
3. Chạy lệnh đóng gói: `npm run electron:build`.
   `electron-builder` sẽ tự động đưa `bin/ffmpeg.exe` vào thư mục `resources/bin/ffmpeg.exe` của bộ cài đặt Lbook-Setup.exe mà không bị mã hóa ASAR (đảm bảo thực thi nguyên bản).
