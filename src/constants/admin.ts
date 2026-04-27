export const ADMIN_TEST_USERNAME = 'admin';
export const ADMIN_TEST_PASSWORD = '123456';

export type AdminLoginResult = {
  ok: boolean;
  message: string;
};

export const verifyLocalAdminAccount = (
  username: string,
  password: string,
): AdminLoginResult => {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: 'Vui lòng nhập tài khoản và mật khẩu Admin'};
  }

  if (cleanUsername !== ADMIN_TEST_USERNAME || cleanPassword !== ADMIN_TEST_PASSWORD) {
    return {ok: false, message: 'Tài khoản hoặc mật khẩu Admin chưa đúng'};
  }

  return {ok: true, message: 'Đăng nhập Admin thành công'};
};
