# Chỉ Mục Tệp Mã Nguồn & Cấu Hình — Lbook

> **Mục tiêu**: Danh bạ tra cứu nhanh vai trò, module và trạng thái xác minh của tất cả các tệp quan trọng trong dự án Lbook.

---

## 1. Thành phần Cốt lõi & Điểm Vào (Entry Points & Orchestration)

| Đường dẫn tệp | Vai trò & Trách nhiệm | Thuộc Module | Trạng thái | Hồ sơ chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| `src/main.tsx` | Entry point React, gắn kết ứng dụng vào DOM `#root` | Core Presentation | `VERIFIED` | N/A |
| `src/App.tsx` | Nhạc trưởng điều phối state toàn cục, nạp sách, pipeline audio | Core Presentation | `VERIFIED` | [`src__App.tsx.md`](./files/src__App.tsx.md) |
| `src/index.css` | Khai báo Tailwind CSS v4, toàn bộ biến token Glassmorphism | Design System | `VERIFIED` | N/A |
| `server.ts` | Entry point Express dev/prod, tích hợp Vite middlewares | Backend Server | `VERIFIED` | N/A |
| `electron/main.ts` | Main process Electron, mở port loopback, quản lý BrowserWindow | Desktop Runtime | `VERIFIED` | [`electron__main.ts.md`](./files/electron__main.ts.md) |
| `electron/preload.cjs` | Context bridge bảo mật an toàn (`contextIsolation: true`) | Desktop Runtime | `VERIFIED` | N/A |

---

## 2. Giao Diện Người Dùng (Components & Views)

| Đường dẫn tệp | Vai trò & Trách nhiệm | Thuộc Module | Trạng thái | Hồ sơ chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/LibraryView.tsx` | Kho sách, tìm kiếm, lọc, nạp TXT/EPUB/PGP, xóa sách | MOD-02 (Library) | `VERIFIED` | [`src__components__LibraryView.tsx.md`](./files/src__components__LibraryView.tsx.md) |
| `src/components/ReaderView.tsx` | Trình đọc truyện toàn màn hình, karaoke highlight, tua câu | MOD-04 (Reader) | `VERIFIED` | [`src__components__ReaderView.tsx.md`](./files/src__components__ReaderView.tsx.md) |
| `src/components/AudioDownloaderView.tsx` | Tải âm thanh chương truyện, đóng gói ZIP/MP3, tiến độ | MOD-03 (Export) | `VERIFIED` | [`src__components__AudioDownloaderView.tsx.md`](./files/src__components__AudioDownloaderView.tsx.md) |
| `src/components/BookDetailView.tsx` | Xem thông tin sách, danh sách chương, đảo chiều thứ tự | MOD-02 (Library) | `VERIFIED` | N/A |
| `src/components/SettingsView.tsx` | Cài đặt giao diện, giọng đọc, dọn dẹp thư viện an toàn | Settings & System | `VERIFIED` | N/A |
| `src/components/Sidebar.tsx` | Thanh điều hướng chính bên trái, hiển thị phiên bản app | Core Presentation | `VERIFIED` | N/A |
| `src/components/TtsControlsBar.tsx` | Thanh điều khiển audio dock cố định ở chân màn hình | MOD-01 (TTS) | `VERIFIED` | N/A |
| `src/components/VoiceSelectorModal.tsx` | Hộp thoại chọn giọng đọc tiếng Việt, nghe thử không trùng âm | MOD-01 (TTS) | `VERIFIED` | N/A |
| `src/components/DictionaryView.tsx` | Quản lý quy tắc phát âm và bàn thử nghiệm trực tiếp | MOD-05 (Dictionary) | `VERIFIED` | N/A |
| `src/components/BackupRestoreView.tsx`| Xuất và nhập gói sao lưu toàn vẹn `.storytts` | Backup & System | `VERIFIED` | N/A |
| `src/components/HistoryView.tsx` | Xem lịch sử nghe sách và thống kê tiến độ | History | `VERIFIED` | N/A |
| `src/components/BenchmarkView.tsx` | Bộ công cụ đo tốc độ tách câu và hiệu năng xử lý văn bản | Testing & Benchmark | `VERIFIED` | N/A |
| `src/components/BackgroundArtwork.tsx`| Hiển thị hình nền nghệ thuật với lớp phủ Scrim tương phản | Design System | `VERIFIED` | N/A |
| `src/components/ui/Button.tsx` | Nút bấm nguyên tử hỗ trợ variant primary, secondary, danger | UI Primitive | `VERIFIED` | N/A |
| `src/components/ui/Card.tsx` | Khung thẻ kính mờ hỗ trợ bo góc và đổ bóng Fluent | UI Primitive | `VERIFIED` | N/A |
| `src/components/ui/Modal.tsx` | Hộp thoại popup kính mờ với hiệu ứng backdrop blur | UI Primitive | `VERIFIED` | N/A |

---

## 3. Dịch Vụ Nghiệp Vụ (Services & Parsers)

| Đường dẫn tệp | Vai trò & Trách nhiệm | Thuộc Module | Trạng thái | Hồ sơ chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| `src/services/storage.ts` | Lưu trữ Hybrid IndexedDB (`storytts_db_v1`) + Cache RAM | MOD-02 (Storage) | `VERIFIED` | [`src__services__storage.ts.md`](./files/src__services__storage.ts.md) |
| `src/services/audioExportService.ts` | Xuất audio chương, ghép file MP3, nén ZIP qua JSZip | MOD-03 (Export) | `VERIFIED` | [`src__services__audioExportService.ts.md`](./files/src__services__audioExportService.ts.md) |
| `src/services/txtParser.ts` | Bóc tách TXT, regex nhận diện chương tiếng Việt, giải mã PGP | MOD-02 (Parsing) | `VERIFIED` | N/A |
| `src/services/epubParser.ts` | Giải nén EPUB qua JSZip, trích xuất HTML spine và ảnh bìa | MOD-02 (Parsing) | `VERIFIED` | N/A |
| `src/services/sentenceSplitter.ts` | Tách câu tiếng Việt thông minh, bảo toàn từ viết tắt ThS/TS | Text Processing | `VERIFIED` | N/A |
| `src/services/chunker.ts` | Gom câu thành các chunk âm thanh tối ưu (~240 ký tự) | Text Processing | `VERIFIED` | N/A |
| `src/services/textPreprocessor.ts` | Tiền xử lý văn bản theo từ điển phát âm trước khi gửi sang TTS | MOD-05 (Dictionary) | `VERIFIED` | N/A |
| `src/services/progressCoordinator.ts`| Điều phối lưu tiến độ đọc định kỳ không làm nghẽn I/O | Persistence | `VERIFIED` | N/A |
| `src/services/tts/ttsAudioPipeline.ts` | Nhạc trưởng phát âm thanh, state machine, prefetch window | MOD-01 (TTS) | `VERIFIED` | [`src__services__tts__ttsAudioPipeline.ts.md`](./files/src__services__tts__ttsAudioPipeline.ts.md) |
| `src/services/tts/globalAudioGuard.ts` | Master Mutex ngăn chặn triệt để hiện tượng nói đè, lặp âm | MOD-01 (TTS) | `VERIFIED` | [`src__services__tts__globalAudioGuard.ts.md`](./files/src__services__tts__globalAudioGuard.ts.md) |
| `src/services/tts/googleTtsProvider.ts`| Adapter kết nối stream Google TTS qua backend proxy | MOD-01 (TTS) | `VERIFIED` | N/A |
| `src/services/tts/edgeOnlineTtsProvider.ts`| Adapter kết nối giọng đọc Microsoft Neural | MOD-01 (TTS) | `VERIFIED` | N/A |
| `src/services/tts/browserTtsProvider.ts`| Adapter Web Speech Synthesis API nội bộ hệ điều hành | MOD-01 (TTS) | `VERIFIED` | N/A |
| `src/services/tts/audioPreviewManager.ts`| Quản lý phát nghe thử giọng đọc trong Modal | MOD-01 (TTS) | `VERIFIED` | N/A |

---

## 4. Backend & Dịch Vụ Máy Chủ (Server Subsystem)

| Đường dẫn tệp | Vai trò & Trách nhiệm | Thuộc Module | Trạng thái | Hồ sơ chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| `server/app.ts` | Máy chủ Express API, proxy Google TTS, download store, health | Backend | `VERIFIED` | [`server__app.ts.md`](./files/server__app.ts.md) |
| `server/ffmpegResolver.ts` | Tự động dò tìm nhị phân FFmpeg trên Windows và Linux | Backend | `VERIFIED` | N/A |

---

## 5. Scripts, Cấu Hình & Đóng Gói (Build & Tooling)

| Đường dẫn tệp | Vai trò & Trách nhiệm | Thuộc Module | Trạng thái |
| :--- | :--- | :--- | :--- |
| `package.json` | Cấu hình dependencies, metadata phiên bản, scripts build/pack | Build System | `VERIFIED` |
| `vite.config.ts` | Cấu hình Vite 8, plugin React, alias đường dẫn và port | Build System | `VERIFIED` |
| `tsconfig.json` | Cấu hình trình biên dịch TypeScript (strict mode, target ESNext) | Build System | `VERIFIED` |
| `electron-builder.json` | Cấu hình đóng gói Electron: NSIS installer và Portable ZIP | Packaging | `VERIFIED` |
| `scripts/build-electron.mjs` | Script biên dịch mã nguồn Electron bằng esbuild sang CommonJS | Build System | `VERIFIED` |
| `scripts/check-docs.mjs` | Script kiểm tra tự động giới hạn 300 dòng và liên kết docs | Documentation | `VERIFIED` |
| `.gitignore` | Loại trừ `node_modules`, `dist`, `release`, và các tệp truyện cá nhân | Repository | `VERIFIED` |
