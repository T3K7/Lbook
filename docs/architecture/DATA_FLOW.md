# Sơ Đồ Luồng Dữ Liệu Nghiệp Vụ — Lbook

> **Phạm vi**: Mô tả chi tiết 4 luồng dữ liệu cốt lõi của Lbook: Nạp & phân tích tài liệu, Phát âm thanh & tua câu, Xuất âm thanh hàng loạt, Đồng bộ tiến độ & lưu trữ.

---

## 1. Luồng 1: Nạp & Phân Tích Sách (Import & Document Processing)

Hỗ trợ kéo thả hoặc chọn tệp `.txt`, `.epub`, `.pgp`, `.zip` từ máy tính.

```mermaid
flowchart TD
    A[Người dùng nạp tệp TXT / EPUB] --> B{Kiểm tra phần mở rộng}
    B -->|.txt| C[services/txtParser.ts]
    B -->|.epub| D[services/epubParser.ts]
    B -->|.pgp / .gpg| E[Giải mã OpenPGP client-side] --> C

    D -->|JSZip giải nén container.xml & OPF| F[Trích xuất danh sách chương HTML & Bìa sách]
    F --> G[Làm sạch thẻ HTML & Chuẩn hóa Unicode]

    C -->|Auto-detect UTF-8 / Windows-1258| H[Regex Tiếng Việt: Chương|Hồi|Tiết|Quyển]
    H --> I[services/sentenceSplitter.ts]

    I -->|Tách đoạn & câu, bảo vệ từ viết tắt ThS/PGS| J[services/chunker.ts]
    G --> I

    J -->|Gom câu thành chunk ~240 ký tự| K[Tạo cấu trúc Book & Chapter[]]
    K --> L[Lưu vào IndexedDB storytts_db_v1]
    L --> M[Cập nhật state books trong App.tsx]
    M --> N[Hiển thị sách trong LibraryView]
```

---

## 2. Luồng 2: Phát Âm Thanh Realtime & Tua Câu (TTS Playback & Seek)

Cơ chế độc quyền sử dụng `GlobalAudioGuard` để ngăn ngừa triệt để lỗi nói đè hoặc phát lặp âm thanh.

```mermaid
sequenceDiagram
    participant User as Người Dùng
    participant Reader as ReaderView.tsx
    participant Pipeline as ttsAudioPipeline.ts
    participant Guard as globalAudioGuard.ts
    participant Audio as HTMLAudioElement

    User->>Reader: Nhấp vào câu văn bản bất kỳ để nghe
    Reader->>Pipeline: playChunk(chunkIndex)
    Pipeline->>Guard: stopEverything() (Hủy toàn bộ âm thanh cũ trên app)
    Guard->>Audio: pause(), src = '', xả bộ nhớ đệm
    Pipeline->>Pipeline: session = ++activeSessionId (Đánh dấu phiên mới)
    Pipeline->>Pipeline: Lấy audio từ cache hoặc gọi Provider
    Pipeline->>Audio: Gán src mới & audio.play()
    Audio-->>Pipeline: Event 'timeupdate' / 'ended'
    Pipeline-->>Reader: Callback chunk_start(paragraphIndex, sentenceIndex)
    Reader-->>User: Bôi màu vàng/xanh câu đang đọc (Karaoke Highlight)
    alt Hết câu cuối của chương và bật autoNext
        Pipeline->>Pipeline: Chuyển sang Chương N+1 và phát liên tục
    end
```

---

## 3. Luồng 3: Xuất Âm Thanh MP3 / ZIP Hàng Loạt (Audio Downloader)

```mermaid
flowchart TD
    A[Người dùng chọn các chương trong AudioDownloaderView] --> B[Chọn giọng đọc, tốc độ đọc 0.5x - 2.0x, định dạng ZIP/MP3]
    B --> C[Nhấn Bắt đầu xuất âm thanh]
    C --> D[audioExportService.ts: synthesizeChapterToMp3]
    
    D --> E[Lấy văn bản chương từ IndexedDB]
    E --> F[Tách thành các chunk chuẩn]
    F --> G[POST /api/audio/export-chapter với chunks và speed]
    
    G --> H[Backend tải Google TTS streams]
    H --> I[FFmpeg ghép stream & áp dụng filter atempo]
    I --> J[Tạo file MP3 chuẩn 128k 44.1kHz]
    
    J --> K{Định dạng xuất?}
    K -->|MP3 Riêng Lẻ| L[Lưu trực tiếp vào Download Store Backend]
    K -->|Gói ZIP| M[Client JSZip gom các file MP3 của từng chương]
    M --> N[Tạo file ZIP tổng]
    
    L --> O[Kích hoạt window download qua /api/download/file/:id]
    N --> O
    O --> P[File âm thanh lưu thành công về máy tính Windows]
```

---

## 4. Luồng 4: Lưu Trữ & Phục Hồi Dữ Liệu (Hybrid Storage Engine)

- **IndexedDB (`StoryTTS_IndexedDB_v2`)**: Chứa 2 object store chính: `books` (metadata) và `chapters` (nội dung chi tiết sách). Dung lượng không giới hạn, không bao giờ bị nghẽn quota 5MB.
- **In-Memory Cache (`memoryCache`)**: Lưu giữ mảng `books` và `chapters` đang mở trong RAM để đọc và render 60 FPS không có độ trễ I/O.
- **LocalStorage**: Lưu trữ cấu hình giao diện `lbook_settings`, từ điển phát âm `lbook_dictionaries`, dấu trang `lbook_bookmarks`, tiến trình đọc `lbook_progress` và migration token `lbook_library_cleaned_v6`.
- **Dọn dẹp thư viện an toàn (`StorageService.deleteAllBooks()`)**: Khi người dùng nhấn nút dọn dẹp trong Cài đặt, hệ thống chỉ xóa các store `books` và `chapters` trong IndexedDB và lịch sử đọc, **giữ nguyên 100% cấu hình giao diện, giọng đọc và phông chữ**.
