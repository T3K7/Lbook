# Sổ Theo Dõi Nhiệm Vụ (Task Registry) — Lbook

> **Mục tiêu**: Theo dõi các nhiệm vụ kỹ thuật của dự án bằng mã định danh ổn định (`TASK-xxx`) và các trạng thái chuẩn hóa.

---

## 1. Trạng thái chuẩn hóa

- `TODO`: Đã xác định nhưng chưa bắt đầu thực hiện.
- `IN_PROGRESS`: Đang trong quá trình triển khai.
- `BLOCKED`: Đang bị chặn bởi phụ thuộc kỹ thuật hoặc tài nguyên bên ngoài.
- `DONE`: Đã hoàn thành và đã kiểm thử thành công.
- `NEEDS_VERIFICATION`: Đã có code nhưng cần kiểm tra lại trên môi trường thực tế.

---

## 2. Bảng tổng hợp các nhiệm vụ

| Mã Task | Tên Nhiệm Vụ & Mục Tiêu | Module liên quan | Trạng thái | Chi tiết nhiệm vụ |
| :--- | :--- | :--- | :--- | :--- |
| **`TASK-001`** | **Xây dựng hệ thống tài liệu kỹ thuật & bàn giao AI** | Toàn bộ dự án | `DONE` | [`tasks/TASK-001.md`](./tasks/TASK-001.md) |
| **`TASK-002`** | **Sửa lỗi hiển thị tối trong Light Mode ở trang Tải âm thanh** | MOD-03 (Export) | `DONE` | [`bugs/BUG-001.md`](./bugs/BUG-001.md) |
| **`TASK-003`** | **Làm sạch dữ liệu truyện & bảo vệ an toàn cài đặt cá nhân** | MOD-02 (Storage) | `DONE` | [`files/src__services__storage.ts.md`](./files/src__services__storage.ts.md) |
| **`TASK-004`** | **Cập nhật hiển thị phiên bản footer Sidebar thành v0.01** | Core Presentation | `DONE` | [`files/src__App.tsx.md`](./files/src__App.tsx.md) |
| **`TASK-005`** | **Kiểm thử và tích hợp mô hình AI VinaTTS Offline** | MOD-01 (TTS) | `TODO` | Sẽ lập hồ sơ khi có binary |
| **`TASK-006`** | **Tối ưu hóa quản lý bộ nhớ đệm khi tải trên 500 chương** | MOD-03 (Export) | `TODO` | Hàng đợi batch streaming |
| **`TASK-007`** | **Sửa lỗi thư viện trống khi mở nhiều cửa sổ Lbook (BUG-005)** | MOD-02 / Desktop | `DONE` | [`bugs/BUG-005.md`](./bugs/BUG-005.md) |

---

## 3. Quy trình cập nhật nhiệm vụ

1. Khi bắt đầu làm việc, chuyển trạng thái từ `TODO` sang `IN_PROGRESS`.
2. Khi hoàn thành, chạy kiểm thử thực tế và ghi lại bằng chứng kiểm thử trước khi chuyển sang `DONE`.
3. Nếu nội dung mô tả của một nhiệm vụ dài hơn 30 dòng, hãy chuyển chi tiết sang thư mục [`docs/tasks/`](./tasks/) dưới tên `TASK-xxx.md`.
