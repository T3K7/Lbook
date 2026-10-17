# Hồ Sơ Tệp: `electron/main.ts`

> **Đường dẫn nguồn**: `electron/main.ts`  
> **Module**: Desktop Runtime & Packaging  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`electron/main.ts` là điểm vào chính (Main Process Entry Point) cho phiên bản Windows Desktop của Lbook. Tệp này chịu trách nhiệm:
1. Quản lý vòng đời ứng dụng Electron (`app.whenReady()`, `before-quit`, `window-all-closed`).
2. Quản lý Single-Instance Lock (`app.requestSingleInstanceLock()`) để ngăn phân mảnh origin; mở cửa sổ phụ trên cùng backend khi người dùng nhấp đúp biểu tượng Lbook.
3. Tự động tìm cổng TCP trống trên card mạng cục bộ (`127.0.0.1`) và khởi chạy máy chủ Express nội bộ.
4. Tạo và điều khiển tập hợp cửa sổ ứng dụng (`BrowserWindow`) với kích thước 1280x800, hỗ trợ phóng to, thu nhỏ và đóng từng cửa sổ độc lập.
5. Đợi máy chủ backend trả về HTTP 200 trước khi nạp trang web giao diện để ngăn ngừa lỗi kết nối ban đầu.
6. Xử lý các thông điệp IPC từ Renderer: lấy Base URL backend (`get-api-base-url`), lấy phiên bản app (`get-app-version`), và các lệnh thu phóng cửa sổ theo `event.sender`.
7. Đóng sạch sẽ máy chủ nội bộ khi người dùng thoát ứng dụng để không để lại tiến trình chạy ngầm.

---

## 2. Các hàm & Cấu trúc quan trọng

- `findFreePort(preferredPort)`: Thử mở port 3000 hoặc yêu cầu hệ điều hành cấp port ngẫu nhiên khả dụng qua `net.createServer().listen(0)`.
- `startBackend()`: Gắn kết Express app từ `server/app.ts` vào port đã tìm được, phục vụ thư mục tĩnh `dist/` khi ở chế độ packaged.
- `waitForHttp(url, timeoutMs)`: Polling endpoint `/api/health` tối đa 20 giây để bảo đảm server đã sẵn sàng nhận kết nối.
- `createWindow()`: Tạo `BrowserWindow` với cờ bảo mật cao (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`).
- `cleanupBackend()`: Đóng `http.Server` an toàn khi tắt app.

---

## 3. Các phụ thuộc (Dependencies)

- `electron`: `app`, `BrowserWindow`, `ipcMain`.
- `createExpressApp` (`server/app.ts`): Khởi tạo máy chủ.
- Node.js built-ins: `http`, `net`, `path`.

---

## 4. Tệp liên quan & Phụ thuộc

- `electron/preload.cjs`: Preload script chạy trong tiến trình renderer.
- `scripts/build-electron.mjs`: Script biên dịch `main.ts` thành `dist-electron/main.cjs`.
- `package.json`: Trường `"main": "dist-electron/main.cjs"`.

---

## 5. Rủi ro & Lưu ý cho AI tiếp quản

- **Chỉ bind vào 127.0.0.1**: Tuyệt đối không bind máy chủ nội bộ vào `0.0.0.0` trong môi trường Desktop Electron để bảo đảm các máy tính khác trong cùng mạng LAN không thể truy cập vào máy chủ Lbook của người dùng.
- **Biên dịch trước khi chạy**: Mã nguồn trong `electron/` là TypeScript, bắt buộc phải chạy `npm run build:electron` trước khi chạy lệnh Electron.
