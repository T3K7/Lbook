# Hồ Sơ Tệp: `src/App.tsx`

> **Đường dẫn nguồn**: `src/App.tsx`  
> **Module**: Core Presentation & Orchestration  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15 (Đồng bộ số lượng sách `booksCount` và hàm `onClearLibrary` cho `SettingsView`)

---

## 1. Vai trò & Phạm vi trách nhiệm

`src/App.tsx` là component trung tâm (Master Orchestrator) của toàn bộ ứng dụng Lbook. Tệp này chịu trách nhiệm:
1. Quản lý trạng thái màn hình hiện tại (`currentView`).
2. Nạp dữ liệu ban đầu từ `StorageService` khi ứng dụng khởi động.
3. Đăng ký nhận sự kiện phát âm thanh từ `TtsAudioPipeline` (chunk đang đọc, chỉ số câu, tiến độ).
4. Điều phối liên lạc giữa thanh Sidebar, thanh điều khiển âm thanh chân trang (`TtsControlsBar`) và các Views nội dung.
5. Cập nhật tiến độ đọc định kỳ qua `ProgressCoordinator`.

---

## 2. Các State & Hook quan trọng

- `books`: Danh sách tác phẩm hiện có trong thư viện.
- `activeBookId`: ID của tác phẩm đang được chọn hoặc đang đọc.
- `currentChapterId`: ID của chương truyện đang mở.
- `currentView`: Màn hình đang kích hoạt (`library`, `book-detail`, `reader`, `audio-download`, `backup`, `settings`, `history`, `dictionary`, `benchmark`, `ai-models`).
- `pipelineRef`: Tham chiếu `useRef<TtsAudioPipeline>` duy nhất cho vòng đời ứng dụng.
- `settings`: Cấu hình toàn cục (Theme, phông chữ, giọng đọc, tốc độ, autoNextChapter).

---

## 3. Các phụ thuộc (Dependencies)

- **Import từ Services**:
  - `StorageService` (`src/services/storage.ts`): Đọc và ghi dữ liệu sách/chương.
  - `TtsAudioPipeline` (`src/services/tts/ttsAudioPipeline.ts`): Máy phát âm thanh.
  - `ProgressCoordinator` (`src/services/progressCoordinator.ts`): Lưu tiến độ đọc.
  - `GlobalAudioGuard` (`src/services/tts/globalAudioGuard.ts`): Master Mutex.
- **Import từ Components**:
  - `Sidebar`, `TtsControlsBar`, `BackgroundArtwork`, `VoiceSelectorModal`.
  - Các màn hình: `LibraryView`, `BookDetailView`, `ReaderView`, `AudioDownloaderView`, `SettingsView`, `BackupRestoreView`, v.v.

---

## 4. Tệp phụ thuộc vào `App.tsx`

- `src/main.tsx`: Entry point duy nhất render `<App />`.

---

## 5. Rủi ro & Lưu ý cho AI tiếp quản

- **Tránh re-render thừa**: Khi âm thanh phát, sự kiện `chunk_start` được gửi liên tục theo từng câu. Cần giữ các callback gọn nhẹ để tránh làm giật lag giao diện đọc.
- **Xử lý khi thư viện rỗng**: Khi `books` rỗng (ví dụ sau khi nhấn "Dọn sạch thư viện"), hàm `refreshAllData` đã được cấu hình để tự động reset `activeBookId = ''`, `currentChapterId = ''` và dừng pipeline âm thanh sạch sẽ.
