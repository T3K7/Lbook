# Hồ Sơ Tệp: `src/services/audioExportService.ts`

> **Đường dẫn nguồn**: `src/services/audioExportService.ts`  
> **Module**: MOD-03 (Audio Downloader & Export)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`src/services/audioExportService.ts` là dịch vụ điều phối xuất âm thanh chất lượng cao phía client của Lbook. Tệp này chịu trách nhiệm:
1. Lấy nội dung chi tiết của từng chương từ `StorageService`.
2. Áp dụng tiền xử lý từ điển (`textPreprocessor.ts`) và chia nhỏ thành các chunk âm thanh chuẩn (`chunker.ts`).
3. Gửi yêu cầu tổng hợp âm thanh sang backend Express qua endpoint `POST /api/audio/export-chapter`.
4. Nhận kết quả Buffer MP3 và theo dõi tiến độ từng chương (`ChapterProgressInfo`).
5. Nếu người dùng chọn định dạng ZIP: Gom các file MP3 vào bộ nhớ và nén thành gói ZIP bằng thư viện `JSZip`.
6. Kích hoạt lưu file về máy tính Windows thông qua `triggerDownload()`.

---

## 2. Các hàm & Export quan trọng

- `class AudioExportService`:
  - `synthesizeChapterToMp3(chapter, options, rules, onProgress)`: Tổng hợp toàn bộ một chương thành file MP3 với tốc độ và cao độ chính xác (ưu tiên gọi backend FFmpeg `/api/audio/export-chapter`, fallback tổng hợp client-side).
  - `bundleChaptersToZip(bookTitle, items, rate, onZipProgress)`: Gom mảng các Blob MP3 của từng chương và nén thành một tệp `.zip` duy nhất thông qua `JSZip`.
  - `triggerDownload(blob, filename, existingUrl)`: Kích hoạt tải file xuống máy tính Windows (ưu tiên tải URL server, fallback đăng ký file qua `/api/download/prepare`, hoặc Blob URL dài hạn 5 phút).
  - `clearCache()`: Xóa sạch bộ nhớ đệm chunk audio và chapter audio trong RAM, giải phóng Blob URL.

---

## 3. Các phụ thuộc (Dependencies)

- `jszip`: Thư viện tạo file ZIP client-side.
- `StorageService` (`src/services/storage.ts`): Nạp dữ liệu chương.
- `Chunker` (`src/services/chunker.ts`): Chia văn bản thành các đoạn ~240 ký tự.
- `TextPreprocessor` (`src/services/textPreprocessor.ts`): Áp dụng từ điển.
- Backend API (`/api/audio/export-chapter`, `/api/download/prepare`).

---

## 4. Tệp sử dụng `audioExportService.ts`

- `src/components/AudioDownloaderView.tsx`: Màn hình giao diện duy nhất gọi các phương thức của `AudioExportService`.

---

## 5. Rủi ro & Lưu ý cho AI tiếp quản

- **Giới hạn bộ nhớ RAM với file ZIP lớn**: Nếu người dùng xuất hàng trăm chương cùng lúc, việc giữ tất cả Buffer trong RAM trước khi nén ZIP có thể chiếm 200MB - 500MB bộ nhớ. Khi cần tối ưu trong tương lai, nên chia thành các đợt nhỏ hoặc nén trực tiếp trên backend.
- **Tên file an toàn**: Luôn dùng hàm chuẩn hóa tên file tiếng Việt để tránh các ký tự đặc biệt gây lỗi hệ thống tệp Windows.
