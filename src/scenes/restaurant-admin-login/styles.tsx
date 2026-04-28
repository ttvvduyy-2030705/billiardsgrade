import {StyleSheet} from 'react-native';

import type {DesignSystem} from 'theme/designSystem';

type Args = {
  design: DesignSystem;
};

const createStyles = ({design}: Args) => {
  const {spacing, radius, font, safeArea, control} = design;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#050506',
      paddingTop: safeArea.top + spacing.sm,
      paddingBottom: safeArea.bottom + spacing.md,
      paddingHorizontal: spacing.md,
    },
    glowTop: {
      position: 'absolute',
      top: -160,
      right: -140,
      width: 340,
      height: 340,
      borderRadius: 170,
      backgroundColor: 'rgba(201,29,36,0.18)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: -180,
      left: -120,
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: 'rgba(255,255,255,0.035)',
    },
    topRow: {
      minHeight: control.headerHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      minHeight: control.minTouch,
      justifyContent: 'center',
      paddingRight: spacing.md,
    },
    backText: {
      color: '#FFFFFF',
      fontSize: font.body,
      fontWeight: '800',
    },
    logo: {
      width: 46,
      height: 46,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 560,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(14,14,18,0.96)',
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: 16},
      elevation: 8,
    },
    eyebrow: {
      color: '#E53A42',
      fontSize: font.small,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    title: {
      color: '#FFFFFF',
      fontSize: font.titleLarge,
      fontWeight: '900',
    },
    hint: {
      color: 'rgba(255,255,255,0.58)',
      fontSize: font.body,
      lineHeight: font.body * 1.45,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    fieldBlock: {
      marginBottom: spacing.md,
    },
    label: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: font.small,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    input: {
      minHeight: control.fieldHeight,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(255,255,255,0.055)',
      color: '#FFFFFF',
      fontSize: font.bodyLarge,
      paddingHorizontal: spacing.md,
    },
    errorBox: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,90,90,0.32)',
      backgroundColor: 'rgba(210,40,48,0.15)',
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    errorText: {
      color: '#FF8989',
      fontSize: font.body,
      fontWeight: '800',
    },
    infoBox: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(68,210,150,0.32)',
      backgroundColor: 'rgba(9,168,107,0.15)',
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    infoText: {
      color: '#8DFFC7',
      fontSize: font.body,
      fontWeight: '800',
    },
    loginButton: {
      minHeight: control.buttonHeight,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#C91D24',
      marginTop: spacing.xs,
    },
    loginButtonDisabled: {
      opacity: 0.62,
    },
    loginText: {
      color: '#FFFFFF',
      fontSize: font.bodyLarge,
      fontWeight: '900',
    },
    switchRow: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    switchButton: {
      minHeight: control.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    switchText: {
      color: '#FFFFFF',
      fontSize: font.body,
      fontWeight: '900',
      textDecorationLine: 'underline',
    },
    testHint: {
      color: 'rgba(255,255,255,0.45)',
      fontSize: font.small,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });
};

export default createStyles;
