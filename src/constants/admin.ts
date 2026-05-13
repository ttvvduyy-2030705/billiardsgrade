export type AdminLoginResult = {
  ok: boolean;
  message: string;
};

export const verifyLocalAdminAccount = (): AdminLoginResult => {
  return {
    ok: false,
    message:
      'Không có tài khoản Admin mặc định. Hãy đăng ký tài khoản Admin hoặc đăng nhập bằng tài khoản đã tạo.',
  };
};
