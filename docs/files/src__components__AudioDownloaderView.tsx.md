# Hồ Sơ Tệp: `src/components/AudioDownloaderView.tsx`

> **Đường dẫn nguồn**: `src/components/AudioDownloaderView.tsx`  
> **Module**: MOD-03 (Audio Downloader & Export)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15 (Sửa triệt để lỗi Light Mode tối thẫm theo BUG-001)

---

## 1. Vai trò & Phạm vi trách nhiệm

`AudioDownloaderView.tsx` là màn hình cho phép người dùng chọn các chương trong sách và xuất thành các file âm thanh MP3 hoặc gói nén ZIP để nghe offline trên điện thoại, máy tính hoặc máy nghe nhạc. Tệp này chịu trách nhiệm:
1. Hiển thị thanh Header gọn gàng với menu dropdown kính mờ chọn tác phẩm cần xuất.
2. Cung cấp thanh công cụ chọn chương nhanh: Chọn tất cả, Bỏ chọn, 10 chương đầu, 50 chương đầu, +10 chương kế tiếp, và thanh nhập khoảng từ/đến.
3. Cho phép chọn giọng đọc, tốc độ đọc (0.5x - 2.0x), định dạng ZIP / MP3 riêng và tìm kiếm chương theo từ khóa.
4. Hiển thị danh sách chương với trạng thái (chưa tải, đang xử lý %, đã xong, lỗi), nút nghe thử và nút tải riêng từng chương.
5. Hiển thị thanh tóm tắt ở chân trang và nút kích hoạt xuất âm thanh lớn.

---

## 2. Các State nội bộ quan trọng

- `selectedBookId`: ID cuốn sách đang được chọn để tải âm thanh.
- `selectedChapterIds`: `Set<string>` chứa danh sách ID các chương được đánh dấu tick.
- `chapterStates`: Bản đồ `Record<string, ChapterExportState>` lưu tiến độ và blob âm thanh của từng chương.
- `selectedVoice`: Giọng đọc được chọn (mặc định Google Tiếng Việt).
- `selectedRate`: Tốc độ đọc (mặc định 1.0x).
- `exportFormat`: Định dạng xuất (`'zip'` hoặc `'individual'`).
- `isGenerating`: Cờ đánh dấu đang trong tiến trình xuất hàng loạt.
- `batchProgress`: Tiến độ tổng thể (số chương đã xong / tổng số, % tổng thể).

---

## 3. Các phụ thuộc (Dependencies)

- `AudioExportService` (`src/services/audioExportService.ts`): Thực thi logic xuất âm thanh.
- `StorageService` (`src/services/storage.ts`): Nạp danh sách chương của sách được chọn.
- `VIETNAMESE_VOICE_CATALOG` (`VoiceSelectorModal.tsx`): Danh mục giọng đọc tiếng Việt.
- `Button` (`src/components/ui/Button.tsx`): Nút bấm chuẩn giao diện kính.
- `useTranslation` (`src/i18n`): Đa ngôn ngữ tiếng Việt và tiếng Anh.

---

## 4. Tệp sử dụng `AudioDownloaderView.tsx`

- `src/App.tsx`: Hiển thị component này khi `currentView === 'audio-download'`.

---

## 5. Lưu ý kỹ thuật sau khi sửa BUG-001

- **Tuyệt đối tuân thủ token Glassmorphism**: Không bao giờ thêm lại các class cố định như `bg-slate-900`, `text-slate-200` vào component này. Mọi lớp nền phải dùng `var(--glass-bg-...)`, `var(--text-...)`, và `var(--accent-...)` để bảo đảm giao diện thích ứng mượt mà ở cả Light Mode và Dark Mode.
- **Nút tải khi bị vô hiệu hóa**: Sử dụng `disabled:opacity-50`, chữ trắng trên nền xanh ngọc dịu nhẹ, đảm bảo người dùng nhìn rõ trạng thái vô hiệu hóa nhưng chữ không bị đen tối khó đọc.
