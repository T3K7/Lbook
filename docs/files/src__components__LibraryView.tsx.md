# Hồ Sơ Tệp: `src/components/LibraryView.tsx`

> **Đường dẫn nguồn**: `src/components/LibraryView.tsx`  
> **Module**: MOD-02 (Library Management)  
> **Trạng thái**: `VERIFIED`  
> **Cập nhật gần nhất**: 2026-10-15

---

## 1. Vai trò & Phạm vi trách nhiệm

`LibraryView.tsx` là màn hình quản lý kho truyện chính của Lbook. Tệp này chịu trách nhiệm:
1. Hiển thị danh sách toàn bộ các tác phẩm đã nạp vào ứng dụng.
2. Hỗ trợ 3 chế độ xem linh hoạt: **Danh sách (List)**, **Lưới bìa sách (Grid)** và **Rút gọn (Compact)**.
3. Bộ lọc và tìm kiếm nhanh theo tiêu đề hoặc tác giả.
4. Sắp xếp đa dạng: Mới thêm, Đọc gần đây, Tên A-Z, Số lượng chương, Lượt nghe, kèm nút đảo chiều Tăng/Giảm.
5. Vùng nạp sách (Import Zone): Hỗ trợ kéo thả hoặc chọn tệp `.txt`, `.epub`, `.pgp`, `.gpg`, `.zip`.
6. Xóa sách an toàn: Hộp thoại Modal xác nhận độc lập, cô lập sự kiện `e.stopPropagation()` để ngăn chặn lỗi click nhầm làm nhảy trang.

---

## 2. Các Props & State cốt lõi

- `books`: Danh sách tác phẩm (`Book[]`).
- `onOpenBook(bookId)`: Mở trang xem chi tiết tác phẩm (`BookDetailView`).
- `onQuickPlay(bookId)`: Phát nhanh tác phẩm từ vị trí đọc gần nhất.
- `onRefreshBooks()`: Làm mới danh sách sách sau khi nạp hoặc xóa.
- `searchQuery`: Chuỗi tìm kiếm tên sách / tác giả.
- `viewMode`: Chế độ hiển thị (`'grid'`, `'list'`, `'compact'`).
- `sortBy`: Tiêu chí sắp xếp (`'recent'`, `'title'`, `'chapters'`, `'listens'`, `'added'`).
- `sortOrder`: Thứ tự sắp xếp (`'asc'` hoặc `'desc'`).
- `deletingBookId`: ID cuốn sách đang chờ xác nhận xóa.

---

## 3. Các phụ thuộc (Dependencies)

- `TxtParser` (`src/services/txtParser.ts`): Bóc tách tệp văn bản.
- `EpubParser` (`src/services/epubParser.ts`): Bóc tách sách điện tử EPUB.
- `StorageService` (`src/services/storage.ts`): Lưu sách mới hoặc xóa sách.
- `Modal` (`src/components/ui/Modal.tsx`): Popup xác nhận xóa.
- `Button` (`src/components/ui/Button.tsx`): Nút thao tác.

---

## 4. Tệp sử dụng `LibraryView.tsx`

- `src/App.tsx`: Hiển thị component này khi `currentView === 'library'`.

---

## 5. Rủi ro & Lưu ý cho AI tiếp quản

- **Sự kiện nổi bọt (Event Bubbling)**: Khi người dùng nhấp vào nút menu 3 chấm, nút xóa hoặc nút nghe nhanh trên thẻ sách, **bắt buộc phải có `e.stopPropagation()`** để ngăn thẻ cha kích hoạt `onOpenBook()`.
- **Trạng thái rỗng (Empty State)**: Khi thư viện không có sách nào, hiển thị giao diện hướng dẫn nạp sách mới thân thiện, không báo lỗi.
