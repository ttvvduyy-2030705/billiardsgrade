import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {useAppTranslation} from 'utils/appI18n';
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

const getQrTextValue = (token: string) => String(token || '').trim();

const normaliseQrTokenPart = (value?: string, fallback = 'main') => {
  const tokenPart = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  return tokenPart || fallback;
};

const createBranchMenuQrToken = (
  restaurantId?: string,
  branchName?: string,
) => {
  const restaurantKey = normaliseQrTokenPart(restaurantId, 'restaurant');
  const branchKey = normaliseQrTokenPart(branchName, 'main');
  const randomKey = Math.random().toString(36).slice(2, 8);

  return `qr_${restaurantKey}_${branchKey}_${Date.now().toString(36)}_${randomKey}_menu`;
};

const getQrDeepLinkValue = (token: string) => {
  const cleanToken = getQrTextValue(token);
  return cleanToken
    ? `scoremenu://menu?qrToken=${encodeURIComponent(cleanToken)}`
    : '';
};

type AplusClipboardModule = {
  setString?: (value: string) => Promise<boolean>;
};

const NativeClipboard = (NativeModules.AplusClipboardModule ||
  NativeModules.AplusClipboard) as AplusClipboardModule | undefined;

const AdminTablesScreen = ({
  tables,
  branches,
  activeBranchId,
  activeRestaurantId,
  pendingTableCount,
  styles,
  onSaveBranchQr,
  onReloadTables,
}: Props) => {
  const t = useAppTranslation();
  const [qrRepairing, setQrRepairing] = useState(false);
  const [qrRepairMessage, setQrRepairMessage] = useState('');
  const autoCreateKeyRef = useRef('');

  const activeBranch = useMemo(() => {
    return (
      branches.find(branch => branch.id === activeBranchId) ||
      branches.find(branch => branch.restaurantId === activeRestaurantId) ||
      branches[0]
    );
  }, [activeBranchId, activeRestaurantId, branches]);

  const visibleTableCount = useMemo(() => {
    return tables.filter(table => {
      const sameBranch = activeBranch?.id
        ? !table.branchId || table.branchId === activeBranch.id
        : true;
      return sameBranch && table.status !== 'HIDDEN';
    }).length;
  }, [activeBranch?.id, tables]);

  const qrToken = getQrTextValue(activeBranch?.menuQrToken || '');
  const qrTextValue = qrToken;
  const qrScanValue = getQrDeepLinkValue(qrToken);
  const activeBranchRestaurantId = String(
    activeBranch?.restaurantId || activeRestaurantId || '',
  ).trim();

  const persistGeneratedBranchQrToken = useCallback(async () => {
    if (!activeBranch?.id || !activeBranchRestaurantId) {
      setQrRepairMessage(
        t('restaurantAdmin.qrMenu.noBranchToCreate'),
      );
      return;
    }

    const nextToken = createBranchMenuQrToken(
      activeBranchRestaurantId,
      activeBranch.name || activeBranch.id,
    );

    setQrRepairing(true);
    setQrRepairMessage(t('restaurantAdmin.qrMenu.creatingPrivateQr'));

    try {
      await onSaveBranchQr({
        id: activeBranch.id,
        restaurantId: activeBranchRestaurantId,
        name: activeBranch.name || t('restaurantAdmin.branchMain'),
        address: activeBranch.address,
        menuQrToken: nextToken,
        status: activeBranch.status || 'ACTIVE',
      });
      await onReloadTables();
      setQrRepairMessage(t('restaurantAdmin.qrMenu.createdPrivateQr'));
    } catch (error) {
      setQrRepairMessage(
        t('restaurantAdmin.qrMenu.createPrivateQrError'),
      );
      autoCreateKeyRef.current = '';
    } finally {
      setQrRepairing(false);
    }
  }, [activeBranch, activeBranchRestaurantId, onReloadTables, onSaveBranchQr, t]);

  useEffect(() => {
    const autoCreateKey = `${activeBranchRestaurantId}:${activeBranch?.id || ''}`;

    if (qrToken || !activeBranch?.id || !activeBranchRestaurantId) {
      return;
    }

    if (autoCreateKeyRef.current === autoCreateKey) {
      return;
    }

    autoCreateKeyRef.current = autoCreateKey;
    void persistGeneratedBranchQrToken();
  }, [
    activeBranch?.id,
    activeBranchRestaurantId,
    persistGeneratedBranchQrToken,
    qrToken,
  ]);

  const handleCopyQrText = useCallback(async (label: string, value: string) => {
    const textToCopy = String(value || '').trim();
    if (!textToCopy) {
      Alert.alert(t('restaurantAdmin.qrMenu.copyEmptyTitle'), t('restaurantAdmin.qrMenu.copyEmptyMessage', {label}));
      return;
    }

    try {
      if (NativeClipboard?.setString) {
        await NativeClipboard.setString(textToCopy);
        if (Platform.OS === 'android') {
          ToastAndroid.show(t('restaurantAdmin.qrMenu.copiedToast', {label}), ToastAndroid.SHORT);
        } else {
          Alert.alert(t('restaurantAdmin.qrMenu.copiedTitle'), t('restaurantAdmin.qrMenu.copiedMessage', {label}));
        }
        return;
      }
    } catch (error) {
      // Fall through to the selectable-text hint below.
    }

    Alert.alert(
      t('restaurantAdmin.qrMenu.copyManualTitle'),
      t('restaurantAdmin.qrMenu.copyManualMessage', {label}),
    );
  }, [t]);

  return (
    <RNView style={styles.sectionCard}>
      <RNView style={styles.sectionHeaderRow}>
        <RNView>
          <RNText style={styles.sectionTitle}>{t('restaurantAdmin.qrMenu.title')}</RNText>
          <RNText style={styles.sectionSubtitle}>
            {t('restaurantAdmin.qrMenu.description')}
          </RNText>
        </RNView>
        <Pressable onPress={onReloadTables} style={styles.secondaryButton}>
          <RNText style={styles.secondaryButtonText}>{t('restaurantAdmin.qrMenu.refresh')}</RNText>
        </Pressable>
      </RNView>

      {qrScanValue ? (
        <RNView style={styles.tableManagerPanel}>
          <RNView style={styles.branchQrPreviewCard}>
            <RNText style={styles.inputLabel}>{t('restaurantAdmin.qrMenu.scanImage')}</RNText>
            <RNView style={styles.branchQrCodeBox}>
              <QRCode
                value={qrScanValue}
                size={236}
                quietZone={18}
                ecl="M"
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </RNView>
            <RNText style={styles.workspaceHint}>
              {t('restaurantAdmin.qrMenu.generatedByAppLink')}
            </RNText>
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>{t('restaurantAdmin.qrMenu.qrText')}</RNText>
            <TextInput
              value={qrTextValue}
              selectTextOnFocus
              showSoftInputOnFocus={false}
              multiline
              style={[styles.qrTokenValue, styles.qrCopyTextInput]}
            />
            <RNView style={styles.qrCopyActions}>
              <Pressable
                onPress={() => handleCopyQrText(t('restaurantAdmin.qrMenu.textCodeLabel'), qrTextValue)}
                style={styles.qrCopyButton}>
                <RNText style={styles.qrCopyButtonText}>{t('restaurantAdmin.qrMenu.copyTextCode')}</RNText>
              </Pressable>
              <Pressable
                onPress={() => handleCopyQrText(t('restaurantAdmin.qrMenu.appLinkLabel'), qrScanValue)}
                style={styles.qrCopyButton}>
                <RNText style={styles.qrCopyButtonText}>{t('restaurantAdmin.qrMenu.copyAppLink')}</RNText>
              </Pressable>
            </RNView>
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>{t('restaurantAdmin.qrMenu.appLink')}</RNText>
            <TextInput
              value={qrScanValue}
              selectTextOnFocus
              showSoftInputOnFocus={false}
              multiline
              style={[styles.qrTokenValue, styles.qrCopyTextInput]}
            />
          </RNView>

          <RNView style={styles.qrTokenBox}>
            <RNText style={styles.qrTokenLabel}>
              {t('restaurantAdmin.qrMenu.tableCountForGuest')}
            </RNText>
            <RNText style={styles.qrTokenValue}>
              {visibleTableCount > 0
                ? t('restaurantAdmin.qrMenu.tableRange', {count: visibleTableCount})
                : pendingTableCount && pendingTableCount > 0
                  ? t('restaurantAdmin.qrMenu.pendingTables', {count: pendingTableCount})
                  : t('restaurantAdmin.qrMenu.noTableConfig')}
            </RNText>
          </RNView>
        </RNView>
      ) : (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>Q</RNText>
          <RNText style={styles.emptyText}>
            {qrRepairing
              ? t('restaurantAdmin.qrMenu.creatingMenuQr')
              : t('restaurantAdmin.qrMenu.noQrForAccount')}
          </RNText>
          <RNText style={styles.emptySubText}>
            {qrRepairMessage ||
              t('restaurantAdmin.qrMenu.autoCreateHint')}
          </RNText>
          {activeBranch?.id ? (
            <Pressable
              disabled={qrRepairing}
              onPress={() => void persistGeneratedBranchQrToken()}
              style={styles.secondaryButton}>
              <RNText style={styles.secondaryButtonText}>
                {qrRepairing ? t('restaurantAdmin.qrMenu.creating') : t('restaurantAdmin.qrMenu.autoCreate')}
              </RNText>
            </Pressable>
          ) : null}
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminTablesScreen);
