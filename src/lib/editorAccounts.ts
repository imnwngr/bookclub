export const accountMessages: Record<string, string> = {
  session_expired:
    "Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi kiểm tra trạng thái tài khoản.",
  admin_required: "Chỉ Admin đang có quyền mới được thêm tài khoản.",
  invalid_email: "Nhập địa chỉ email hợp lệ.",
  invalid_request: "Yêu cầu không hợp lệ. Tải lại trang rồi thử lại.",
  role_refused:
    "Không thể thay đổi quyền. Tải lại danh sách để kiểm tra quyền hiện tại.",
  role_changed:
    "Quyền đã được thu hồi sau yêu cầu này. Yêu cầu cũ không cấp lại quyền. Đóng hộp thoại và bắt đầu thao tác mới nếu muốn thêm lại tài khoản.",
  operation_mode_missing:
    "Chức năng tài khoản chưa được cấu hình trên máy chủ.",
  configuration_missing: "Máy chủ chưa đủ cấu hình quản lý tài khoản.",
  backend_not_ready:
    "Backend quản lý tài khoản chưa sẵn sàng. Chưa xác nhận thay đổi quyền.",
  invitation_not_ready:
    "Email này chưa có tài khoản và chức năng gửi lời mời đang tắt. Chưa tạo tài khoản hoặc gửi email. Bạn vẫn có thể thêm tài khoản đã tồn tại.",
  processing:
    "Yêu cầu đang được xử lý. Chờ một lát rồi kiểm tra lại; hệ thống không gửi email lần nữa.",
  delivery_unknown:
    "Chưa xác nhận được kết quả gửi lời mời. Hệ thống sẽ không tự gửi lại. Kiểm tra tài khoản để khôi phục; nếu chưa có tài khoản, cần quản trị hệ thống đối chiếu log email.",
  grant_failed:
    "Chưa cấp được quyền Editor. Tài khoản hoặc lời mời có thể đã được tạo. Kiểm tra và khôi phục sẽ không gửi thêm email.",
  outcome_unknown:
    "Kết quả chưa xác định do gián đoạn kết nối. Kiểm tra và khôi phục trước khi tiếp tục; không tự gửi thêm email.",
  request_failed:
    "Không nhận được kết quả. Kiểm tra trạng thái tài khoản rồi thử khôi phục.",
  account_ineligible:
    "Tài khoản đang bị cấm hoặc không đủ điều kiện nhận quyền.",
  admin_protected:
    "Email này đã có quyền Admin và được bảo vệ. Không thay đổi quyền.",
  ambiguous_account:
    "Email khớp nhiều tài khoản. Cần quản trị hệ thống kiểm tra.",
  fixture_only:
    "Môi trường kiểm thử chỉ cho phép tài khoản fixture đã cấu hình.",
  client_upgrade_required: "Tải lại trang để dùng luồng thêm tài khoản mới.",
};
export function accountResultMessage(state: string, status?: string) {
  if (state === "already_editor")
    return status === "invited"
      ? "Tài khoản đã có quyền Editor, đang chờ nhận lời mời. Không gửi thêm email."
      : status === "unconfirmed"
        ? "Tài khoản đã có quyền Editor nhưng chưa xác nhận email. Cần kiểm tra cách đăng nhập."
        : "Tài khoản đã có quyền Editor. Không thay đổi quyền hoặc gửi email.";
  if (status === "invited")
    return "Đã cấp quyền Editor, đang chờ người nhận hoàn tất lời mời qua email.";
  if (status === "unconfirmed")
    return "Đã cấp quyền Editor, nhưng tài khoản chưa xác nhận email. Cần quản trị hệ thống hỗ trợ xác nhận hoặc khôi phục đăng nhập.";
  return "Đã cấp quyền Editor cho tài khoản hiện có.";
}
