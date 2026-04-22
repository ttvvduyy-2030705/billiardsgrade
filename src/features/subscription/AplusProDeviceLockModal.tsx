import React, {memo} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  currentDeviceLabel?: string;
  message?: string;
  errorMessage?: string;
  isLoading?: boolean;
  onClose: () => void;
  onTransfer: () => void;
};

const AplusProDeviceLockModal = ({
  visible,
  currentDeviceLabel,
  message,
  errorMessage,
  isLoading,
  onClose,
  onTransfer,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeHitArea} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <Text style={styles.kicker}>Aplus Pro</Text>
          <Text style={styles.title}>Aplus Pro đang dùng trên thiết bị khác</Text>
          <Text style={styles.message}>
            {message ||
              'Gói Aplus Pro của bạn hiện đã được kích hoạt trên một thiết bị khác. Để bảo vệ tài khoản, mỗi gói chỉ sử dụng trên một thiết bị tại một thời điểm.'}
          </Text>

          {!!currentDeviceLabel && (
            <View style={styles.devicePill}>
              <Text style={styles.deviceLabel}>Thiết bị hiện tại của gói:</Text>
              <Text style={styles.deviceName}>{currentDeviceLabel}</Text>
            </View>
          )}

          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          <Pressable
            style={({pressed}) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.primaryButtonPressed,
            ]}
            disabled={isLoading}
            onPress={onTransfer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Chuyển sang thiết bị này</Text>
            )}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={onClose} disabled={isLoading}>
            <Text style={styles.secondaryText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.55)',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    shadowColor: '#B91C1C',
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
    elevation: 18,
  },
  closeHitArea: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeText: {
    color: '#EF4444',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  kicker: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    paddingRight: 34,
  },
  message: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  devicePill: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deviceLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    marginBottom: 4,
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  error: {
    color: '#FCA5A5',
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C1C',
    marginTop: 20,
  },
  primaryButtonPressed: {
    opacity: 0.72,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default memo(AplusProDeviceLockModal);
