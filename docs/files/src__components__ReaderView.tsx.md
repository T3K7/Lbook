# Hồ Sơ Tệp: `src/components/ReaderView.tsx`

> **Đường dẫn nguồn**: `src/components/ReaderView.tsx`  
> **Module**: MOD-04 (Reader & Themes)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`ReaderView.tsx` là màn hình đọc sách toàn màn hình thông minh của Lbook. Tệp này chịu trách nhiệm:
1. Render toàn bộ văn bản của chương hiện tại theo từng đoạn `<p>` và từng câu `<span>`.
2. Bôi màu nổi bật (karaoke highlight) câu đang được TTS phát theo thời gian thực.
3. Cho phép người dùng nhấp chuột vào bất kỳ từ/câu nào để tua giọng đọc đến ngay vị trí đó mà không bị giật hay lặp tiếng.
4. Tự động cuộn trang (`autoScroll`) mượt mà giữ câu đang đọc ở vùng nhìn trung tâm.
5. Hiển thị thanh công cụ nổi ở chân trang: Phát/Dừng, Chuyển câu trước/sau, Đổi giọng đọc, Chỉnh tốc độ, Hẹn giờ tắt (Sleep Timer), Cài đặt phông chữ nhanh, và **Nút mũi tên tải xuống duy nhất** tích hợp chức năng tải file MP3 của chương hiện tại (kèm trạng thái loading %, checkmark hoàn tất và cảnh báo lỗi).
6. Cung cấp ngăn kéo (drawer) xem danh sách chương và tìm kiếm từ khóa trong chương.

---

## 2. Các Props & Tương tác cốt lõi

- `book`: Thông tin cuốn sách đang đọc (`Book`).
- `chapters`: Danh sách toàn bộ chương của sách.
- `currentChapterId`: ID chương hiện tại.
- `activeParagraphIndex`: Chỉ số đoạn văn đang đọc (do pipeline gửi về).
- `activeSentenceIndex`: Chỉ số câu đang đọc (do pipeline gửi về).
- `isPlaying`: Trạng thái đang phát hay đang dừng.
- `onJumpToPosition(paraIdx, sentIdx)`: Callback khi người dùng nhấp vào một câu để tua.
- `onSelectChapter(chapterId)`: Callback chuyển chương.

---

## 3. Các phụ thuộc (Dependencies)

- `GlobalAudioGuard` (`src/services/tts/globalAudioGuard.ts`): Đảm bảo ngắt tiếng câu cũ khi tua.
- `ProgressCoordinator` (`src/services/progressCoordinator.ts`): Cập nhật vị trí đọc.
- `VoiceSelectorModal`: Hộp thoại đổi giọng đọc nhanh.
- `src/design-system/ThemeContext.tsx`: Nhận theme và màu nền.

---

## 4. Tệp sử dụng `ReaderView.tsx`

- `src/App.tsx`: Hiển thị component này khi `currentView === 'reader'`.

---

## 5. Rủi ro & Hướng dẫn cho AI tiếp quản

- **Tối ưu hóa DOM khi chương dài**: Một chương có thể chứa hàng nghìn câu `<span>`. Tránh bind các hàm inline `onClick={() => ...}` tạo mới liên tục ở từng span. Nên dùng event delegation hoặc tối ưu memo để tránh giật lag khi cuộn trang.
- **AutoScroll**: Chỉ kích hoạt cuộn tự động khi câu đang đọc nằm ngoài vùng nhìn thoải mái (safe viewing zone) để không làm phiền người dùng khi họ đang chủ động lăn chuột đọc trước.
