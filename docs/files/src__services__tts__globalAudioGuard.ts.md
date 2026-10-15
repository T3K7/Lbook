# Hồ Sơ Tệp: `src/services/tts/globalAudioGuard.ts`

> **Đường dẫn nguồn**: `src/services/tts/globalAudioGuard.ts`  
> **Module**: MOD-01 (TTS Subsystem)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`globalAudioGuard.ts` là **Master Mutex độc quyền** của toàn bộ ứng dụng Lbook. Tệp này có một nhiệm vụ duy nhất nhưng tối quan trọng: **Đảm bảo tại bất kỳ thời điểm nào, chỉ có duy nhất 1 luồng âm thanh được phép phát trên toàn bộ ứng dụng**.

Nó ngăn chặn triệt để các lỗi nghiêm trọng sau:
1. Tiếng đọc truyện trong ReaderView nói đè lên tiếng nghe thử trong VoiceSelectorModal.
2. Tiếng của câu cũ tiếp tục phát khi người dùng vừa nhấp chuột tua sang câu mới.
3. Âm thanh Web Speech API chạy song song cùng lúc với stream audio MP3 của Google TTS.

---

## 2. Các hàm & Export quan trọng

- `class GlobalAudioGuard`:
  - `getInstance()`: Trả về thể hiện Singleton duy nhất.
  - `registerAudio(element: HTMLAudioElement)`: Đăng ký một đối tượng Audio vào tầm kiểm soát của Guard.
  - `unregisterAudio(element: HTMLAudioElement)`: Hủy đăng ký khi component unmount.
  - `stopEverything()`: **Hàm hủy toàn diện**. Lập tức dừng tất cả Audio elements đã đăng ký, gán `src = ''`, gọi `.load()` giải phóng buffer, gọi `window.speechSynthesis.cancel()`, và tăng số phiên `epochToken++`.
  - `getEpochToken()`: Trả về mã phiên hiện tại để các tác vụ async kiểm tra xem mình có bị hủy hay chưa.

---

## 3. Các phụ thuộc (Dependencies)

- Trình duyệt DOM API: `HTMLAudioElement`, `window.speechSynthesis`.
- Zero external dependencies: Tệp hoàn toàn độc lập, không phụ thuộc vào bất kỳ thư viện hay React components nào.

---

## 4. Tệp sử dụng `globalAudioGuard.ts`

- `src/services/tts/ttsAudioPipeline.ts`: Gọi `stopEverything()` trước khi nạp câu mới hoặc tua vị trí.
- `src/services/tts/audioPreviewManager.ts`: Gọi `stopEverything()` trước khi phát nghe thử giọng.
- `src/components/VoiceSelectorModal.tsx`: Đảm bảo đóng modal là tắt tiếng ngay.

---

## 5. Hướng dẫn cho AI tiếp quản

- Bất cứ khi nào bạn viết một component hoặc hàm mới có phát sinh âm thanh (`new Audio()` hoặc `speechSynthesis.speak()`), **bắt buộc phải đăng ký đối tượng Audio đó vào `GlobalAudioGuard`** và gọi `stopEverything()` trước khi `play()`.
