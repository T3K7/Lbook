# Danh Mục Hồ Sơ Từng Tệp Mã Nguồn — Lbook

> **Mục tiêu**: Cung cấp hồ sơ phân tích chuyên sâu cho từng tệp mã nguồn quan trọng của Lbook, giúp AI coding agent hiểu rõ trách nhiệm, API, phụ thuộc, rủi ro và cách sửa chữa an toàn mà không cần đọc lại toàn bộ code.

---

## 1. Danh sách hồ sơ tệp mã nguồn hiện có

| Tệp Mã Nguồn Thực Tế | Tệp Hồ Sơ Markdown | Phân Hệ / Module | Vai Trò Chính |
| :--- | :--- | :--- | :--- |
| `src/App.tsx` | [`src__App.tsx.md`](./src__App.tsx.md) | Core Orchestrator | Điều phối trạng thái toàn cục, chuyển view, nạp sách |
| `src/services/storage.ts` | [`src__services__storage.ts.md`](./src__services__storage.ts.md) | MOD-02 (Storage) | Lõi lưu trữ Hybrid IndexedDB + RAM Cache |
| `src/services/audioExportService.ts` | [`src__services__audioExportService.ts.md`](./src__services__audioExportService.ts.md) | MOD-03 (Export) | Dịch vụ xuất âm thanh MP3 và nén ZIP client-side |
| `src/services/tts/ttsAudioPipeline.ts`| [`src__services__tts__ttsAudioPipeline.ts.md`](./src__services__tts__ttsAudioPipeline.ts.md) | MOD-01 (TTS) | Nhạc trưởng phát âm thanh, state machine, prefetch |
| `src/services/tts/globalAudioGuard.ts` | [`src__services__tts__globalAudioGuard.ts.md`](./src__services__tts__globalAudioGuard.ts.md) | MOD-01 (TTS) | Master Mutex chống trùng lặp âm thanh |
| `src/components/AudioDownloaderView.tsx`| [`src__components__AudioDownloaderView.tsx.md`](./src__components__AudioDownloaderView.tsx.md) | MOD-03 (Export) | Giao diện trang Tải âm thanh, chọn chương, tiến độ |
| `src/components/ReaderView.tsx` | [`src__components__ReaderView.tsx.md`](./src__components__ReaderView.tsx.md) | MOD-04 (Reader) | Trình đọc truyện toàn màn hình, bôi màu karaoke, tua |
| `src/components/LibraryView.tsx` | [`src__components__LibraryView.tsx.md`](./src__components__LibraryView.tsx.md) | MOD-02 (Library) | Quản lý kho sách, nạp tệp, tìm kiếm và xóa truyện |
| `server/app.ts` | [`server__app.ts.md`](./server__app.ts.md) | Backend | Express API, proxy Google TTS, ghép audio FFmpeg |
| `electron/main.ts` | [`electron__main.ts.md`](./electron__main.ts.md) | Desktop Runtime | Vòng đời Electron, mở cổng loopback, BrowserWindow |

---

## 2. Quy tắc đặt tên hồ sơ tệp

Để tránh xung đột đường dẫn và duy trì tính nhất quán trên mọi hệ điều hành:
- Thay thế các dấu phân cách thư mục (`/`) bằng hai dấu gạch dưới (`__`).
- Thêm phần mở rộng `.md` ở cuối.
- *Ví dụ*: `src/services/storage.ts` -> `docs/files/src__services__storage.ts.md`.
- **Mỗi hồ sơ tệp bắt buộc có tối đa 300 dòng**.
