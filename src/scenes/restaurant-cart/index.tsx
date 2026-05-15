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
import {formatVnd, useAppTranslation} from 'utils/appI18n';
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

const formatCurrency = formatVnd;

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

  const t = useAppTranslation();

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
          t('restaurantMenu.menuLoadError'),
        ),
      );
    }
  }, [
    t,
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
              (!table.branchId || table.branchId === customerContext.branchId) &&
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


  const sortedBranchTables = useMemo(() => {
    const getIndex = (tableNumber: string) => {
      const normalized = normalizeTableInput(tableNumber)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const match = normalized.match(/^ban\s*0*(\d+)$/);
      return match?.[1] ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    return [...branchTables].sort((a, b) => {
      const indexDelta = getIndex(a.tableNumber) - getIndex(b.tableNumber);
      if (indexDelta !== 0) {
        return indexDelta;
      }
      return String(a.tableNumber || '').localeCompare(
        String(b.tableNumber || ''),
        'vi',
      );
    });
  }, [branchTables]);

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
      ? t('restaurantMenu.paymentRequested')
      : billStatus === 'OPEN'
        ? t('restaurantMenu.open')
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
        title: t('restaurantMenu.enterTableNumber'),
        placeholder: t('restaurantMenu.tablePlaceholder'),
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
  }, [billSessionId, commitCartFields, handleTableChange, showNativeCartInput, t]);

  const openNoteInput = useCallback(async () => {
    try {
      const nextValue = await showNativeCartInput({
        title: t('restaurantMenu.enterNote'),
        placeholder: t('restaurantMenu.notePlaceholder'),
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
  }, [commitCartFields, handleNoteChange, showNativeCartInput, t]);

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
        ? t('restaurantMenu.orderSubmittedWithId', {
            orderId: shortOrderId,
            table: tableNumberForMessage,
          })
        : t('restaurantMenu.orderSubmitted', {table: tableNumberForMessage}),
    );
    Keyboard.dismiss();
  }, [cartSubmitting, commitInputs, menuItemById, submitCurrentCartOrder, t]);

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
              {t('restaurantMenu.cannotOrderMore')}
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
            <RNText style={styles.title}>{t('restaurantMenu.cart')}</RNText>
            <RNText style={styles.subtitle}>
              {hasLockedBillSession
                ? t('restaurantMenu.openBillSummary', {total: formatCurrency(estimatedBillTotal)})
                : t('restaurantMenu.cartTypeSummary', {count: cartRows.length, total: formatCurrency(cartItemsTotal)})}
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
                  ? t('restaurantMenu.addOnCartEmpty')
                  : t('restaurantMenu.cartEmpty')}
              </RNText>
              <RNText style={styles.emptySubText}>
                {hasOpenBillSession
                  ? t('restaurantMenu.lockedBillEmptyHint', {table: lockedBillTableNumber || ''})
                  : t('restaurantMenu.cartEmptyHint')}
              </RNText>
              {hasOpenBillSession ? (
                <Pressable
                  onPress={handleContinueOrdering}
                  style={styles.emptyActionButton}>
                  <RNText style={styles.emptyActionText}>{t('restaurantMenu.orderMore')}</RNText>
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
                    {t('restaurantMenu.openBillUpper')}
                  </RNText>
                  <RNText style={styles.billSummaryTitle}>
                    {t('restaurantMenu.tablePrefix')} {lockedBillTableNumber || t('restaurantMenu.locked')}
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
                <RNText style={styles.billTotalLabel}>{t('restaurantMenu.currentSubtotal')}</RNText>
                <RNText style={styles.billTotalValue}>
                  {formatCurrency(activeBillTotal)}
                </RNText>
              </RNView>
              <RNView style={styles.billTotalRow}>
                <RNText style={styles.billTotalLabel}>{t('restaurantMenu.addingItems')}</RNText>
                <RNText style={styles.billTotalValue}>
                  {formatCurrency(cartItemsTotal)}
                </RNText>
              </RNView>
              <RNView style={[styles.billTotalRow, styles.billGrandTotalRow]}>
                <RNText style={styles.billGrandTotalLabel}>
                  {t('restaurantMenu.estimatedAfterOrder')}
                </RNText>
                <RNText style={styles.billGrandTotalValue}>
                  {formatCurrency(estimatedBillTotal)}
                </RNText>
              </RNView>
            </RNView>
          ) : (
            <RNView style={styles.totalRow}>
              <RNText style={styles.totalLabel}>{t('restaurantMenu.cartTotal')}</RNText>
              <RNText style={styles.totalValue}>
                {formatCurrency(cartItemsTotal)}
              </RNText>
            </RNView>
          )}

          <RNView style={styles.infoSection}>
            <RNView style={styles.cartScopeCard}>
              <RNText style={styles.cartScopeLabel}>{t('restaurantMenu.activeMenuUpper')}</RNText>
              <RNText numberOfLines={1} style={styles.cartScopeTitle}>
                {customerContext?.restaurantName || t('restaurantMenu.restaurantFromQr')}
              </RNText>
              <RNText numberOfLines={1} style={styles.cartScopeSubTitle}>
                {customerContext?.branchName || t('restaurantMenu.branchFromQr')}
              </RNText>
            </RNView>

            {hasLockedBillSession ? (
              <RNView style={styles.lockedTableCard}>
                <RNText style={styles.lockedTableLabel}>{t('restaurantMenu.lockedTableUpper')}</RNText>
                <RNText style={styles.lockedTableNumber}>
                  {lockedBillTableNumber || t('restaurantMenu.receivedByBill')}
                </RNText>
                <RNText style={styles.lockedTableHint}>
                  {t('restaurantMenu.lockedTableHint')}
                </RNText>
              </RNView>
            ) : (
              <>
                {branchTables.length > 0 ? (
                  <RNView style={styles.tablePickerSection}>
                    <RNText style={styles.tablePickerTitle}>
                      {t('restaurantMenu.quickChooseTable')}
                    </RNText>
                    <RNView style={styles.tableChipRow}>
                      {sortedBranchTables.map(table => {
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
                    </RNView>
                  </RNView>
                ) : branchTablesLoading ? (
                  <RNText style={styles.tablePickerHint}>
                    {t('restaurantMenu.loadingTables')}
                  </RNText>
                ) : (
                  <RNText style={styles.tablePickerHint}>
                    {t('restaurantMenu.tableManualHint')}
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
                    <RNText style={styles.inputLabel}>{t('restaurantMenu.tableNumberUpper')}</RNText>
                    <RNText
                      numberOfLines={1}
                      style={[
                        styles.cartDisplayValue,
                        !tableNumber ? styles.cartDisplayPlaceholder : null,
                      ]}>
                      {tableNumber || t('restaurantMenu.tablePlaceholder')}
                    </RNText>
                  </Pressable>
                ) : (
                  <RNView
                    style={[
                      styles.inputWrap,
                      tableError ? styles.inputWrapError : null,
                    ]}>
                    <RNText style={styles.inputLabel}>{t('restaurantMenu.tableNumberUpper')}</RNText>
                    <TextInput
                      value={tableNumber}
                      editable={!cartSubmitting}
                      onChangeText={handleTableChange}
                      onBlur={commitInputs}
                      placeholder={t('restaurantMenu.tablePlaceholder')}
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
                <RNText style={styles.inputLabel}>{t('restaurantMenu.noteUpper')}</RNText>
                <RNText
                  numberOfLines={3}
                  style={[
                    styles.cartDisplayValue,
                    styles.cartDisplayValueMultiline,
                    !note ? styles.cartDisplayPlaceholder : null,
                  ]}>
                  {note || t('restaurantMenu.notePlaceholder')}
                </RNText>
              </Pressable>
            ) : (
              <RNView style={styles.inputWrap}>
                <RNText style={styles.inputLabel}>{t('restaurantMenu.noteUpper')}</RNText>
                <TextInput
                  value={note}
                  onChangeText={handleNoteChange}
                  onBlur={commitInputs}
                  placeholder={t('restaurantMenu.notePlaceholder')}
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
                  {t('restaurantMenu.submittingOrder')}
                </RNText>
              </RNView>
            ) : (
              <RNText style={styles.primaryButtonText}>
                {cartRows.length === 0
                  ? hasOpenBillSession
                    ? t('restaurantMenu.orderMore')
                    : t('restaurantMenu.chooseFromMenu')
                  : hasOpenBillSession
                    ? t('restaurantMenu.submitAddOnOrder')
                    : t('restaurantMenu.submitOrder')}
              </RNText>
            )}
          </Pressable>
        </RNView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default memo(RestaurantCartScreen);
