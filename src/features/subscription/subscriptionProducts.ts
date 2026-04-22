export const APLUS_PRO_PRODUCT_ID = 'aplus_pro';

export const APLUS_PRO_BASE_PLAN_IDS = {
  monthly: 'aplus_pro_monthly',
  yearly: 'aplus_pro_yearly',
} as const;

export type AplusProPlanKey = keyof typeof APLUS_PRO_BASE_PLAN_IDS;

export type AplusProPaywallReason =
  | 'rename_player'
  | 'change_flag'
  | 'change_logo'
  | 'camera'
  | 'livestream'
  | 'youtube'
  | 'facebook';

export type AplusProPlan = {
  key: AplusProPlanKey;
  productId: string;
  basePlanId: string;
  title: string;
  subtitle: string;
  formattedPrice: string;
  billingPeriodLabel: string;
  badge?: string;
  offerToken?: string;
  offerId?: string;
  offerTags?: string[];
  isTrialOffer?: boolean;
};

export const APLUS_PRO_DEFAULT_PLANS: Record<AplusProPlanKey, AplusProPlan> = {
  monthly: {
    key: 'monthly',
    productId: APLUS_PRO_PRODUCT_ID,
    basePlanId: APLUS_PRO_BASE_PLAN_IDS.monthly,
    title: 'Gói tháng',
    subtitle: 'Linh hoạt theo từng tháng',
    formattedPrice: '3.99 USD',
    billingPeriodLabel: '/ tháng',
  },
  yearly: {
    key: 'yearly',
    productId: APLUS_PRO_PRODUCT_ID,
    basePlanId: APLUS_PRO_BASE_PLAN_IDS.yearly,
    title: 'Gói năm',
    subtitle: 'Tối ưu chi phí cho mùa giải dài',
    formattedPrice: '30.99 USD',
    billingPeriodLabel: '/ năm',
    badge: 'Tiết kiệm hơn',
  },
};

export const APLUS_PRO_FEATURES = [
  'Đổi tên người chơi',
  'Đổi cờ quốc gia',
  'Đổi logo thumbnail',
  'Sử dụng camera',
  'Livestream YouTube/Facebook',
  'Hiển thị overlay chuyên nghiệp trong camera/livestream',
];

export const APLUS_PRO_REASON_LABEL: Record<AplusProPaywallReason, string> = {
  rename_player: 'Tính năng đổi tên người chơi thuộc Aplus Pro.',
  change_flag: 'Tính năng đổi cờ quốc gia thuộc Aplus Pro.',
  change_logo: 'Tính năng đổi logo thumbnail thuộc Aplus Pro.',
  camera: 'Camera thi đấu thuộc Aplus Pro.',
  livestream: 'Livestream chuyên nghiệp thuộc Aplus Pro.',
  youtube: 'Livestream YouTube thuộc Aplus Pro.',
  facebook: 'Livestream Facebook thuộc Aplus Pro.',
};
