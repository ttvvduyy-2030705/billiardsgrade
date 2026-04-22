import React, {ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import AplusProDeviceLockModal from './AplusProDeviceLockModal';
import AplusProPaywall from './AplusProPaywall';
import {
  AplusProBackendEntitlement,
  transferAplusProDeviceWithBackend,
  verifyAplusProPurchaseWithBackend,
} from './backendEntitlement';
import {
  initializeAplusBilling,
  NativeAplusBillingEntitlement,
  normalizeAplusProPlans,
  purchaseAplusProPlan,
  restoreAplusProPurchases,
} from './billing';
import {getAplusProDeviceInstanceId} from './deviceIdentity';
import {
  APLUS_PRO_DEFAULT_PLANS,
  AplusProPaywallReason,
  AplusProPlanKey,
} from './subscriptionProducts';
import {
  clearStoredAplusProEntitlement,
  isStoredAplusProEntitlementInGrace,
  readStoredAplusProEntitlement,
  writeStoredAplusProEntitlement,
} from './subscriptionStorage';
import {SubscriptionContext} from './useSubscription';

const RESTORE_THROTTLE_MS = 15000;

const getBillingMessage = (error: unknown) => {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof (error as any)?.message === 'string') {
    return (error as any).message;
  }

  return 'Không thể kết nối Google Play Billing lúc này.';
};

type Props = {
  children: ReactNode;
};

type DeviceLockState = {
  visible: boolean;
  currentDeviceLabel?: string;
  message?: string;
  errorMessage?: string;
};

const defaultDeviceLock: DeviceLockState = {
  visible: false,
};

export const SubscriptionProvider = ({children}: Props) => {
  const [isAplusProActive, setIsAplusProActive] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<AplusProPaywallReason | undefined>();
  const [billingError, setBillingError] = useState<string | undefined>();
  const [plans, setPlans] = useState(APLUS_PRO_DEFAULT_PLANS);
  const [deviceLock, setDeviceLock] = useState<DeviceLockState>(defaultDeviceLock);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);
  const lastRestoreAtRef = useRef(0);
  const lastPurchaseTokenRef = useRef<string | undefined>();

  const applyInactive = useCallback(async (reason?: string) => {
    setIsAplusProActive(false);
    if (reason) {
      setBillingError(reason);
    }
    await clearStoredAplusProEntitlement();
  }, []);

  const applyBackendEntitlement = useCallback(
    async (entitlement: AplusProBackendEntitlement) => {
      if (
        entitlement?.isAplusProActive === true &&
        entitlement.boundToThisDevice !== false
      ) {
        setIsAplusProActive(true);
        setBillingError(undefined);
        setDeviceLock(defaultDeviceLock);
        await writeStoredAplusProEntitlement({
          isActive: true,
          productId: 'aplus_pro',
          source: 'google_play_backend',
          lastCheckedAt: Date.now(),
          expiresAt: entitlement.expiryTime,
          reason: entitlement.reason || 'active',
        });
        return;
      }

      if (entitlement?.requireDeviceTransfer || entitlement?.reason === 'bound_to_other_device') {
        setIsAplusProActive(false);
        setBillingError(undefined);
        setDeviceLock({
          visible: true,
          currentDeviceLabel: entitlement.currentDeviceLabel,
          message:
            entitlement.message ||
            'Gói Aplus Pro hiện đang được kích hoạt trên một thiết bị khác.',
        });
        await clearStoredAplusProEntitlement();
        return;
      }

      await applyInactive(entitlement?.message || entitlement?.reason || 'Aplus Pro chưa được xác thực.');
    },
    [applyInactive],
  );

  const verifyNativeEntitlementWithBackend = useCallback(
    async (entitlement: NativeAplusBillingEntitlement) => {
      if (entitlement?.isActive !== true || !entitlement.purchaseToken) {
        lastPurchaseTokenRef.current = undefined;
        await applyInactive(undefined);
        return;
      }

      lastPurchaseTokenRef.current = entitlement.purchaseToken;

      try {
        const backendEntitlement = await verifyAplusProPurchaseWithBackend(
          entitlement.purchaseToken,
        );
        await applyBackendEntitlement(backendEntitlement);
      } catch (error) {
        const cached = await readStoredAplusProEntitlement();
        if (isStoredAplusProEntitlementInGrace(cached)) {
          setIsAplusProActive(true);
          setBillingError('Đang dùng cache Aplus Pro tạm thời vì chưa kết nối được backend.');
          return;
        }

        await applyInactive(getBillingMessage(error));
      }
    },
    [applyBackendEntitlement, applyInactive],
  );

  const restorePurchases = useCallback(async (force = false) => {
    if (restoreInFlightRef.current && !force) {
      return restoreInFlightRef.current;
    }

    if (!force && Date.now() - lastRestoreAtRef.current < RESTORE_THROTTLE_MS) {
      return;
    }

    const restoreTask = (async () => {
      try {
        lastRestoreAtRef.current = Date.now();
        setIsLoadingSubscription(true);
        setBillingError(undefined);

        const initResult = await initializeAplusBilling();
        if (initResult?.plans?.length) {
          setPlans(normalizeAplusProPlans(initResult.plans));
        }

        if (initResult?.debugMessage && initResult.isAvailable === false) {
          setBillingError(initResult.debugMessage);
        }

        const entitlement = await restoreAplusProPurchases();
        if (entitlement?.debugMessage && entitlement.isAvailable === false) {
          setBillingError(entitlement.debugMessage);
        }
        await verifyNativeEntitlementWithBackend(entitlement);
      } catch (error) {
        const cached = await readStoredAplusProEntitlement();
        if (isStoredAplusProEntitlementInGrace(cached)) {
          setIsAplusProActive(true);
          setBillingError('Đang dùng cache Aplus Pro tạm thời vì chưa kết nối được backend.');
        } else {
          setBillingError(getBillingMessage(error));
          setIsAplusProActive(false);
        }
      } finally {
        setIsLoadingSubscription(false);
        restoreInFlightRef.current = null;
      }
    })();

    restoreInFlightRef.current = restoreTask;
    return restoreTask;
  }, [verifyNativeEntitlementWithBackend]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const cached = await readStoredAplusProEntitlement();
      if (mounted && isStoredAplusProEntitlementInGrace(cached)) {
        setIsAplusProActive(true);
      }

      await restorePurchases(true);
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [restorePurchases]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        restorePurchases();
      }
    });

    return () => subscription.remove();
  }, [restorePurchases]);

  const showPaywall = useCallback((reason?: AplusProPaywallReason) => {
    setPaywallReason(reason);
    setIsPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setIsPaywallVisible(false);
  }, []);

  const hideDeviceLock = useCallback(() => {
    setDeviceLock(defaultDeviceLock);
  }, []);

  const requireAplusPro = useCallback(
    <T,>(reason: AplusProPaywallReason, callback: () => T): T | undefined => {
      if (isAplusProActive) {
        return callback();
      }

      showPaywall(reason);
      return undefined;
    },
    [isAplusProActive, showPaywall],
  );

  const purchasePlan = useCallback(
    async (planKey: AplusProPlanKey, preferTrialOffer = false) => {
      try {
        setIsLoadingSubscription(true);
        setBillingError(undefined);
        const deviceInstanceId = await getAplusProDeviceInstanceId();
        const result = await purchaseAplusProPlan(
          planKey,
          preferTrialOffer,
          deviceInstanceId,
        );
        await verifyNativeEntitlementWithBackend(result);
        await restorePurchases(true);
        if (result?.isActive && lastPurchaseTokenRef.current) {
          hidePaywall();
        }
      } catch (error) {
        setBillingError(getBillingMessage(error));
      } finally {
        setIsLoadingSubscription(false);
      }
    },
    [hidePaywall, restorePurchases, verifyNativeEntitlementWithBackend],
  );

  const purchaseMonthly = useCallback(async () => {
    await purchasePlan('monthly', false);
  }, [purchasePlan]);

  const purchaseYearly = useCallback(async () => {
    await purchasePlan('yearly', false);
  }, [purchasePlan]);

  const startTrialOrPurchaseTrialOffer = useCallback(async () => {
    await purchasePlan('monthly', true);
  }, [purchasePlan]);

  const transferAplusProToThisDevice = useCallback(async () => {
    try {
      setIsLoadingSubscription(true);
      setBillingError(undefined);
      setDeviceLock(current => ({...current, errorMessage: undefined}));
      const entitlement = await transferAplusProDeviceWithBackend(
        lastPurchaseTokenRef.current,
      );
      if (entitlement?.isAplusProActive === true) {
        await applyBackendEntitlement(entitlement);
        hideDeviceLock();
      } else {
        setDeviceLock(current => ({
          ...current,
          visible: true,
          errorMessage:
            entitlement?.message ||
            'Không thể chuyển Aplus Pro sang thiết bị này lúc này.',
        }));
      }
    } catch (error) {
      setDeviceLock(current => ({
        ...current,
        visible: true,
        errorMessage: getBillingMessage(error),
      }));
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [applyBackendEntitlement, hideDeviceLock]);

  const value = useMemo(
    () => ({
      isAplusProActive,
      isLoadingSubscription,
      isPaywallVisible,
      paywallReason,
      billingError,
      plans,
      deviceLock,
      showPaywall,
      hidePaywall,
      hideDeviceLock,
      requireAplusPro,
      purchaseMonthly,
      purchaseYearly,
      startTrialOrPurchaseTrialOffer,
      restorePurchases,
      transferAplusProToThisDevice,
    }),
    [
      billingError,
      deviceLock,
      hideDeviceLock,
      hidePaywall,
      isAplusProActive,
      isLoadingSubscription,
      isPaywallVisible,
      paywallReason,
      plans,
      purchaseMonthly,
      purchaseYearly,
      requireAplusPro,
      restorePurchases,
      showPaywall,
      startTrialOrPurchaseTrialOffer,
      transferAplusProToThisDevice,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <AplusProPaywall
        visible={isPaywallVisible}
        reason={paywallReason}
        isLoading={isLoadingSubscription}
        billingError={billingError}
        plans={plans}
        onClose={hidePaywall}
        onTrial={startTrialOrPurchaseTrialOffer}
        onMonthly={purchaseMonthly}
        onYearly={purchaseYearly}
      />
      <AplusProDeviceLockModal
        visible={deviceLock.visible}
        currentDeviceLabel={deviceLock.currentDeviceLabel}
        message={deviceLock.message}
        errorMessage={deviceLock.errorMessage}
        isLoading={isLoadingSubscription}
        onClose={hideDeviceLock}
        onTransfer={transferAplusProToThisDevice}
      />
    </SubscriptionContext.Provider>
  );
};
