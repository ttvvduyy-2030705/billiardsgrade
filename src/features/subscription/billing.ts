import {NativeModules, Platform} from 'react-native';
import {
  APLUS_PRO_BASE_PLAN_IDS,
  APLUS_PRO_DEFAULT_PLANS,
  APLUS_PRO_PRODUCT_ID,
  AplusProPlan,
  AplusProPlanKey,
} from './subscriptionProducts';

export type NativeAplusBillingPlan = {
  productId?: string;
  basePlanId?: string;
  offerId?: string;
  offerToken?: string;
  offerTags?: string[];
  formattedPrice?: string;
  billingPeriod?: string;
  priceAmountMicros?: number;
  priceCurrencyCode?: string;
  title?: string;
  name?: string;
  isTrialOffer?: boolean;
};

export type NativeAplusBillingEntitlement = {
  isAvailable?: boolean;
  isActive?: boolean;
  productId?: string;
  purchaseToken?: string;
  purchaseState?: string;
  isAcknowledged?: boolean;
  debugMessage?: string;
  errorCode?: string | number;
  plans?: NativeAplusBillingPlan[];
};

type NativeBillingModule = {
  initialize?: () => Promise<NativeAplusBillingEntitlement>;
  queryProducts?: () => Promise<NativeAplusBillingEntitlement>;
  launchPurchase?: (
    productId: string,
    basePlanId: string,
    preferTrialOffer: boolean,
    obfuscatedAccountId?: string,
  ) => Promise<NativeAplusBillingEntitlement>;
  restorePurchases?: () => Promise<NativeAplusBillingEntitlement>;
};

const NativeAplusBillingModule = NativeModules.AplusBillingModule as
  | NativeBillingModule
  | undefined;

const mapBillingPeriodLabel = (billingPeriod?: string, key?: AplusProPlanKey) => {
  if (billingPeriod === 'P1Y') {
    return '/ năm';
  }

  if (billingPeriod === 'P1M') {
    return '/ tháng';
  }

  return key === 'yearly' ? '/ năm' : '/ tháng';
};

const toPlanKey = (basePlanId?: string): AplusProPlanKey | null => {
  if (basePlanId === APLUS_PRO_BASE_PLAN_IDS.monthly) {
    return 'monthly';
  }

  if (basePlanId === APLUS_PRO_BASE_PLAN_IDS.yearly) {
    return 'yearly';
  }

  return null;
};

export const normalizeAplusProPlans = (
  nativePlans?: NativeAplusBillingPlan[],
): Record<AplusProPlanKey, AplusProPlan> => {
  const nextPlans: Record<AplusProPlanKey, AplusProPlan> = {
    monthly: {...APLUS_PRO_DEFAULT_PLANS.monthly},
    yearly: {...APLUS_PRO_DEFAULT_PLANS.yearly},
  };

  (nativePlans || []).forEach(nativePlan => {
    const key = toPlanKey(nativePlan.basePlanId);
    if (!key) {
      return;
    }

    const fallback = nextPlans[key];
    const isTrialOffer = !!nativePlan.isTrialOffer;

    // Keep a paid/base-plan card as the visible price. Trial offers are used by
    // the dedicated trial button, not to overwrite the paid plan price.
    if (isTrialOffer && fallback.offerToken) {
      return;
    }

    nextPlans[key] = {
      ...fallback,
      productId: nativePlan.productId || APLUS_PRO_PRODUCT_ID,
      basePlanId: nativePlan.basePlanId || fallback.basePlanId,
      formattedPrice: nativePlan.formattedPrice || fallback.formattedPrice,
      billingPeriodLabel: mapBillingPeriodLabel(nativePlan.billingPeriod, key),
      offerToken: nativePlan.offerToken,
      offerId: nativePlan.offerId,
      offerTags: nativePlan.offerTags,
      isTrialOffer,
    };
  });

  return nextPlans;
};

const unavailable = (debugMessage: string): NativeAplusBillingEntitlement => ({
  isAvailable: false,
  isActive: false,
  productId: APLUS_PRO_PRODUCT_ID,
  debugMessage,
});

export const isGooglePlayBillingAvailable = () => {
  return Platform.OS === 'android' && !!NativeAplusBillingModule;
};

export const initializeAplusBilling = async () => {
  if (!isGooglePlayBillingAvailable() || !NativeAplusBillingModule?.initialize) {
    return unavailable('AplusBillingModule is not available on this build.');
  }

  return NativeAplusBillingModule.initialize();
};

export const queryAplusProProducts = async () => {
  if (!isGooglePlayBillingAvailable() || !NativeAplusBillingModule?.queryProducts) {
    return unavailable('AplusBillingModule queryProducts is not available.');
  }

  return NativeAplusBillingModule.queryProducts();
};

export const purchaseAplusProPlan = async (
  planKey: AplusProPlanKey,
  preferTrialOffer = false,
  obfuscatedAccountId?: string,
) => {
  if (!isGooglePlayBillingAvailable() || !NativeAplusBillingModule?.launchPurchase) {
    return unavailable('AplusBillingModule launchPurchase is not available.');
  }

  return NativeAplusBillingModule.launchPurchase(
    APLUS_PRO_PRODUCT_ID,
    APLUS_PRO_BASE_PLAN_IDS[planKey],
    preferTrialOffer,
    obfuscatedAccountId,
  );
};

export const restoreAplusProPurchases = async () => {
  if (!isGooglePlayBillingAvailable() || !NativeAplusBillingModule?.restorePurchases) {
    return unavailable('AplusBillingModule restorePurchases is not available.');
  }

  return NativeAplusBillingModule.restorePurchases();
};
