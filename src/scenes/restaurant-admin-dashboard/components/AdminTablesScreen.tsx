import React, {memo, useCallback, useMemo} from 'react';
import {
  Alert,
  NativeModules,
  Platform,
  Pressable,
  TextInput,
  ToastAndroid,
  View as RNView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import RNText from './AdminText';
import type {
  RestaurantBranch,
  RestaurantBranchStatus,
  RestaurantTable,
  RestaurantTableStatus,
} from 'services/restaurantMenuRepository';

type Props = {
  tables: RestaurantTable[];
  branches: RestaurantBranch[];
  activeBranchId?: string;
  activeRestaurantId?: string;
  pendingTableCount?: number;
  styles: any;
  onSaveTable: (input: {
    id?: string;
    restaurantId?: string;
    branchId?: string;
    tableNumber: string;
    qrCodeToken?: string;
    status?: RestaurantTableStatus;
  }) => Promise<RestaurantTable>;
  onDeleteTable: (tableId: string) => Promise<RestaurantTable[]>;
  onSaveBranchQr: (input: {
    id: string;
    restaurantId: string;
    name: string;
    address?: string;
    menuQrToken?: string;
    status?: RestaurantBranchStatus;
  }) => Promise<RestaurantBranch>;
  onReloadTables: () => Promise<void>;
};

const getQrPrintValue = (token: string) =>
  `scoremenu://menu?qrToken=${encodeURIComponent(token)}`;

type AplusClipboardModule = {
  setString?: (value: string) => Promise<boolean>;
};

const NativeClipboard = (
  NativeModules.AplusClipboardModule || NativeModules.AplusClipboard
) as AplusClipboardModule | undefined;

const AdminTablesScreen = ({
  tables,
  branches,
  activeBranchId,
  activeRestaurantId,
  pendingTableCount,
  styles,
  onReloadTables,
}: Props) => {
  const activeBranch = useMemo(() => {
    return (
      branches.find(branch => branch.id === activeBranchId) ||
      branches.find(branch => branch.restaurantId === activeRestaurantId) ||
      branches[0]
    );
  }, [activeBranchId, activeRestaurantId, branches]);

  const visibleTableCount = useMemo(() => {
    return tables.filter(table => {
      const sameBranch = activeBranch?.id ? !table.branchId || table.branchId === activeBranch.id : true;
      return sameBranch && table.status !== 'HIDDEN';
    }).length;
  }, [activeBranch?.id, tables]);

  const qrToken = String(activeBranch?.menuQrToken || '').trim();
  const qrValue = qrToken ? getQrPrintValue(qrToken) : '';

  const handleCopyQrText = useCallback(async (label: string, value: string) => {
    const textToCopy = String(value || '').trim();
    if (!textToCopy) {
      Alert.alert('Chưa có dữ liệu để copy', `${label} hiện đang trống.`);
      return;
    }

    try {
      if (NativeClipboard?.setString) {
        await NativeClipboard.setString(textToCopy);
        if (Platform.OS === 'android') {
          ToastAndroid.show(`Đã copy ${label}`, ToastAndroid.SHORT);
        } else {
          Alert.alert('Đã copy', `${label} đã được lưu vào bộ nhớ tạm.`);
        }
        return;
      }
    } catch (error) {
      // Fall through to the selectable-text hint below.
    }

    Alert.alert(
      'Chưa copy tự động được',
      `Bạn có thể bấm giữ vào dòng ${label} để chọn và copy thủ công.`,
    );
  }, []);

  return (
    <RNView style={styles.sectionCard}>
      <RNView style={styles.sectionHeaderRow}>
        <RNView>
          <RNText style={styles.sectionTitle}>QR menu</RNText>
          <RNText style={styles.sectionSubtitle}>
            Mỗi tài khoản admin có một QR riêng. Khách quét QR này để mở menu,
            sau đó chọn bàn trong giỏ hàng.
          </RNText>
        </RNView>
        <Pressable onPress={onReloadTables} style={styles.secondaryButton}>
          <RNText style={styles.secondaryButtonText}>Làm mới</RNText>
        </Pressable>
      </RNView>

      {qrValue ? (
        <RNView style={styles.tableManagerPanel}>
          <RNView style={styles.branchQrPreviewCard}>
            <RNText style={styles.inputLabel}>Ảnh QR để in/dán</RNText>
            <RNView style={styles.branchQrCodeBox}>
              <QRCode value={qrValue} size={180} />
            </RNView>
            <RNText style={styles.workspaceHint}>
              QR này thuộc riêng nick admin hiện tại. Không cần tạo QR theo từng bàn.
            </RNText>
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>Mã QR menu</RNText>
            <TextInput
              value={qrToken}
              selectTextOnFocus
              showSoftInputOnFocus={false}
              multiline
              style={[styles.qrTokenValue, styles.qrCopyTextInput]}
            />
            <RNView style={styles.qrCopyActions}>
              <Pressable
                onPress={() => handleCopyQrText('mã QR menu', qrToken)}
                style={styles.qrCopyButton}>
                <RNText style={styles.qrCopyButtonText}>Copy mã QR</RNText>
              </Pressable>
              <Pressable
                onPress={() => handleCopyQrText('link QR menu', qrValue)}
                style={styles.qrCopyButton}>
                <RNText style={styles.qrCopyButtonText}>Copy link QR</RNText>
              </Pressable>
            </RNView>
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>Link QR menu</RNText>
            <TextInput
              value={qrValue}
              selectTextOnFocus
              showSoftInputOnFocus={false}
              multiline
              style={[styles.qrTokenValue, styles.qrCopyTextInput]}
            />
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>Số bàn đang cho khách chọn</RNText>
            <RNText style={styles.qrTokenValue}>
              {visibleTableCount > 0
                ? `Bàn 1 đến Bàn ${visibleTableCount}`
                : pendingTableCount && pendingTableCount > 0
                  ? `Đã nhập ${pendingTableCount} bàn, bấm Lưu cấu hình nếu chưa tự cập nhật`
                  : 'Chưa cấu hình số bàn'}
            </RNText>
          </RNView>
        </RNView>
      ) : (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>Q</RNText>
          <RNText style={styles.emptyText}>Chưa có QR cho tài khoản này</RNText>
          <RNText style={styles.emptySubText}>
            Hãy đăng xuất rồi đăng nhập lại để backend tạo QR riêng cho nick admin,
            hoặc kiểm tra server đang chạy bản mới.
          </RNText>
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminTablesScreen);
