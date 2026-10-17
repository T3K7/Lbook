# Trạng Thái Kỹ Thuật Dự Án (Project Status) — Lbook

> **Phiên bản**: `v0.01` (`package.json: 0.0.1`)  
> **Cập nhật gần nhất**: 2026-10-15  
> **Môi trường**: Windows Desktop x64 (Electron 44) & Web Applet (Express 4 + Vite 8)

---

## 1. Trạng thái tổng thể các Module (Feature Matrix)

| Module / Tính năng | Trạng thái kỹ thuật | Căn cứ xác minh & Kiểm thử thực tế |
| :--- | :--- | :--- |
| **01. Quản lý Thư viện (Library)** | `VERIFIED` | Nạp sách TXT, EPUB, PGP thành công; xóa sách có modal xác nhận, lọc/sắp xếp hoạt động chuẩn xác. |
| **02. Lưu trữ Hybrid (IndexedDB)** | `VERIFIED` | Dữ liệu lưu vào `StoryTTS_IndexedDB_v2`, khởi tạo an toàn, đồng bộ đa cửa sổ qua `BroadcastChannel` và Single-Instance Lock. |
| **03. Trình đọc thông minh (Reader)** | `VERIFIED` | Bôi màu câu đọc karaoke thời gian thực, tự động cuộn màn hình, nhấp tua câu tức thì với `GlobalAudioGuard`. |
| **04. Pipeline âm thanh (TTS)** | `VERIFIED` | Hỗ trợ Google TTS tự nhiên, Edge Neural và Browser SAPI; tự động phát nối tiếp sang chương mới mượt mà. |
| **05. Tải & Xuất MP3/ZIP (Downloader)**| `VERIFIED` | Xuất file MP3 chuẩn 128k CBR qua FFmpeg backend; đóng gói ZIP hàng loạt; giao diện đã hỗ trợ đầy đủ cả Light & Dark mode. |
| **06. Từ điển phát âm (Dictionary)** | `VERIFIED` | 4 chế độ khớp (Exact, Contains, StartsWith, Regex), bàn test bench phát âm thử hoạt động tốt. |
| **07. Sao lưu & Phục hồi (Backup)** | `VERIFIED` | Xuất gói `.storytts` định dạng JSON chứa sách, chương, cài đặt; nhập phục hồi dữ liệu đồng bộ. |
| **08. Tùy biến Theme & Giao diện** | `VERIFIED` | Hỗ trợ Light Mode, Dark Mode và Follow System; token glassmorphism mờ kính cao cấp; phông chữ và cỡ chữ tùy biến. |
| **09. Backend Streaming & FFmpeg** | `VERIFIED` | Server Express proxy `/api/tts/google`, bộ lọc `atempo` thay đổi tốc độ không đổi cao độ giọng, download store bộ nhớ RAM. |
| **10. Đóng gói Windows Desktop** | `VERIFIED` | Cấu hình `electron-builder.json` tạo thành công `Lbook-Setup.exe` (NSIS) và `Lbook-1.0.0-win.zip` (Portable). |
| **11. Mô hình AI VinaTTS Offline** | `IMPLEMENTED_UNVERIFIED` | Đã có interface `offlineAiTtsProvider.ts`, cần nạp file trọng số ONNX thực tế khi triển khai offline hoàn toàn. |

---

## 2. Nhật ký Quyết định Kiến trúc (Architectural Decision Records - ADR)

### ADR-01: Kiến trúc Lưu trữ Hybrid (IndexedDB + In-Memory RAM Cache)
- **Bối cảnh**: LocalStorage bị giới hạn 5MB không thể chứa các bộ tiểu thuyết dài hàng trăm chương. Truy vấn IndexedDB thuần túy bất đồng bộ làm component React bị giật lag khi render.
- **Quyết định**: Sử dụng IndexedDB làm nơi lưu trữ vĩnh viễn, nhưng duy trì `memoryCache` trong RAM. Khi mở sách, nạp chương vào RAM để đọc tức thì (0ms latency).

### ADR-02: Master Mutex chống trùng âm (`GlobalAudioGuard`)
- **Bối cảnh**: Người dùng nhấp tua câu hoặc nghe thử liên tục khiến các promise TTS async phát chồng âm thanh lên nhau.
- **Quyết định**: Mọi yêu cầu phát âm thanh bắt buộc gọi `GlobalAudioGuard.getInstance().stopEverything()` trước khi nạp audio mới, kết hợp kiểm tra `activeSessionId` sau mỗi lệnh await.

### ADR-03: Bộ lọc tốc độ âm thanh FFmpeg WSOLA atempo trên Backend
- **Bối cảnh**: Web Audio API khi đổi playbackRate trên trình duyệt có thể làm giọng bị the thé (chipmunk effect) hoặc bị vỡ tiếng.
- **Quyết định**: Backend xử lý chuyển đổi tốc độ qua FFmpeg với filter `atempo`, bảo toàn 100% cao độ giọng đọc tự nhiên.

### ADR-04: Loại bỏ hoàn toàn mã màu cứng (Anti-Hardcoded Color Discipline)
- **Bối cảnh**: Lỗi BUG-001 xảy ra do các class `bg-slate-900`, `text-slate-200` viết cứng trong trang Tải âm thanh khiến trang bị tối đen khi chuyển sang Light Mode.
- **Quyết định**: Toàn bộ UI phải sử dụng biến CSS token ngữ nghĩa (`--glass-bg`, `--text-primary`, `--accent`...).

---

## 3. Các vấn đề cần ưu tiên (Current Priorities)

1. **Tài liệu & Bàn giao AI**: Hoàn thiện toàn bộ hệ sinh thái tài liệu Markdown phân cấp (tối đa 300 dòng/file) và tích hợp script `check-docs.mjs`.
2. **Kiểm thử mô hình AI Offline**: Tích hợp binary ONNX Runtime nội bộ cho giọng đọc VinaTTS khi người dùng không có kết nối mạng.
3. **Tối ưu hóa bộ nhớ khi xuất sách cực lớn**: Khi người dùng xuất hơn 500 chương cùng lúc thành file ZIP, kiểm soát dung lượng RAM qua việc chia batch nhỏ.
