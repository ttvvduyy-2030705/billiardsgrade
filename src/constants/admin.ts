export type AdminLoginResult = {
  ok: boolean;
  message: string;
};

export const verifyLocalAdminAccount = (): AdminLoginResult => {
  return {
    ok: false,
    message:
      'Tài khoản Admin test nội bộ đã được tắt. Hãy đăng ký tài khoản Admin local hoặc đăng nhập bằng tài khoản đã tạo.',
  };
};
