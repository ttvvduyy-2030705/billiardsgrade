import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  APLUS_PRO_FEATURES,
  APLUS_PRO_REASON_LABEL,
  AplusProPaywallReason,
  AplusProPlan,
  AplusProPlanKey,
} from './subscriptionProducts';

type Props = {
  visible: boolean;
  reason?: AplusProPaywallReason;
  isLoading?: boolean;
  billingError?: string;
  plans: Record<AplusProPlanKey, AplusProPlan>;
  onClose: () => void;
  onTrial: () => void;
  onMonthly: () => void;
  onYearly: () => void;
};

const RED = '#C91D24';
const DARK_RED = '#6F0D12';

const createStyles = (width: number, height: number) => {
  const compact = width < 720 || height < 520;
  const cardWidth = Math.min(width - 24, compact ? 560 : 720);
  const maxCardHeight = Math.max(420, height - 42);
  const planHorizontal = width >= 760 && height >= 540;

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.76)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 18,
    },
    card: {
      width: cardWidth,
      maxHeight: maxCardHeight,
      borderRadius: compact ? 22 : 28,
      backgroundColor: '#070707',
      borderWidth: 1,
      borderColor: 'rgba(201,29,36,0.62)',
      shadowColor: RED,
      shadowOffset: {width: 0, height: 16},
      shadowOpacity: 0.32,
      shadowRadius: 24,
      elevation: 18,
      overflow: 'hidden',
    },
    glow: {
      position: 'absolute',
      top: -80,
      right: -70,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: 'rgba(201,29,36,0.20)',
    },
    scrollContent: {
      paddingHorizontal: compact ? 18 : 26,
      paddingTop: compact ? 18 : 24,
      paddingBottom: compact ? 20 : 28,
    },
    close: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 5,
      width: compact ? 36 : 40,
      height: compact ? 36 : 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    closeText: {
      color: RED,
      fontSize: compact ? 22 : 24,
      lineHeight: compact ? 26 : 28,
      fontWeight: '900',
    },
    eyebrow: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: compact ? 11 : 12,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginRight: 48,
    },
    title: {
      color: '#FFFFFF',
      fontSize: compact ? 30 : 40,
      lineHeight: compact ? 36 : 46,
      fontWeight: '900',
      marginTop: 6,
      marginRight: 48,
    },
    subtitle: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 20 : 24,
      marginTop: compact ? 8 : 12,
      maxWidth: 620,
    },
    reasonText: {
      color: '#FFFFFF',
      fontSize: compact ? 12 : 13,
      lineHeight: compact ? 18 : 20,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: 'rgba(201,29,36,0.13)',
      borderWidth: 1,
      borderColor: 'rgba(201,29,36,0.28)',
    },
    featureGrid: {
      marginTop: compact ? 16 : 20,
      gap: compact ? 8 : 10,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(201,29,36,0.96)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    featureText: {
      flex: 1,
      color: 'rgba(255,255,255,0.92)',
      fontSize: compact ? 13 : 15,
      lineHeight: compact ? 18 : 21,
      fontWeight: '600',
    },
    primaryActions: {
      flexDirection: compact ? 'column' : 'row',
      gap: 12,
      marginTop: compact ? 18 : 24,
    },
    button: {
      flex: 1,
      minHeight: compact ? 48 : 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    trialButton: {
      backgroundColor: RED,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    subscribeButton: {
      backgroundColor: '#FFFFFF',
    },
    outlineButton: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    buttonText: {
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      textAlign: 'center',
    },
    trialText: {color: '#FFFFFF'},
    subscribeText: {color: '#0A0A0A'},
    planWrap: {
      marginTop: 14,
      flexDirection: planHorizontal ? 'row' : 'column',
      gap: 12,
    },
    planCard: {
      flex: 1,
      minHeight: compact ? 116 : 136,
      borderRadius: 20,
      padding: compact ? 14 : 16,
      backgroundColor: '#111111',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    planCardYearly: {
      borderColor: 'rgba(201,29,36,0.70)',
      backgroundColor: '#130608',
    },
    planBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: RED,
      marginBottom: 8,
    },
    planBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    planTitle: {
      color: '#FFFFFF',
      fontSize: compact ? 15 : 17,
      fontWeight: '900',
    },
    planSubtitle: {
      color: 'rgba(255,255,255,0.62)',
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 16 : 18,
      marginTop: 4,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginTop: 12,
    },
    planPrice: {
      color: '#FFFFFF',
      fontSize: compact ? 22 : 26,
      lineHeight: compact ? 27 : 32,
      fontWeight: '900',
    },
    planPeriod: {
      color: 'rgba(255,255,255,0.70)',
      fontSize: compact ? 12 : 13,
      marginLeft: 5,
      marginBottom: 4,
      fontWeight: '700',
    },
    planCta: {
      marginTop: 14,
      minHeight: compact ? 42 : 46,
      borderRadius: 15,
      backgroundColor: DARK_RED,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    planCtaYearly: {backgroundColor: RED},
    planCtaText: {
      color: '#FFFFFF',
      fontSize: compact ? 13 : 14,
      fontWeight: '900',
    },
    errorText: {
      color: '#FFB4B8',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },
    footerText: {
      color: 'rgba(255,255,255,0.46)',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 14,
      textAlign: 'center',
    },
  });
};

const AplusProPaywall = ({
  visible,
  reason,
  isLoading,
  billingError,
  plans,
  onClose,
  onTrial,
  onMonthly,
  onYearly,
}: Props) => {
  const {width, height} = useWindowDimensions();
  const styles = useMemo(() => createStyles(width, height), [height, width]);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowPlans(false);
    }
  }, [visible]);

  const reasonText = reason ? APLUS_PRO_REASON_LABEL[reason] : undefined;

  const renderPlan = (planKey: AplusProPlanKey, onPress: () => void) => {
    const plan = plans[planKey];
    const isYearly = planKey === 'yearly';

    return (
      <View style={[styles.planCard, isYearly && styles.planCardYearly]}>
        {plan.badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        ) : null}
        <Text style={styles.planTitle}>{plan.title}</Text>
        <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.planPrice}>{plan.formattedPrice}</Text>
          <Text style={styles.planPeriod}>{plan.billingPeriodLabel}</Text>
        </View>
        <Pressable
          onPress={onPress}
          disabled={isLoading}
          style={[styles.planCta, isYearly && styles.planCtaYearly, isLoading && {opacity: 0.66}]}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.planCtaText}>Chọn {isYearly ? 'gói năm' : 'gói tháng'}</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.glow} />
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <Text style={styles.eyebrow}>Premium Match Toolkit</Text>
            <Text style={styles.title}>Aplus Pro</Text>
            <Text style={styles.subtitle}>
              Mở khóa toàn bộ tính năng nâng cao cho trận đấu chuyên nghiệp.
            </Text>

            {reasonText ? <Text style={styles.reasonText}>{reasonText}</Text> : null}

            <View style={styles.featureGrid}>
              {APLUS_PRO_FEATURES.map(feature => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.primaryActions}>
              <Pressable
                onPress={onTrial}
                disabled={isLoading}
                style={[styles.button, styles.trialButton, isLoading && {opacity: 0.66}]}>
                <Text style={[styles.buttonText, styles.trialText]}>Dùng thử 15 ngày</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowPlans(prev => !prev)}
                disabled={isLoading}
                style={[styles.button, showPlans ? styles.outlineButton : styles.subscribeButton]}>
                <Text
                  style={[
                    styles.buttonText,
                    showPlans ? styles.trialText : styles.subscribeText,
                  ]}>
                  Đăng ký
                </Text>
              </Pressable>
            </View>

            {showPlans ? (
              <View style={styles.planWrap}>
                {renderPlan('monthly', onMonthly)}
                {renderPlan('yearly', onYearly)}
              </View>
            ) : null}

            {billingError ? <Text style={styles.errorText}>{billingError}</Text> : null}

            <Text style={styles.footerText}>
              Gói dùng thử và giá thật được lấy từ Google Play khi bạn cấu hình subscription trên Play Console.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default memo(AplusProPaywall);
