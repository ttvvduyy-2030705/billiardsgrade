import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View as RNView,
} from 'react-native';
import View from 'components/View';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';
import {devModuleWarn} from 'utils/devLogger';
import {
  getScoreMenuErrorMessage,
  logScoreMenuError,
} from 'utils/scoremenuErrors';
import {loadPublicTablesByQrToken} from 'services/restaurantMenuRepository';
import type {
  RestaurantMenuItem,
  RestaurantTable,
} from 'services/restaurantMenuRepository';
import {
  normalizeRestaurantTableNumber,
  useRestaurantCartStore,
} from '../../stores/RestaurantCartStore';
import {useRestaurantMenuStore} from '../../stores/RestaurantMenuStore';
import {useCustomerMenuSessionStore} from '../../stores/CustomerMenuSessionStore';
import createStyles from './styles';

type Props = Navigation;

type CartRow = {
  itemId: string;
  quantity: number;
  item: RestaurantMenuItem;
  lineTotal: number;
};

const formatCurrency = (value: number) => {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')}đ`;
};

const normalizeTableInput = normalizeRestaurantTableNumber;

const AndroidCartInputModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

const RestaurantCartScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const styles = useMemo(
    () =>
      createStyles(design, {width: adaptive.width, height: adaptive.height}),
    [adaptive.height, adaptive.width, design],
  );

  const {
    cart,
    cartSubmitting,
    hydrateCartFromStorage,
    changeQuantity,
    commitCartFields,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
    submitCurrentCartOrder,
  } = useRestaurantCartStore();
  const {items, refreshMenuData} = useRestaurantMenuStore();
  const {
    context: customerContext,
    billSessionId,
    lockedTableNumber,
    billStatus,
    billTotal,
    restoreActiveBillSession,
  } = useCustomerMenuSessionStore();

  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const [tableError, setTableError] = useState('');
  const [cartError, setCartError] = useState('');
  const [message, setMessage] = useState('');
  const [branchTables, setBranchTables] = useState<RestaurantTable[]>([]);
  const [branchTablesLoading, setBranchTablesLoading] = useState(false);
  const tableNumberRef = useRef('');
  const noteRef = useRef('');

  const customerMenuQrToken = useMemo(() => {
    return String(
      customerContext?.menuQrToken || customerContext?.qrCodeToken || '',
    ).trim();
  }, [customerContext?.menuQrToken, customerContext?.qrCodeToken]);

  const syncInputsFromCart = useCallback(() => {
    const activeCart = getActiveCart();
    const nextTableNumber =
      lockedTableNumber ||
      activeCart.lockedTableNumber ||
      activeCart.tableNumber ||
      '';
    const nextNote = activeCart.note || '';
    tableNumberRef.current = nextTableNumber;
    noteRef.current = nextNote;
    setTableNumber(nextTableNumber);
    setNote(nextNote);
  }, [getActiveCart, lockedTableNumber]);

  const refreshData = useCallback(async () => {
    try {
      const [, menuResult] = await Promise.all([
        hydrateCartFromStorage(),
        refreshMenuData(),
      ]);

      updateMenuItemSnapshot(menuResult.items);
      await restoreActiveBillSession();
      syncInputsFromCart();
      setCartError('');
    } catch (error) {
      logScoreMenuError(
        {
          module: 'CART',
          action: 'load cart screen failed',
          qrToken: customerMenuQrToken,
          restaurantId: customerContext?.restaurantId,
          branchId: customerContext?.branchId,
        },
        error,
      );
      setCartError(
        getScoreMenuErrorMessage(
          error,
          'Không thể tải giỏ hàng. Vui lòng thử lại.',
        ),
      );
    }
  }, [
    customerContext?.branchId,
    customerContext?.restaurantId,
    customerMenuQrToken,
    hydrateCartFromStorage,
    refreshMenuData,
    restoreActiveBillSession,
    syncInputsFromCart,
    updateMenuItemSnapshot,
  ]);

  useEffect(() => {
    syncInputsFromCart();
  }, [syncInputsFromCart]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
      return () => {};
    }, [refreshData]),
  );

  useEffect(() => {
    let cancelled = false;

    if (!customerMenuQrToken || !customerContext?.branchId) {
      setBranchTables([]);
      setBranchTablesLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setBranchTablesLoading(true);
    loadPublicTablesByQrToken(customerMenuQrToken)
      .then(tables => {
        if (cancelled) {
          return;
        }
        setBranchTables(
          tables.filter(
            table =>
              table.branchId === customerContext.branchId &&
              table.status !== 'HIDDEN',
          ),
        );
      })
      .catch(error => {
        logScoreMenuError(
          {
            module: 'CART',
            action: 'load branch tables failed',
            qrToken: customerMenuQrToken,
            restaurantId: customerContext?.restaurantId,
            branchId: customerContext?.branchId,
          },
          error,
        );
        if (!cancelled) {
          setBranchTables([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBranchTablesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerContext?.branchId, customerMenuQrToken]);

  const menuItemById = useMemo(() => {
    return items.reduce<Record<string, RestaurantMenuItem>>((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }, [items]);

  const cartRows = useMemo(() => {
    return cart.items
      .map(cartItem => {
        const menuItem =
          menuItemById[cartItem.itemId] || getSnapshotMenuItem(cartItem.itemId);

        if (!menuItem || cartItem.quantity <= 0) {
          return null;
        }

        return {
          itemId: cartItem.itemId,
          quantity: cartItem.quantity,
          item: menuItem,
          lineTotal: menuItem.price * cartItem.quantity,
        };
      })
      .filter(Boolean) as CartRow[];
  }, [cart.items, getSnapshotMenuItem, menuItemById]);

  const cartItemsTotal = useMemo(
    () => cartRows.reduce((result, row) => result + row.lineTotal, 0),
    [cartRows],
  );

  const activeBillTotal = Math.max(0, billTotal || 0);
  const lockedBillTableNumber =
    lockedTableNumber || cart.lockedTableNumber || tableNumber;
  const hasOpenBillSession = Boolean(
    billSessionId &&
    (billStatus === 'OPEN' || billStatus === 'PAYMENT_REQUESTED'),
  );
  const estimatedBillTotal = hasOpenBillSession
    ? activeBillTotal + cartItemsTotal
    : cartItemsTotal;
  const billStatusText =
    billStatus === 'PAYMENT_REQUESTED'
      ? 'Đang yêu cầu thanh toán'
      : billStatus === 'OPEN'
        ? 'Đang mở'
        : billStatus || '';

  const commitInputs = useCallback(() => {
    return commitCartFields({
      tableNumber: normalizeTableInput(tableNumberRef.current).trim(),
      note: noteRef.current,
    });
  }, [commitCartFields]);

  const handleGoBack = useCallback(() => {
    commitInputs();
    Keyboard.dismiss();
    props.goBack();
  }, [commitInputs, props]);

  const handleContinueOrdering = useCallback(() => {
    commitInputs();
    Keyboard.dismiss();
    props.goBack();
  }, [commitInputs, props]);

  const handleTableChange = useCallback(
    (value: string) => {
      if (billSessionId) {
        return;
      }

      const nextValue = normalizeTableInput(value);
      tableNumberRef.current = nextValue;
      setTableNumber(nextValue);

      if (nextValue.trim()) {
        setTableError('');
      }
    },
    [billSessionId],
  );

  const selectTable = useCallback(
    (nextTableNumber: string) => {
      if (billSessionId) {
        return;
      }

      handleTableChange(nextTableNumber);
      commitCartFields({
        tableNumber: normalizeTableInput(nextTableNumber),
        note: noteRef.current,
      });
    },
    [billSessionId, commitCartFields, handleTableChange],
  );

  const handleNoteChange = useCallback((value: string) => {
    noteRef.current = value;
    setNote(value);
  }, []);

  const showNativeCartInput = useCallback(
    async ({
      title,
      placeholder,
      initialValue,
      keyboardType,
      source,
    }: {
      title: string;
      placeholder: string;
      initialValue: string;
      keyboardType: 'text' | 'note';
      source: string;
    }) => {
      if (Platform.OS !== 'android') {
        return null;
      }

      const nativeDialog = (AndroidCartInputModule as any)
        ?.showCartTextInputDialog;
      if (typeof nativeDialog !== 'function') {
        return null;
      }

      return nativeDialog(
        title,
        placeholder,
        initialValue,
        keyboardType,
        source,
      );
    },
    [],
  );

  const openTableInput = useCallback(async () => {
    if (billSessionId) {
      return;
    }

    try {
      const nextValue = await showNativeCartInput({
        title: 'Nhập số bàn',
        placeholder: 'VD: Bàn 08, VIP1, A12',
        initialValue: tableNumberRef.current,
        keyboardType: 'text',
        source: 'restaurant-cart-screen-table',
      });

      if (typeof nextValue === 'string') {
        handleTableChange(nextValue);
        commitCartFields({
          tableNumber: normalizeTableInput(nextValue),
          note: noteRef.current,
        });
      }
    } catch (error) {
      devModuleWarn('CART', 'native table input failed', error);
    }
  }, [billSessionId, commitCartFields, handleTableChange, showNativeCartInput]);

  const openNoteInput = useCallback(async () => {
    try {
      const nextValue = await showNativeCartInput({
        title: 'Nhập ghi chú',
        placeholder: 'Thêm ghi chú cho đơn hàng',
        initialValue: noteRef.current,
        keyboardType: 'note',
        source: 'restaurant-cart-screen-note',
      });

      if (typeof nextValue === 'string') {
        handleNoteChange(nextValue);
        commitCartFields({
          tableNumber: tableNumberRef.current,
          note: nextValue,
        });
      }
    } catch (error) {
      devModuleWarn('CART', 'native note input failed', error);
    }
  }, [commitCartFields, handleNoteChange, showNativeCartInput]);

  const handleQuantity = useCallback(
    (itemId: string, delta: number) => {
      changeQuantity(itemId, delta);
      setCartError('');
    },
    [changeQuantity],
  );

  const handleSubmit = useCallback(async () => {
    if (cartSubmitting) {
      return;
    }

    const activeCart = commitInputs();
    const result = await submitCurrentCartOrder({
      fallbackItemsById: menuItemById,
    });

    if (!result.ok) {
      if (
        result.reason === 'TABLE_REQUIRED' ||
        result.reason === 'TABLE_INVALID'
      ) {
        setTableError(result.message);
        setCartError('');
        return;
      }

      if (result.reason !== 'ALREADY_SUBMITTING') {
        setTableError('');
        setCartError(result.message);
      }
      return;
    }

    const shortOrderId = result.orderId.slice(-6).toUpperCase();
    const tableNumberForMessage =
      result.tableNumber || activeCart.tableNumber.trim();

    setTableNumber(result.lockedTableNumber || '');
    setNote('');
    setTableError('');
    setCartError('');
    setMessage(
      shortOrderId
        ? `Đã gửi đơn #${shortOrderId} cho bàn ${tableNumberForMessage}.`
        : `Đã gửi đơn cho bàn ${tableNumberForMessage}.`,
    );
    Keyboard.dismiss();
  }, [cartSubmitting, commitInputs, menuItemById, submitCurrentCartOrder]);

  const renderCartRow = (row: CartRow) => {
    const canIncrease =
      row.item.status === 'SELLING' && row.item.available !== false;

    return (
      <RNView key={row.itemId} style={styles.cartRow}>
        <RNView style={styles.cartRowMain}>
          <RNText style={styles.cartItemName}>{row.item.name}</RNText>
          <RNText style={styles.cartMeta}>
            {formatCurrency(row.item.price)} × {row.quantity}
          </RNText>
          {!canIncrease ? (
            <RNText style={styles.fieldErrorText}>
              Món này hiện không thể đặt thêm.
            </RNText>
          ) : null}
        </RNView>
        <RNView style={styles.cartRowRight}>
          <RNText style={styles.cartLineTotal}>
            {formatCurrency(row.lineTotal)}
          </RNText>
          <RNView style={styles.quantityControlSmall}>
            <Pressable
              disabled={cartSubmitting}
              onPress={() => handleQuantity(row.itemId, -1)}
              style={[
                styles.quantityButtonSmall,
                cartSubmitting ? styles.disabledButton : null,
              ]}>
              <RNText style={styles.quantityButtonText}>−</RNText>
            </Pressable>
            <RNText style={styles.quantityTextSmall}>{row.quantity}</RNText>
            <Pressable
              disabled={cartSubmitting || !canIncrease}
              onPress={() => handleQuantity(row.itemId, 1)}
              style={[
                styles.quantityButtonSmall,
                cartSubmitting || !canIncrease ? styles.disabledButton : null,
              ]}>
              <RNText style={styles.quantityButtonText}>+</RNText>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenGlowTop} />
      <View style={styles.screenGlowBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardLayer}>
        <RNView style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <RNText style={styles.backText}>‹ Menu</RNText>
          </Pressable>
          <RNView style={styles.headerTitleWrap}>
            <RNText style={styles.title}>Giỏ hàng</RNText>
            <RNText style={styles.subtitle}>
              {hasLockedBillSession
                ? `Hóa đơn đang mở · ${formatCurrency(estimatedBillTotal)}`
                : `${cartRows.length} loại món · ${formatCurrency(cartItemsTotal)}`}
            </RNText>
          </RNView>
          <RNView style={styles.headerSpacer} />
        </RNView>

        {message ? (
          <RNView style={styles.notice}>
            <RNText style={styles.noticeText}>{message}</RNText>
          </RNView>
        ) : null}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}>
          {cartRows.length === 0 ? (
            <RNView style={styles.emptyState}>
              <RNText style={styles.emptyIcon}>🧺</RNText>
              <RNText style={styles.emptyText}>
                {hasOpenBillSession
                  ? 'Giỏ gọi thêm đang trống'
                  : 'Giỏ hàng đang trống'}
              </RNText>
              <RNText style={styles.emptySubText}>
                {hasOpenBillSession
                  ? `Bàn ${lockedBillTableNumber || ''} đã khóa theo hóa đơn. Chọn thêm món từ menu khi cần gọi tiếp.`
                  : 'Chọn món trong menu để tạo đơn gọi món.'}
              </RNText>
              {hasOpenBillSession ? (
                <Pressable
                  onPress={handleContinueOrdering}
                  style={styles.emptyActionButton}>
                  <RNText style={styles.emptyActionText}>Gọi thêm món</RNText>
                </Pressable>
              ) : null}
            </RNView>
          ) : (
            cartRows.map(renderCartRow)
          )}

          {hasLockedBillSession ? (
            <RNView style={styles.billSummaryCard}>
              <RNView style={styles.billSummaryHeader}>
                <RNView style={styles.billSummaryTitleWrap}>
                  <RNText style={styles.billSummaryLabel}>
                    HÓA ĐƠN ĐANG MỞ
                  </RNText>
                  <RNText style={styles.billSummaryTitle}>
                    Bàn {lockedBillTableNumber || 'đã khóa'}
                  </RNText>
                </RNView>
                {billStatusText ? (
                  <RNView style={styles.billStatusPill}>
                    <RNText style={styles.billStatusText}>
                      {billStatusText}
                    </RNText>
                  </RNView>
                ) : null}
              </RNView>
              <RNView style={styles.billTotalRow}>
                <RNText style={styles.billTotalLabel}>Tạm tính hiện tại</RNText>
                <RNText style={styles.billTotalValue}>
                  {formatCurrency(activeBillTotal)}
                </RNText>
              </RNView>
              <RNView style={styles.billTotalRow}>
                <RNText style={styles.billTotalLabel}>Món đang gọi thêm</RNText>
                <RNText style={styles.billTotalValue}>
                  {formatCurrency(cartItemsTotal)}
                </RNText>
              </RNView>
              <RNView style={[styles.billTotalRow, styles.billGrandTotalRow]}>
                <RNText style={styles.billGrandTotalLabel}>
                  Dự kiến sau đơn này
                </RNText>
                <RNText style={styles.billGrandTotalValue}>
                  {formatCurrency(estimatedBillTotal)}
                </RNText>
              </RNView>
            </RNView>
          ) : (
            <RNView style={styles.totalRow}>
              <RNText style={styles.totalLabel}>Tổng món trong giỏ</RNText>
              <RNText style={styles.totalValue}>
                {formatCurrency(cartItemsTotal)}
              </RNText>
            </RNView>
          )}

          <RNView style={styles.infoSection}>
            <RNView style={styles.cartScopeCard}>
              <RNText style={styles.cartScopeLabel}>MENU ĐANG GỌI</RNText>
              <RNText numberOfLines={1} style={styles.cartScopeTitle}>
                {customerContext?.restaurantName || 'Nhà hàng từ QR'}
              </RNText>
              <RNText numberOfLines={1} style={styles.cartScopeSubTitle}>
                {customerContext?.branchName || 'Chi nhánh từ QR'}
              </RNText>
            </RNView>

            {hasLockedBillSession ? (
              <RNView style={styles.lockedTableCard}>
                <RNText style={styles.lockedTableLabel}>BÀN ĐÃ KHÓA</RNText>
                <RNText style={styles.lockedTableNumber}>
                  {lockedBillTableNumber || 'Đã nhận theo hóa đơn'}
                </RNText>
                <RNText style={styles.lockedTableHint}>
                  Bàn được khóa sau lần gọi đầu. Khách không thể đổi bàn từ giỏ
                  hàng; nếu cần chuyển bàn hãy gọi nhân viên.
                </RNText>
              </RNView>
            ) : (
              <>
                {branchTables.length > 0 ? (
                  <RNView style={styles.tablePickerSection}>
                    <RNText style={styles.tablePickerTitle}>
                      Chọn nhanh bàn trong chi nhánh
                    </RNText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
                      contentContainerStyle={styles.tableChipRow}>
                      {branchTables.map(table => {
                        const selected =
                          normalizeTableInput(
                            table.tableNumber,
                          ).toLowerCase() ===
                          normalizeTableInput(tableNumber).toLowerCase();
                        const disabled =
                          cartSubmitting || table.status === 'LOCKED';

                        return (
                          <Pressable
                            key={table.id}
                            disabled={disabled}
                            onPress={() => selectTable(table.tableNumber)}
                            style={[
                              styles.tableChip,
                              selected ? styles.tableChipActive : null,
                              disabled ? styles.tableChipDisabled : null,
                            ]}>
                            <RNText
                              style={[
                                styles.tableChipText,
                                selected ? styles.tableChipTextActive : null,
                              ]}>
                              {table.tableNumber}
                            </RNText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </RNView>
                ) : branchTablesLoading ? (
                  <RNText style={styles.tablePickerHint}>
                    Đang tải danh sách bàn...
                  </RNText>
                ) : (
                  <RNText style={styles.tablePickerHint}>
                    Nhập số bàn được nhân viên/biển bàn cung cấp.
                  </RNText>
                )}

                {Platform.OS === 'android' ? (
                  <Pressable
                    disabled={cartSubmitting}
                    onPress={openTableInput}
                    style={[
                      styles.inputWrap,
                      styles.cartDisplayField,
                      tableError ? styles.inputWrapError : null,
                    ]}>
                    <RNText style={styles.inputLabel}>SỐ BÀN</RNText>
                    <RNText
                      numberOfLines={1}
                      style={[
                        styles.cartDisplayValue,
                        !tableNumber ? styles.cartDisplayPlaceholder : null,
                      ]}>
                      {tableNumber || 'VD: Bàn 08, VIP1, A12'}
                    </RNText>
                  </Pressable>
                ) : (
                  <RNView
                    style={[
                      styles.inputWrap,
                      tableError ? styles.inputWrapError : null,
                    ]}>
                    <RNText style={styles.inputLabel}>SỐ BÀN</RNText>
                    <TextInput
                      value={tableNumber}
                      editable={!cartSubmitting}
                      onChangeText={handleTableChange}
                      onBlur={commitInputs}
                      placeholder="VD: Bàn 08, VIP1, A12"
                      placeholderTextColor="rgba(255,255,255,0.42)"
                      keyboardType="default"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      autoCorrect={false}
                      autoCapitalize="characters"
                      selectionColor="#E22A32"
                      underlineColorAndroid="transparent"
                      style={styles.input}
                    />
                  </RNView>
                )}
                {tableError ? (
                  <RNText style={styles.fieldErrorText}>{tableError}</RNText>
                ) : null}
              </>
            )}

            {Platform.OS === 'android' ? (
              <Pressable
                disabled={cartSubmitting}
                onPress={openNoteInput}
                style={[
                  styles.inputWrap,
                  styles.cartDisplayField,
                  styles.cartDisplayFieldMultiline,
                ]}>
                <RNText style={styles.inputLabel}>GHI CHÚ</RNText>
                <RNText
                  numberOfLines={3}
                  style={[
                    styles.cartDisplayValue,
                    styles.cartDisplayValueMultiline,
                    !note ? styles.cartDisplayPlaceholder : null,
                  ]}>
                  {note || 'Thêm ghi chú cho đơn hàng'}
                </RNText>
              </Pressable>
            ) : (
              <RNView style={styles.inputWrap}>
                <RNText style={styles.inputLabel}>GHI CHÚ</RNText>
                <TextInput
                  value={note}
                  onChangeText={handleNoteChange}
                  onBlur={commitInputs}
                  placeholder="Thêm ghi chú cho đơn hàng"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  keyboardType="default"
                  returnKeyType="default"
                  multiline
                  blurOnSubmit={false}
                  autoCorrect={false}
                  textAlignVertical="top"
                  selectionColor="#E22A32"
                  underlineColorAndroid="transparent"
                  style={styles.textArea}
                />
              </RNView>
            )}
          </RNView>

          {cartError ? (
            <RNText style={styles.fieldErrorText}>{cartError}</RNText>
          ) : null}
        </ScrollView>

        <RNView style={styles.footer}>
          <Pressable
            disabled={cartSubmitting}
            onPress={
              cartRows.length === 0 ? handleContinueOrdering : handleSubmit
            }
            style={[
              styles.primaryButton,
              cartSubmitting ? styles.disabledButton : null,
            ]}>
            {cartSubmitting ? (
              <RNView style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <RNText style={styles.primaryButtonText}>
                  Đang gửi đơn...
                </RNText>
              </RNView>
            ) : (
              <RNText style={styles.primaryButtonText}>
                {cartRows.length === 0
                  ? hasOpenBillSession
                    ? 'Gọi thêm món'
                    : 'Chọn món từ menu'
                  : hasOpenBillSession
                    ? 'Gửi món gọi thêm'
                    : 'Gửi đơn'}
              </RNText>
            )}
          </Pressable>
        </RNView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default memo(RestaurantCartScreen);
