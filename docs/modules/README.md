# Danh Mục Các Module Chức Năng — Lbook

> **Mục tiêu**: Liệt kê các module nghiệp vụ độc lập của Lbook, phạm vi trách nhiệm và liên kết tới tài liệu đặc tả chi tiết.

---

## 1. Bản đồ phân rã Module (Module Map)

```text
docs/modules/
├── README.md               # Bản đồ tổng quan các module (tài liệu này)
├── TTS_PIPELINE.md         # Module 01: Pipeline phát âm thanh, Mutex và Providers
├── LIBRARY_STORAGE.md      # Module 02: Quản lý thư viện, lưu trữ Hybrid IndexedDB
├── AUDIO_EXPORT.md         # Module 03: Tải âm thanh hàng loạt, xuất MP3/ZIP
├── READER_THEMES.md        # Module 04: Trình đọc sách, bôi màu karaoke, giao diện kính
└── DICTIONARY_RULES.md     # Module 05: Bộ quy tắc từ điển phát âm & kiểm thử trực tiếp
```

---

## 2. Tóm tắt phạm vi và trách nhiệm từng Module

| Mã Module | Tên Module | Tệp Mã Nguồn Chính | Nhiệm Vụ Cốt Lõi | Tài Liệu |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **TTS Pipeline & Audio Guard** | `src/services/tts/*` | State machine phát âm thanh, prefetch window, chống trùng âm qua `GlobalAudioGuard`, tích hợp Google/Edge/Browser. | [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) |
| **MOD-02** | **Library & Storage Engine** | `src/services/storage.ts`, `txtParser.ts`, `epubParser.ts` | Lưu trữ Hybrid IndexedDB, nạp sách TXT, bóc tách EPUB JSZip, dọn dẹp thư viện an toàn, sao lưu `.storytts`. | [`LIBRARY_STORAGE.md`](./LIBRARY_STORAGE.md) |
| **MOD-03** | **Audio Downloader & Export** | `src/services/audioExportService.ts`, `AudioDownloaderView.tsx` | Tổng hợp âm thanh chương tốc độ cao, đóng gói MP3 CBR 128k hoặc ZIP, quản lý tiến độ tải xuống. | [`AUDIO_EXPORT.md`](./AUDIO_EXPORT.md) |
| **MOD-04** | **Reader & Theme Engine** | `src/components/ReaderView.tsx`, `src/index.css` | Đọc toàn màn hình, bôi màu câu theo thời gian thực (karaoke), tua câu khi nhấp, 6 bảng màu đọc và phông chữ. | [`READER_THEMES.md`](./READER_THEMES.md) |
| **MOD-05** | **Dictionary & Pronunciation** | `src/components/DictionaryView.tsx`, `textPreprocessor.ts` | Thay thế từ phát âm sai (tên riêng, từ Hán Việt, phiên âm), 4 chế độ tìm kiếm (Exact, Contains, StartsWith, Regex). | [`DICTIONARY_RULES.md`](./DICTIONARY_RULES.md) |

---

## 3. Quy tắc phát triển và mở rộng Module

1. **Tính độc lập cao (High Cohesion, Low Coupling)**: Các module service không được truy cập trực tiếp vào React DOM hay thao tác với state của component khác.
2. **Giao tiếp qua Event & Callback**: Các service phát ra sự kiện (`subscribe`) để component React lắng nghe và cập nhật giao diện.
3. **Giới hạn số dòng**: Mỗi tài liệu module con phải tuân thủ nghiêm ngặt quy tắc <= 300 dòng.
