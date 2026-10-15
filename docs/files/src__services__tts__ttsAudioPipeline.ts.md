# Hồ Sơ Tệp: `src/services/tts/ttsAudioPipeline.ts`

> **Đường dẫn nguồn**: `src/services/tts/ttsAudioPipeline.ts`  
> **Module**: MOD-01 (TTS Subsystem)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`ttsAudioPipeline.ts` là trái tim điều khiển phát âm thanh của toàn bộ ứng dụng Lbook. Tệp này chịu trách nhiệm:
1. Duy trì hàng đợi các đoạn âm thanh (`TtsChunk[]`) của chương hiện tại.
2. Quản lý trạng thái phát (`idle`, `processing`, `ready`, `playing`, `paused`, `completed`).
3. Tải trước các đoạn âm thanh tiếp theo (`prefetchWindow = 3`) về bộ nhớ để bảo đảm chuyển câu không có độ trễ.
4. Điều khiển phần tử `HTMLAudioElement` hoặc Web Speech API.
5. Phát sự kiện `chunk_start` để giao diện `ReaderView` bôi màu karaoke theo từng câu.
6. Tự động chuyển và phát tiếp chương sau khi kết thúc chương hiện tại (`autoNextChapter`).

---

## 2. Các hàm & Phương thức cốt lõi

- `class TtsAudioPipeline`:
  - `loadChapter(chapter, options)`: Nạp chương mới vào pipeline, phân tích chunks và bắt đầu prefetch.
  - `play()`: Bắt đầu phát từ chunk hiện tại.
  - `pause()`: Tạm dừng phát âm thanh.
  - `resume()`: Tiếp tục phát từ vị trí đang dừng.
  - `stop()`: Dừng hoàn toàn và giải phóng tài nguyên.
  - `seekChunk(index)`: Tua đến chunk cụ thể, hủy bỏ âm thanh đang phát ngay lập tức.
  - `updateSettings(settings)`: Cập nhật tốc độ, giọng đọc và cửa sổ prefetch.
  - `subscribe(listener)`: Đăng ký nhận thông báo sự kiện phát âm thanh.
  - `getCacheStats()`: Lấy số liệu thống kê hit rate của bộ nhớ đệm audio.

---

## 3. Các phụ thuộc (Dependencies)

- `GlobalAudioGuard` (`src/services/tts/globalAudioGuard.ts`): Master Mutex dừng mọi âm thanh cũ.
- `GoogleTtsProvider` (`src/services/tts/googleTtsProvider.ts`): Stream Google TTS.
- `EdgeOnlineTtsProvider` (`src/services/tts/edgeOnlineTtsProvider.ts`): Stream Edge TTS.
- `BrowserTtsProvider` (`src/services/tts/browserTtsProvider.ts`): Web Speech Synthesis.
- `Chunker` (`src/services/chunker.ts`): Tạo danh sách chunks từ chương.

---

## 4. Tệp sử dụng `ttsAudioPipeline.ts`

- `src/App.tsx`: Khởi tạo và nắm giữ tham chiếu `pipelineRef`.
- `src/components/ReaderView.tsx`: Tương tác tua câu và điều khiển âm thanh.
- `src/components/TtsControlsBar.tsx`: Thanh điều khiển âm thanh dock dưới đáy màn hình.

---

## 5. Rủi ro & Lưu ý cho AI tiếp quản

- **Độc lập phiên phát (`activeSessionId`)**: Trong các hàm bất đồng bộ, luôn kiểm tra `if (this.currentSessionId !== sessionId) return;` trước khi gán audio để tránh phát đè khi người dùng nhấp tua nhanh.
