import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;
export function db() {
  if (!supabase)
    throw new Error(
      "Chưa cấu hình kết nối dữ liệu. Vui lòng liên hệ ban quản trị.",
    );
  return supabase;
}
export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "invalid_credentials")
      return "Email hoặc mật khẩu không đúng.";
    if (code === "email_not_confirmed")
      return "Email chưa được xác nhận. Vui lòng liên hệ ban quản trị.";
    if (code === "over_request_rate_limit")
      return "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.";
    if (code === "23503")
      return "Không thể xóa alias chính hoặc dữ liệu còn được sử dụng.";
    if (code === "23505")
      return "Mã sự kiện hoặc alias đã được sử dụng. Vui lòng chọn giá trị khác.";
    if (code === "42501" || code === "PGRST301")
      return "Bạn không có quyền thực hiện hoặc phiên đăng nhập đã hết hạn.";
    if (code === "40001")
      return "Sự kiện đã được cập nhật ở nơi khác. Tải lại trang trước khi lưu.";
  }
  return error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "Không thể hoàn tất thao tác. Vui lòng thử lại.";
}
