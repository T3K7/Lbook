# Đặc Tả Module: Trình Đọc Truyện & Theme (MOD-04) — Lbook

> **Phạm vi**: Giao diện đọc sách toàn màn hình (`ReaderView.tsx`), công nghệ bôi màu karaoke realtime, tua vị trí phát và hệ thống hình nền nghệ thuật.

---

## 1. Thành phần cấu tạo Module

- **`src/components/ReaderView.tsx`**: Màn hình đọc sách thông minh.
- **`src/components/BackgroundArtwork.tsx`**: Thành phần hiển thị các hình nền nghệ thuật với lớp phủ tương phản (Scrim Overlay).
- **`src/design-system/ThemeContext.tsx`**: React Context cung cấp trạng thái theme (`light`, `dark`, `system`), hình nền được chọn, và hàm thay đổi theme.
- **`src/design-system/tokens.ts`**: Danh mục các hình nền nghệ thuật có sẵn và bảng màu đọc.

---

## 2. Công nghệ Bôi Màu Karaoke Realtime & Tua Câu Tức Thì

### 1. Đồng bộ câu đọc với âm thanh (Karaoke Sync)
Khi pipeline phát âm thanh, sự kiện `chunk_start` được gửi về component với `paragraphIndex` và `sentenceIndex`.
- Thẻ đoạn văn `<p>` và câu `<span>` tương ứng tự động nhận class `active-karaoke-sentence`.
- Màu bôi nổi bật: Xanh ngọc hoặc Vàng kim mờ dịu mắt tùy cấu hình, không gây chói.
- **Tự động cuộn thông minh (`autoScroll`)**: Màn hình tự động cuộn nhẹ nhàng để câu đang đọc luôn nằm trong vùng nhìn thoải mái ở giữa màn hình (smooth scroll with center boundary check).

### 2. Tua câu trực tiếp bằng 1 cú nhấp (Click to Seek)
Người dùng chỉ cần nhấp chuột vào bất kỳ từ hoặc câu nào trong văn bản:
1. `ReaderView` xác định `paragraphIndex` và `sentenceIndex` được nhấp.
2. Tìm chunk âm thanh tương ứng trong hàng đợi.
3. Kích hoạt `onJumpToPosition(paraIdx, sentIdx)`.
4. Gọi `GlobalAudioGuard.stopEverything()` để ngắt ngay câu cũ và phát câu mới lập tức không trễ.

---

## 3. Các bảng màu đọc sách chuyên dụng (Reading Palettes)

Ứng dụng cung cấp 6 bảng màu được tinh chỉnh quang học giúp chống mỏi mắt khi đọc lâu:

| Bảng màu | Nền | Màu chữ | Đặc điểm |
| :--- | :--- | :--- | :--- |
| **Light (Sáng)** | Kính trắng tinh khiết | Xanh đen sẫm `#070B14` | Độ tương phản cao, đọc ban ngày rõ nét |
| **Sepia (Giấy cổ)** | Vàng ngà hoài niệm | Nâu sẫm `#3E2723` | Giảm ánh sáng xanh, êm dịu cho mắt |
| **Dark (Đêm)** | Xanh đen Slate `#0F172A`| Trắng bạc `#F8FAFC` | Đọc ban đêm không gây chói lóa |
| **Black (OLED)** | Đen tuyệt đối `#000000` | Trắng `#FFFFFF` | Tiết kiệm pin tối đa cho màn hình OLED |
| **Nord (Băng tuyết)**| Xanh xám Bắc Âu | Xám sáng dịu | Phong cách hiện đại, thanh lịch |
| **Warm (Hoàng hôn)** | Cam đất ấm áp | Nâu đồng | Tạo cảm giác thư thái khi đọc truyện đêm |

---

## 4. Tùy biến kiểu chữ & Kích thước

Trong Cài đặt hoặc thanh nổi ở ReaderView, người dùng có thể điều chỉnh:
- **Phông chữ**: `Be Vietnam Pro` (Không chân hiện đại), `Source Serif 4` (Có chân cổ điển), `JetBrains Mono` (Đơn khoảng).
- **Cỡ chữ**: Thanh trượt từ 14px đến 28px.
- **Khoảng cách dòng (Line Height)**: Từ 1.4 đến 2.2.
- **Căn lề**: Căn đều 2 bên (Justify) hoặc Căn trái (Left-aligned).
- **Hẹn giờ tắt (Sleep Timer)**: 15 phút, 30 phút, 45 phút, 60 phút hoặc hết chương hiện tại.
