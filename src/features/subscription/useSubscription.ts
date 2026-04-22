import React from 'react';
import {AplusProPaywallReason, AplusProPlan, AplusProPlanKey} from './subscriptionProducts';

type AplusProDeviceLockState = {
  visible: boolean;
  currentDeviceLabel?: string;
  message?: string;
  errorMessage?: string;
};

type AplusProContextValue = {
  isAplusProActive: boolean;
  isLoadingSubscription: boolean;
  isPaywallVisible: boolean;
  paywallReason?: AplusProPaywallReason;
  billingError?: string;
  plans: Record<AplusProPlanKey, AplusProPlan>;
  deviceLock: AplusProDeviceLockState;
  showPaywall: (reason?: AplusProPaywallReason) => void;
  hidePaywall: () => void;
  hideDeviceLock: () => void;
  requireAplusPro: <T>(reason: AplusProPaywallReason, callback: () => T) => T | undefined;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  startTrialOrPurchaseTrialOffer: () => Promise<void>;
  restorePurchases: (force?: boolean) => Promise<void>;
  transferAplusProToThisDevice: () => Promise<void>;
};

export const SubscriptionContext = React.createContext<AplusProContextValue | null>(null);

export const useAplusPro = () => {
  const context = React.useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useAplusPro must be used inside SubscriptionProvider');
  }

  return context;
};

export const useSubscription = useAplusPro;
