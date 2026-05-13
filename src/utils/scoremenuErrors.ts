import {clearRestaurantAdminSession} from 'services/restaurantAdminAuthService';
import {devModuleWarn, type DevLogModule} from './devLogger';

export type ScoreMenuErrorKind =
  | 'QR_INVALID'
  | 'TABLE_INVALID'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SERVER'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'UNKNOWN';

export type ScoreMenuErrorContext = {
  module: DevLogModule;
  action: string;
  qrToken?: string;
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  tableNumber?: string;
  orderId?: string;
  requestId?: string;
  extra?: Record<string, unknown>;
};

type ApiLikeError = Error & {
  code?: string;
  status?: number;
  details?: unknown;
};

const isApiLikeError = (error: unknown): error is ApiLikeError => {
  return Boolean(error && typeof error === 'object');
};

const includesAny = (value: string, patterns: string[]) => {
  const lowered = value.toLowerCase();
  return patterns.some(pattern => lowered.includes(pattern));
};

export const classifyScoreMenuError = (error: unknown): ScoreMenuErrorKind => {
  if (!isApiLikeError(error)) {
    return 'UNKNOWN';
  }

  const status = Number(error.status || 0);
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();

  if (code === 'TIMEOUT') {
    return 'TIMEOUT';
  }
  if (code === 'NETWORK_ERROR' || includesAny(message, ['network', 'kết nối', 'offline'])) {
    return 'NETWORK';
  }
  if (status === 401 || code === 'UNAUTHORIZED') {
    return 'UNAUTHORIZED';
  }
  if (status === 403 || code === 'FORBIDDEN') {
    return 'FORBIDDEN';
  }
  if (status >= 500 || code === 'SERVER_ERROR') {
    return 'SERVER';
  }
  if (status === 429 || code === 'RATE_LIMIT') {
    return 'RATE_LIMIT';
  }
  if (
    status === 404 ||
    includesAny(message, ['qr', 'mã qr', 'token', 'không tìm thấy menu'])
  ) {
    return 'QR_INVALID';
  }
  if (includesAny(message, ['bàn', 'table'])) {
    return 'TABLE_INVALID';
  }
  if (status === 400 || status === 409 || status === 422 || code === 'VALIDATION_ERROR') {
    return 'VALIDATION';
  }

  return 'UNKNOWN';
};

export const getScoreMenuErrorMessage = (
  error: unknown,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.',
) => {
  const kind = classifyScoreMenuError(error);
  const originalMessage = error instanceof Error ? error.message : '';

  switch (kind) {
    case 'QR_INVALID':
      return originalMessage || 'QR menu không hợp lệ, đã bị khóa hoặc không tồn tại. Vui lòng quét lại QR của quán.';
    case 'TABLE_INVALID':
      return originalMessage || 'Số bàn không hợp lệ hoặc không thuộc chi nhánh này. Vui lòng chọn/nhập lại bàn.';
    case 'NETWORK':
      return 'Không thể kết nối backend/menu server. Kiểm tra mạng hoặc thử lại sau.';
    case 'TIMEOUT':
      return 'Kết nối menu server quá lâu. Vui lòng thử lại.';
    case 'UNAUTHORIZED':
      return 'Phiên đăng nhập Admin đã hết hạn. Vui lòng đăng nhập lại.';
    case 'FORBIDDEN':
      return originalMessage || 'Tài khoản hiện tại không có quyền thao tác dữ liệu này.';
    case 'SERVER':
      return originalMessage || 'Server menu đang lỗi. Vui lòng thử lại sau.';
    case 'VALIDATION':
      return originalMessage || 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.';
    case 'RATE_LIMIT':
      return originalMessage || 'Bạn gửi yêu cầu quá nhanh. Vui lòng chờ vài phút rồi thử lại.';
    case 'UNKNOWN':
    default:
      return originalMessage || fallback;
  }
};

export const shouldKeepCartOnSubmitError = (error: unknown) => {
  const kind = classifyScoreMenuError(error);
  return kind === 'NETWORK' || kind === 'TIMEOUT' || kind === 'SERVER' || kind === 'TABLE_INVALID' || kind === 'VALIDATION' || kind === 'RATE_LIMIT';
};

export const isAuthExpiredError = (error: unknown) => {
  return classifyScoreMenuError(error) === 'UNAUTHORIZED';
};

export const clearAdminSessionIfUnauthorized = async (error: unknown) => {
  if (!isAuthExpiredError(error)) {
    return false;
  }

  await clearRestaurantAdminSession().catch(() => undefined);
  return true;
};

export const logScoreMenuError = (
  context: ScoreMenuErrorContext,
  error: unknown,
) => {
  const kind = classifyScoreMenuError(error);
  const apiLike = isApiLikeError(error) ? error : undefined;

  devModuleWarn(context.module, context.action, {
    kind,
    message: error instanceof Error ? error.message : String(error || ''),
    status: apiLike?.status,
    code: apiLike?.code,
    qrToken: context.qrToken,
    restaurantId: context.restaurantId,
    branchId: context.branchId,
    tableId: context.tableId,
    tableNumber: context.tableNumber,
    orderId: context.orderId,
    requestId: context.requestId,
    ...(context.extra || {}),
  });
};
