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
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View as RNView,
  Image as RNImage,
} from 'react-native';
import type {
  ImageResizeMode,
  ImageStyle,
  ListRenderItem,
  StyleProp,
} from 'react-native';
import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {screens} from 'scenes/screens';
import {devWarn} from 'utils/devLogger';
import {
  getScoreMenuErrorMessage,
  logScoreMenuError,
} from 'utils/scoremenuErrors';
import {Navigation} from 'types/navigation';

import {getRestaurantAdminSession} from 'services/restaurantAdminAuthService';
import {loadPublicTablesByQrToken} from 'services/restaurantMenuRepository';
import {
  getMenuItemImageValue,
  resolveRestaurantMenuImage,
} from 'services/restaurantMenuImage';
import {
  normalizeRestaurantTableNumber,
  useRestaurantCartStore,
} from '../../stores/RestaurantCartStore';
import {useRestaurantMenuStore} from '../../stores/RestaurantMenuStore';
import {useCustomerMenuSessionStore} from '../../stores/CustomerMenuSessionStore';

import type {
  MenuCategory,
  RestaurantBillSessionStatus,
  RestaurantCartItem,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantTable,
} from 'services/restaurantMenuRepository';

import createStyles from './styles';

type Props = Navigation & {
  /** QR/deep-link token of restaurant/branch menu. */
  qrToken?: string;
  menuQrToken?: string;
  tableToken?: string;
  tableQrToken?: string;
};

type CartFieldDraft = {
  tableNumber: string;
  note: string;
};

type RestaurantCartRow = {
  itemId: string;
  quantity: number;
  item: RestaurantMenuItem;
  lineTotal: number;
};

type RestaurantDishCardProps = {
  item: RestaurantMenuItem;
  categoryName: string;
  quantity: number;
  styles: ReturnType<typeof createStyles>;
  onChangeQuantity: (itemId: string, delta: number) => void;
};

type RestaurantCartOverlayProps = {
  visible: boolean;
  cart: RestaurantCartState;
  rows: RestaurantCartRow[];
  total: number;
  badgeCount: number;
  tableError: string;
  cartError: string;
  submitting: boolean;
  tableLocked: boolean;
  billSessionId?: string;
  lockedTableNumber?: string;
  billStatus?: RestaurantBillSessionStatus;
  billTotal?: number;
  branchTables: RestaurantTable[];
  branchTablesLoading: boolean;
  restaurantName?: string;
  branchName?: string;
  styles: ReturnType<typeof createStyles>;
  onClose: (draft: CartFieldDraft) => void;
  onSubmit: (draft: CartFieldDraft) => void;
  onContinueOrdering: (draft: CartFieldDraft) => void;
  onDraftChange: (draft: CartFieldDraft) => void;
  onChangeQuantity: (itemId: string, delta: number) => void;
  onClearTableError: () => void;
};

const formatCurrency = (value: number) => {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')}đ`;
};

const normalizeTableInput = normalizeRestaurantTableNumber;

const AndroidCartInputModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

type MenuDishImageProps = {
  itemId: string;
  imageValue: string;
  adminView?: boolean;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

const MenuDishImage = memo(
  ({
    itemId,
    imageValue,
    adminView = false,
    style,
    resizeMode = 'cover',
  }: MenuDishImageProps) => {
    void adminView;

    const [failed, setFailed] = useState(false);
    const imageResolution = useMemo(
      () =>
        resolveRestaurantMenuImage(
          {imageUrl: imageValue},
          {forceFallback: failed, cacheKey: itemId},
        ),
      [failed, imageValue, itemId],
    );

    useEffect(() => {
      setFailed(false);
    }, [imageValue]);

    return (
      <RNImage
        key={imageResolution.cacheKey}
        source={imageResolution.source}
        style={style}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
      />
    );
  },
);

const RestaurantDishCard = memo(
  ({
    item,
    categoryName,
    quantity,
    styles,
    onChangeQuantity,
  }: RestaurantDishCardProps) => {
    const itemImageValue = useMemo(() => getMenuItemImageValue(item), [item]);
    const isOutOfStock =
      item.status === 'OUT_OF_STOCK' || item.available === false;

    const handleAdd = useCallback(() => {
      onChangeQuantity(item.id, 1);
    }, [item.id, onChangeQuantity]);

    const handleDecrease = useCallback(() => {
      onChangeQuantity(item.id, -1);
    }, [item.id, onChangeQuantity]);

    const handleIncrease = useCallback(() => {
      onChangeQuantity(item.id, 1);
    }, [item.id, onChangeQuantity]);

    const renderQuantityOrAdd = () => {
      if (isOutOfStock) {
        return (
          <RNText style={styles.disabledText}>
            {item.status === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Tạm ẩn'}
          </RNText>
        );
      }

      if (quantity <= 0) {
        return (
          <Pressable onPress={handleAdd} style={styles.addButton}>
            <RNText style={styles.addButtonText}>+ Thêm</RNText>
          </Pressable>
        );
      }

      return (
        <RNView style={styles.quantityControl}>
          <Pressable onPress={handleDecrease} style={styles.quantityButton}>
            <RNText style={styles.quantityButtonText}>−</RNText>
          </Pressable>
          <RNText style={styles.quantityText}>{quantity}</RNText>
          <Pressable onPress={handleIncrease} style={styles.quantityButton}>
            <RNText style={styles.quantityButtonText}>+</RNText>
          </Pressable>
        </RNView>
      );
    };

    return (
      <RNView style={styles.dishCard}>
        <RNView style={styles.dishImageWrap}>
          <MenuDishImage
            itemId={item.id}
            imageValue={itemImageValue}
            style={styles.dishImage}
            resizeMode="cover"
          />
          <RNView style={styles.dishImageShade} />
          <RNText style={styles.dishCategoryLabel}>{categoryName}</RNText>
        </RNView>
        <RNView style={styles.dishBody}>
          <RNText numberOfLines={1} style={styles.dishName}>
            {item.name}
          </RNText>
          {item.description ? (
            <RNText numberOfLines={2} style={styles.dishDescription}>
              {item.description}
            </RNText>
          ) : null}
          <RNView style={styles.dishFooter}>
            <RNText style={styles.dishPrice}>
              {formatCurrency(item.price)}
            </RNText>
            {renderQuantityOrAdd()}
          </RNView>
        </RNView>
      </RNView>
    );
  },
  (prev: RestaurantDishCardProps, next: RestaurantDishCardProps) => {
    return (
      prev.item === next.item &&
      prev.categoryName === next.categoryName &&
      prev.quantity === next.quantity &&
      prev.styles === next.styles &&
      prev.onChangeQuantity === next.onChangeQuantity
    );
  },
);

const RestaurantCartOverlay = memo(
  ({
    visible,
    cart,
    rows,
    total,
    badgeCount,
    tableError,
    cartError,
    submitting,
    tableLocked,
    billSessionId,
    lockedTableNumber,
    billStatus,
    billTotal,
    branchTables,
    branchTablesLoading,
    restaurantName,
    branchName,
    styles,
    onClose,
    onSubmit,
    onContinueOrdering,
    onDraftChange,
    onChangeQuantity,
    onClearTableError,
  }: RestaurantCartOverlayProps) => {
    const [tableNumber, setTableNumber] = useState('');
    const [note, setNote] = useState('');
    const tableNumberRef = useRef('');
    const noteRef = useRef('');
    const wasVisibleRef = useRef(false);
    const visibleTables = branchTables.filter(
      table => table.status !== 'HIDDEN',
    );
    const lockedByBill = Boolean(billSessionId);
    const activeBillTotal = Math.max(0, billTotal || 0);
    const lockedBillTableNumber =
      lockedTableNumber || cart.lockedTableNumber || cart.tableNumber || '';
    const effectiveTableNumber = lockedByBill
      ? lockedBillTableNumber
      : tableNumber;
    const estimatedBillTotal = lockedByBill ? activeBillTotal + total : total;
    const billStatusText =
      billStatus === 'PAYMENT_REQUESTED'
        ? 'Đang yêu cầu thanh toán'
        : billStatus === 'OPEN'
          ? 'Đang mở'
          : billStatus || '';

    useEffect(() => {
      if (visible && !wasVisibleRef.current) {
        const nextTableNumber = lockedByBill
          ? lockedBillTableNumber
          : cart.tableNumber || '';
        const nextNote = cart.note || '';
        tableNumberRef.current = nextTableNumber;
        noteRef.current = nextNote;
        setTableNumber(nextTableNumber);
        setNote(nextNote);
      }

      wasVisibleRef.current = visible;
    }, [
      cart.note,
      cart.tableNumber,
      lockedBillTableNumber,
      lockedByBill,
      visible,
    ]);

    const getDraft = useCallback((): CartFieldDraft => {
      return {
        tableNumber: normalizeTableInput(tableNumberRef.current).trim(),
        note: noteRef.current,
      };
    }, []);

    const handleClose = useCallback(() => {
      Keyboard.dismiss();
      onClose(getDraft());
    }, [getDraft, onClose]);

    useEffect(() => {
      if (Platform.OS !== 'android' || !visible) {
        return;
      }

      const backSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleClose();
          return true;
        },
      );

      return () => {
        backSubscription.remove();
      };
    }, [handleClose, visible]);

    const handleTableChange = useCallback(
      (value: string) => {
        if (lockedByBill || tableLocked) {
          return;
        }

        const nextValue = normalizeTableInput(value);
        tableNumberRef.current = nextValue;
        setTableNumber(nextValue);
        onDraftChange({
          tableNumber: nextValue,
          note: noteRef.current,
        });

        if (tableError && nextValue.trim()) {
          onClearTableError();
        }
      },
      [lockedByBill, onClearTableError, onDraftChange, tableError, tableLocked],
    );

    const handleNoteChange = useCallback(
      (value: string) => {
        noteRef.current = value;
        setNote(value);
        onDraftChange({
          tableNumber: tableNumberRef.current,
          note: value,
        });
      },
      [onDraftChange],
    );

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
      if (lockedByBill || tableLocked) {
        return;
      }

      try {
        const nextValue = await showNativeCartInput({
          title: 'Nhập số bàn',
          placeholder: 'VD: Bàn 08, VIP1, A12',
          initialValue: tableNumberRef.current,
          keyboardType: 'text',
          source: 'restaurant-cart-table',
        });

        if (typeof nextValue === 'string') {
          handleTableChange(nextValue);
        }
      } catch (error) {
        devWarn('[RestaurantCartOverlay] native table input failed', error);
      }
    }, [handleTableChange, lockedByBill, showNativeCartInput, tableLocked]);

    const openNoteInput = useCallback(async () => {
      try {
        const nextValue = await showNativeCartInput({
          title: 'Nhập ghi chú',
          placeholder: 'Thêm ghi chú cho đơn hàng',
          initialValue: noteRef.current,
          keyboardType: 'note',
          source: 'restaurant-cart-note',
        });

        if (typeof nextValue === 'string') {
          handleNoteChange(nextValue);
        }
      } catch (error) {
        devWarn('[RestaurantCartOverlay] native note input failed', error);
      }
    }, [handleNoteChange, showNativeCartInput]);

    const handleSubmit = useCallback(() => {
      Keyboard.dismiss();
      onSubmit(getDraft());
    }, [getDraft, onSubmit]);

    const handleContinueOrdering = useCallback(() => {
      Keyboard.dismiss();
      onContinueOrdering(getDraft());
    }, [getDraft, onContinueOrdering]);

    const renderCartRow = (row: RestaurantCartRow) => {
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
                disabled={submitting}
                onPress={() => onChangeQuantity(row.itemId, -1)}
                style={[
                  styles.quantityButtonSmall,
                  submitting ? {opacity: 0.45} : null,
                ]}>
                <RNText style={styles.quantityButtonText}>−</RNText>
              </Pressable>
              <RNText style={styles.quantityTextSmall}>{row.quantity}</RNText>
              <Pressable
                disabled={submitting || !canIncrease}
                onPress={() => onChangeQuantity(row.itemId, 1)}
                style={[
                  styles.quantityButtonSmall,
                  submitting || !canIncrease ? {opacity: 0.35} : null,
                ]}>
                <RNText style={styles.quantityButtonText}>+</RNText>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      );
    };

    if (!visible) {
      return null;
    }

    return (
      <RNView pointerEvents="auto" style={styles.cartModalRoot}>
        <RNView pointerEvents="none" style={styles.cartModalDimLayer} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.cartModalKeyboardLayer}>
          <RNView style={styles.cartModalCard}>
            <RNView style={styles.cartModalHeader}>
              <RNView>
                <RNText style={styles.cartModalTitle}>Giỏ hàng</RNText>
                <RNText style={styles.cartModalSubTitle}>
                  {lockedByBill
                    ? `Hóa đơn đang mở · ${formatCurrency(estimatedBillTotal)}`
                    : `${badgeCount} loại món · ${formatCurrency(total)}`}
                </RNText>
              </RNView>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <RNText style={styles.closeButtonText}>×</RNText>
              </Pressable>
            </RNView>

            <ScrollView
              style={styles.cartList}
              contentContainerStyle={styles.cartListContent}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              {rows.length === 0 ? (
                <RNView style={styles.emptyState}>
                  <RNText style={styles.emptyIcon}>🧺</RNText>
                  <RNText style={styles.emptyText}>
                    {lockedByBill
                      ? 'Giỏ gọi thêm đang trống'
                      : 'Giỏ hàng đang trống'}
                  </RNText>
                  <RNText style={styles.emptySubText}>
                    {lockedByBill
                      ? `Bàn ${lockedBillTableNumber || ''} đã khóa theo hóa đơn. Chọn thêm món từ menu khi cần gọi tiếp.`
                      : 'Chọn món trong menu để tạo đơn gọi món.'}
                  </RNText>
                  {lockedByBill ? (
                    <Pressable
                      onPress={handleContinueOrdering}
                      style={styles.emptyActionButton}>
                      <RNText style={styles.emptyActionText}>
                        Gọi thêm món
                      </RNText>
                    </Pressable>
                  ) : null}
                </RNView>
              ) : (
                rows.map(renderCartRow)
              )}

              {lockedByBill ? (
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
                    <RNText style={styles.billTotalLabel}>
                      Tạm tính hiện tại
                    </RNText>
                    <RNText style={styles.billTotalValue}>
                      {formatCurrency(activeBillTotal)}
                    </RNText>
                  </RNView>
                  <RNView style={styles.billTotalRow}>
                    <RNText style={styles.billTotalLabel}>
                      Món đang gọi thêm
                    </RNText>
                    <RNText style={styles.billTotalValue}>
                      {formatCurrency(total)}
                    </RNText>
                  </RNView>
                  <RNView
                    style={[styles.billTotalRow, styles.billGrandTotalRow]}>
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
                    {formatCurrency(total)}
                  </RNText>
                </RNView>
              )}

              <RNView style={styles.cartInfoSection}>
                <RNView style={styles.cartScopeCard}>
                  <RNText style={styles.cartScopeLabel}>MENU ĐANG GỌI</RNText>
                  <RNText numberOfLines={1} style={styles.cartScopeTitle}>
                    {restaurantName || 'Nhà hàng từ QR'}
                  </RNText>
                  <RNText numberOfLines={1} style={styles.cartScopeSubTitle}>
                    {branchName || 'Chi nhánh từ QR'}
                  </RNText>
                </RNView>

                {lockedByBill ? (
                  <RNView style={styles.lockedTableCard}>
                    <RNText style={styles.lockedTableLabel}>BÀN ĐÃ KHÓA</RNText>
                    <RNText style={styles.lockedTableNumber}>
                      {lockedBillTableNumber || 'Đã nhận theo hóa đơn'}
                    </RNText>
                    <RNText style={styles.lockedTableHint}>
                      Bàn được khóa sau lần gọi đầu. Khách không thể đổi bàn từ
                      giỏ hàng; nếu cần chuyển bàn hãy gọi nhân viên.
                    </RNText>
                  </RNView>
                ) : (
                  <>
                    {visibleTables.length > 0 && !tableLocked ? (
                      <RNView style={styles.tablePickerSection}>
                        <RNText style={styles.tablePickerTitle}>
                          Chọn nhanh bàn trong chi nhánh
                        </RNText>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          keyboardShouldPersistTaps="always"
                          contentContainerStyle={styles.tableChipRow}>
                          {visibleTables.map(table => {
                            const selected =
                              normalizeTableInput(
                                table.tableNumber,
                              ).toLowerCase() ===
                              normalizeTableInput(tableNumber).toLowerCase();
                            const disabled =
                              submitting || table.status === 'LOCKED';

                            return (
                              <Pressable
                                key={table.id}
                                disabled={disabled}
                                onPress={() =>
                                  handleTableChange(table.tableNumber)
                                }
                                style={[
                                  styles.tableChip,
                                  selected ? styles.tableChipActive : null,
                                  disabled ? styles.tableChipDisabled : null,
                                ]}>
                                <RNText
                                  style={[
                                    styles.tableChipText,
                                    selected
                                      ? styles.tableChipTextActive
                                      : null,
                                  ]}>
                                  {table.tableNumber}
                                </RNText>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </RNView>
                    ) : branchTablesLoading && !tableLocked ? (
                      <RNText style={styles.tablePickerHint}>
                        Đang tải danh sách bàn...
                      </RNText>
                    ) : tableLocked ? null : (
                      <RNText style={styles.tablePickerHint}>
                        Nhập số bàn được nhân viên/biển bàn cung cấp.
                      </RNText>
                    )}

                    {Platform.OS === 'android' ? (
                      <Pressable
                        disabled={submitting || tableLocked}
                        onPress={openTableInput}
                        style={[
                          styles.inputWrap,
                          styles.cartDisplayField,
                          tableError ? styles.inputWrapError : null,
                        ]}>
                        <RNText style={styles.inputLabel}>
                          {tableLocked ? 'BÀN TỪ QR' : 'SỐ BÀN'}
                        </RNText>
                        <RNText
                          numberOfLines={1}
                          style={[
                            styles.cartDisplayValue,
                            !effectiveTableNumber
                              ? styles.cartDisplayPlaceholder
                              : null,
                          ]}>
                          {effectiveTableNumber ||
                            (tableLocked
                              ? 'Đã nhận từ QR bàn'
                              : 'VD: Bàn 08, VIP1, A12')}
                        </RNText>
                      </Pressable>
                    ) : (
                      <RNView
                        style={[
                          styles.inputWrap,
                          tableError ? styles.inputWrapError : null,
                        ]}>
                        <RNText style={styles.inputLabel}>
                          {tableLocked ? 'BÀN TỪ QR' : 'SỐ BÀN'}
                        </RNText>
                        <TextInput
                          value={effectiveTableNumber}
                          onChangeText={handleTableChange}
                          editable={!submitting && !tableLocked}
                          placeholder={
                            tableLocked
                              ? 'Đã nhận từ QR bàn'
                              : 'VD: Bàn 08, VIP1, A12'
                          }
                          placeholderTextColor="rgba(255,255,255,0.42)"
                          keyboardType="default"
                          returnKeyType="done"
                          blurOnSubmit={false}
                          onSubmitEditing={Keyboard.dismiss}
                          autoCorrect={false}
                          autoCapitalize="characters"
                          selectionColor="#E22A32"
                          underlineColorAndroid="transparent"
                          style={styles.input}
                        />
                      </RNView>
                    )}
                    {tableError ? (
                      <RNText style={styles.fieldErrorText}>
                        {tableError}
                      </RNText>
                    ) : null}
                  </>
                )}

                {Platform.OS === 'android' ? (
                  <Pressable
                    disabled={submitting}
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
                      editable={!submitting}
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

            <RNView style={styles.cartModalFooter}>
              <Pressable
                disabled={submitting}
                onPress={
                  rows.length === 0 ? handleContinueOrdering : handleSubmit
                }
                style={[
                  styles.primaryButton,
                  submitting ? {opacity: 0.65} : null,
                ]}>
                {submitting ? (
                  <RNView
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      columnGap: 8,
                    }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <RNText style={styles.primaryButtonText}>
                      Đang gửi đơn...
                    </RNText>
                  </RNView>
                ) : (
                  <RNText style={styles.primaryButtonText}>
                    {rows.length === 0
                      ? lockedByBill
                        ? 'Gọi thêm món'
                        : 'Chọn món từ menu'
                      : lockedByBill
                        ? 'Gửi món gọi thêm'
                        : 'Gửi đơn'}
                  </RNText>
                )}
              </Pressable>
            </RNView>
          </RNView>
        </KeyboardAvoidingView>
      </RNView>
    );
  },
);

const RestaurantMenuScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const styles = useMemo(
    () =>
      createStyles(design, {width: adaptive.width, height: adaptive.height}),
    [adaptive.height, adaptive.width, design],
  );
  const isLandscapeLayout = adaptive.width > adaptive.height;
  const isMenuSidebarLayout =
    adaptive.width >= 760 || (isLandscapeLayout && adaptive.width >= 640);
  const isCustomerStacked = !isMenuSidebarLayout;
  const isCompactHeader = adaptive.width < 560;

  const {
    categories,
    items,
    selectedCategoryId,
    setSelectedCategoryId,
    refreshMenuData,
    refreshPublicMenuData,
  } = useRestaurantMenuStore();
  const {
    context: restaurantContext,
    billSessionId,
    lockedTableNumber,
    billStatus,
    billTotal,
    errorMessage: customerSessionError,
    restoreCustomerMenuSession,
    restoreActiveBillSession,
    enterCustomerMenuQr,
  } = useCustomerMenuSessionStore();
  const {
    cart,
    cartModalVisible,
    cartSubmitting,
    hydrateCartFromStorage,
    changeQuantity: changeCartQuantity,
    commitCartFields,
    setCartModalVisible,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    submitCurrentCartOrder,
  } = useRestaurantCartStore();

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [checkingAdminRoute, setCheckingAdminRoute] = useState(false);
  const [tableError, setTableError] = useState('');
  const [cartError, setCartError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [branchTables, setBranchTables] = useState<RestaurantTable[]>([]);
  const [branchTablesLoading, setBranchTablesLoading] = useState(false);

  const routeQrToken = useMemo(() => {
    return (
      props.qrToken ||
      props.menuQrToken ||
      props.tableToken ||
      props.tableQrToken ||
      ''
    ).trim();
  }, [props.menuQrToken, props.qrToken, props.tableQrToken, props.tableToken]);

  const customerMenuQrToken = useMemo(() => {
    return (
      routeQrToken ||
      restaurantContext?.menuQrToken ||
      restaurantContext?.qrCodeToken ||
      ''
    ).trim();
  }, [
    restaurantContext?.menuQrToken,
    restaurantContext?.qrCodeToken,
    routeQrToken,
  ]);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setErrorMessage('');
  }, []);

  const showError = useCallback((text: string) => {
    setErrorMessage(text);
    setMessage('');
  }, []);

  const refreshData = useCallback(
    async (source = 'manual') => {
      try {
        const contextSnapshot = routeQrToken
          ? await enterCustomerMenuQr(routeQrToken)
          : await restoreCustomerMenuSession();

        if (!contextSnapshot.context) {
          showError(
            contextSnapshot.errorMessage ||
              customerSessionError ||
              'Không xác định được menu nhà hàng. Vui lòng quét lại QR của quán/chi nhánh.',
          );
          logScoreMenuError(
            {
              module: 'QR',
              action: `customer menu context missing:${source}`,
              qrToken: routeQrToken,
              extra: {
                customerSessionError:
                  contextSnapshot.errorMessage || customerSessionError,
              },
            },
            new Error(
              contextSnapshot.errorMessage ||
                customerSessionError ||
                'missing customer menu context',
            ),
          );
          return;
        }

        const context = contextSnapshot.context;
        const publicMenuQrToken = (
          routeQrToken ||
          context.menuQrToken ||
          context.qrCodeToken ||
          ''
        ).trim();
        const shouldLoadPublicMenu =
          context.source === 'customer' && publicMenuQrToken.length > 0;

        const [, menuResult] = await Promise.all([
          hydrateCartFromStorage(),
          shouldLoadPublicMenu
            ? refreshPublicMenuData(publicMenuQrToken)
            : refreshMenuData(),
        ]);

        updateMenuItemSnapshot(menuResult.items);
        void restoreActiveBillSession();
      } catch (error) {
        logScoreMenuError(
          {
            module: 'MENU',
            action: `load customer menu failed:${source}`,
            qrToken: routeQrToken,
            restaurantId: restaurantContext?.restaurantId,
            branchId: restaurantContext?.branchId,
          },
          error,
        );
        showError(
          getScoreMenuErrorMessage(
            error,
            'Không thể tải menu. Vui lòng kiểm tra QR hoặc thử lại.',
          ),
        );
      }
    },
    [
      hydrateCartFromStorage,
      customerSessionError,
      enterCustomerMenuQr,
      refreshMenuData,
      refreshPublicMenuData,
      restoreCustomerMenuSession,
      restoreActiveBillSession,
      routeQrToken,
      restaurantContext?.restaurantId,
      restaurantContext?.branchId,
      showError,
      updateMenuItemSnapshot,
    ],
  );

  // `useFocusEffect` also runs on the first mount. Avoid a second mount
  // refresh here once because QR entry already resolved the same token.
  useFocusEffect(
    useCallback(() => {
      void refreshData('focus');
      return () => {};
    }, [refreshData]),
  );

  useEffect(() => {
    let cancelled = false;

    if (!customerMenuQrToken || !restaurantContext?.branchId) {
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
              table.branchId === restaurantContext.branchId &&
              table.status !== 'HIDDEN',
          ),
        );
      })
      .catch(error => {
        logScoreMenuError(
          {
            module: 'QR',
            action: 'load public tables failed',
            qrToken: customerMenuQrToken,
            restaurantId: restaurantContext?.restaurantId,
            branchId: restaurantContext?.branchId,
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
  }, [customerMenuQrToken, restaurantContext?.branchId]);

  useEffect(() => {
    updateMenuItemSnapshot(items);
  }, [items, updateMenuItemSnapshot]);

  const selectedCategory = useMemo<MenuCategory | undefined>(() => {
    return (
      categories.find(category => category.id === selectedCategoryId) ||
      categories[0]
    );
  }, [categories, selectedCategoryId]);

  const categoryCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((result, item) => {
      if (item.status === 'HIDDEN') {
        return result;
      }

      result[item.categoryId] = (result[item.categoryId] || 0) + 1;
      return result;
    }, {});
  }, [items]);

  const menuItemById = useMemo(() => {
    return items.reduce<Record<string, RestaurantMenuItem>>((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return items.filter(item => {
      if (
        item.status === 'HIDDEN' ||
        item.categoryId !== selectedCategory?.id
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return `${item.name} ${item.description}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [items, searchText, selectedCategory?.id]);

  const categoryNameById = useMemo(() => {
    return categories.reduce<Record<string, string>>((result, category) => {
      result[category.id] = category.name;
      return result;
    }, {});
  }, [categories]);

  const isWideCustomerGrid = adaptive.width >= 980;
  const isTwoColumnCustomerGrid =
    adaptive.width >= 560 || (isMenuSidebarLayout && adaptive.width >= 640);
  const customerMenuColumnCount = isWideCustomerGrid
    ? 3
    : isTwoColumnCustomerGrid
      ? 2
      : 1;

  const cartItemMap = useMemo(() => {
    return cart.items.reduce<Record<string, RestaurantCartItem>>(
      (result, item) => {
        result[item.itemId] = item;
        return result;
      },
      {},
    );
  }, [cart.items]);

  const cartRows = useMemo(() => {
    return cart.items
      .map(cartItem => {
        const menuItem =
          menuItemById[cartItem.itemId] || getSnapshotMenuItem(cartItem.itemId);

        if (!menuItem || cartItem.quantity <= 0) {
          return null;
        }

        return {
          ...cartItem,
          item: menuItem,
          lineTotal: menuItem.price * cartItem.quantity,
        };
      })
      .filter(Boolean) as RestaurantCartRow[];
  }, [cart.items, getSnapshotMenuItem, menuItemById]);

  const cartTotal = useMemo(
    () => cartRows.reduce((total, row) => total + row.lineTotal, 0),
    [cartRows],
  );

  const cartBadgeCount = cartRows.length;
  const hasOpenBillSession = Boolean(
    billSessionId &&
    (billStatus === 'OPEN' || billStatus === 'PAYMENT_REQUESTED'),
  );
  const activeBillTotal = Math.max(0, billTotal || 0);
  const lockedBillTableNumber =
    lockedTableNumber || cart.lockedTableNumber || cart.tableNumber || '';
  const estimatedBillTotal = hasOpenBillSession
    ? activeBillTotal + cartTotal
    : cartTotal;

  const commitCartFieldsToStore = useCallback(
    (draft: CartFieldDraft) => {
      return commitCartFields({
        tableNumber: normalizeTableInput(draft.tableNumber || '').trim(),
        note: draft.note || '',
      });
    },
    [commitCartFields],
  );

  const closeCart = useCallback(
    (draft: CartFieldDraft) => {
      commitCartFieldsToStore(draft);
      Keyboard.dismiss();
      setCartModalVisible(false);
    },
    [commitCartFieldsToStore, setCartModalVisible],
  );

  const continueOrderingFromCart = useCallback(
    (draft: CartFieldDraft) => {
      commitCartFieldsToStore(draft);
      Keyboard.dismiss();
      setCartModalVisible(false);
    },
    [commitCartFieldsToStore, setCartModalVisible],
  );

  const openCart = useCallback(() => {
    setTableError('');
    setCartError('');
    setErrorMessage('');
    setCartModalVisible(true);
  }, [setCartModalVisible]);

  const changeQuantity = useCallback(
    (itemId: string, delta: number) => {
      changeCartQuantity(itemId, delta);
      setCartError('');
    },
    [changeCartQuantity],
  );

  const onSubmitOrder = useCallback(
    async (draft: CartFieldDraft) => {
      if (cartSubmitting) {
        return;
      }

      const activeCart = commitCartFieldsToStore(draft);
      const tableNumber = activeCart.tableNumber.trim();
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

        if (result.reason === 'SUBMIT_FAILED') {
          showError(result.message);
        }
        return;
      }

      const shortOrderId = result.orderId.slice(-6).toUpperCase();

      setTableError('');
      setCartError('');
      Keyboard.dismiss();
      setCartModalVisible(false);
      showMessage(
        shortOrderId
          ? `Đã gửi đơn #${shortOrderId} cho bàn ${result.tableNumber || tableNumber}.`
          : `Đã gửi đơn cho bàn ${result.tableNumber || tableNumber}.`,
      );
    },
    [
      cartSubmitting,
      commitCartFieldsToStore,
      menuItemById,
      setCartModalVisible,
      showError,
      showMessage,
      submitCurrentCartOrder,
    ],
  );

  const renderNotice = () => {
    if (!message && !errorMessage) {
      return null;
    }

    return (
      <View style={[styles.notice, errorMessage ? styles.errorNotice : null]}>
        <RNText style={styles.noticeText}>{errorMessage || message}</RNText>
        {errorMessage ? (
          <Pressable
            onPress={() => void refreshData('retry')}
            style={styles.noticeRetryButton}>
            <RNText style={styles.noticeRetryText}>Thử lại</RNText>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const handleOpenAdmin = useCallback(async () => {
    if (checkingAdminRoute) {
      return;
    }

    setCheckingAdminRoute(true);

    try {
      const session = await getRestaurantAdminSession();

      if (session) {
        props.navigate(screens.restaurantAdminDashboard, {
          adminUsername: session.username,
        });
        return;
      }

      props.navigate(screens.restaurantAdminLogin, {
        initialMode: 'login',
      });
    } catch (error) {
      devWarn('[RestaurantMenu] admin route guard failed', error);
      props.navigate(screens.restaurantAdminLogin, {
        initialMode: 'login',
      });
    } finally {
      setCheckingAdminRoute(false);
    }
  }, [checkingAdminRoute, props]);

  const renderTopBar = () => {
    return (
      <View style={styles.topBar}>
        <View style={styles.headerSide}>
          <Pressable onPress={props.goBack} style={styles.backButton}>
            <RNText style={styles.backText}>‹ Về Home</RNText>
          </Pressable>
        </View>

        <View style={styles.headerAuthCenter}>
          <View style={styles.headerTitleWrap}>
            <RNText numberOfLines={1} style={styles.headerTitle}>
              {restaurantContext?.restaurantName || 'Menu nhà hàng'}
            </RNText>
            <RNText numberOfLines={1} style={styles.headerSubTitle}>
              {restaurantContext?.tableNumber
                ? `Bàn ${restaurantContext.tableNumber}`
                : restaurantContext?.branchName
                  ? restaurantContext.branchName
                  : 'Chọn món và gửi đơn theo đúng nhà hàng'}
            </RNText>
          </View>
          <Pressable
            disabled={checkingAdminRoute}
            onPress={() => void handleOpenAdmin()}
            style={[
              styles.headerAuthButton,
              checkingAdminRoute ? {opacity: 0.65} : null,
            ]}>
            <RNText style={styles.headerAuthText}>
              {checkingAdminRoute ? 'Đang kiểm tra...' : 'Quản trị'}
            </RNText>
          </Pressable>
        </View>

        <View style={[styles.headerSide, styles.headerSideRight]}>
          {!isCompactHeader ? (
            <Image
              source={images.logoSmall}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </View>
    );
  };

  const renderCategoryColumn = () => {
    return (
      <View style={styles.categoryColumn}>
        <View style={styles.categoryHeader}>
          <RNText style={styles.categoryTitle}>Danh mục</RNText>
          <RNText style={styles.categorySubtitle}>Chọn nhóm món</RNText>
        </View>
        <ScrollView
          horizontal={isCustomerStacked}
          style={styles.categoryList}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.categoryListContent,
            isCustomerStacked ? styles.categoryListContentHorizontal : null,
          ]}>
          {categories.map(category => {
            const active = category.id === selectedCategory?.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.categoryItem,
                  isCustomerStacked ? styles.categoryItemHorizontal : null,
                  active ? styles.categoryItemActive : null,
                ]}>
                <RNText style={styles.categoryItemText}>{category.name}</RNText>
                <RNText style={styles.categoryCountText}>
                  {categoryCounts[category.id] || 0} món
                </RNText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const menuListKey = isWideCustomerGrid
    ? 'menu-grid-wide'
    : isTwoColumnCustomerGrid
      ? 'menu-grid-two'
      : 'menu-grid-one';

  const dishCardKeyExtractor = useCallback(
    (item: RestaurantMenuItem) => item.id,
    [],
  );

  const renderDishCard = useCallback<ListRenderItem<RestaurantMenuItem>>(
    ({item}) => {
      return (
        <RestaurantDishCard
          item={item}
          categoryName={categoryNameById[item.categoryId] || 'Khác'}
          quantity={cartItemMap[item.id]?.quantity || 0}
          styles={styles}
          onChangeQuantity={changeQuantity}
        />
      );
    },
    [cartItemMap, categoryNameById, changeQuantity, styles],
  );

  const renderEmptyMenuList = useCallback(() => {
    return (
      <RNView style={styles.emptyState}>
        <RNText style={styles.emptyIcon}>🍽️</RNText>
        <RNText style={styles.emptyText}>Chưa có món trong danh mục này</RNText>
        <RNText style={styles.emptySubText}>
          Admin có thể thêm món mới trong dashboard.
        </RNText>
      </RNView>
    );
  }, [styles]);

  const renderCustomerMenu = () => {
    return (
      <View style={styles.customerShell}>
        {renderCategoryColumn()}
        <View style={styles.menuColumn}>
          <View style={styles.menuColumnHeader}>
            <View style={styles.menuTitleBlock}>
              <RNText style={styles.menuColumnTitle}>
                {selectedCategory?.name || 'Menu'}
              </RNText>
              <RNText style={styles.menuColumnHint}>
                Chọn món nhanh như quầy nhà hàng lớn
              </RNText>
            </View>
            <RNText style={styles.menuCountPill}>
              {visibleItems.length} món
            </RNText>
          </View>

          <RNView style={styles.menuSearchWrap}>
            <RNText style={styles.inputLabel}>TÌM KIẾM MÓN</RNText>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Nhập tên món, đồ uống..."
              placeholderTextColor="rgba(255,255,255,0.42)"
              autoCorrect={false}
              returnKeyType="search"
              selectionColor="#E22A32"
              underlineColorAndroid="transparent"
              style={styles.menuSearchInput}
            />
          </RNView>

          <FlatList
            key={menuListKey}
            data={visibleItems}
            renderItem={renderDishCard}
            keyExtractor={dishCardKeyExtractor}
            numColumns={customerMenuColumnCount}
            columnWrapperStyle={
              customerMenuColumnCount > 1
                ? styles.menuGridColumnWrapper
                : undefined
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.menuGridContent}
            ListEmptyComponent={renderEmptyMenuList}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={48}
            windowSize={7}
            extraData={cartItemMap}
          />
        </View>

        <Pressable onPress={openCart} style={styles.cartBottomBar}>
          <View style={styles.cartBarIconWrap}>
            <RNText style={styles.cartFloatingIcon}>🧺</RNText>
            <View style={styles.cartBadge}>
              <RNText style={styles.cartBadgeText}>{cartBadgeCount}</RNText>
            </View>
          </View>
          <View style={styles.cartBarMain}>
            <RNText style={styles.cartFloatingText}>
              {hasOpenBillSession ? 'Gọi thêm món' : 'Giỏ hàng'}
            </RNText>
            <RNText style={styles.cartBarSubText}>
              {hasOpenBillSession
                ? `Bàn ${lockedBillTableNumber || 'đã khóa'} · ${cartBadgeCount} loại món`
                : `${cartBadgeCount} loại món`}
            </RNText>
          </View>
          <RNText style={styles.cartBarTotal}>
            {formatCurrency(estimatedBillTotal)}
          </RNText>
        </Pressable>
      </View>
    );
  };

  const renderCartOverlay = () => {
    const tableLocked = Boolean(
      restaurantContext?.source === 'customer' &&
      restaurantContext?.qrCodeToken &&
      restaurantContext?.tableId,
    );

    return (
      <RestaurantCartOverlay
        visible={cartModalVisible}
        cart={cart}
        rows={cartRows}
        total={cartTotal}
        badgeCount={cartBadgeCount}
        tableError={tableError}
        cartError={cartError}
        submitting={cartSubmitting}
        tableLocked={tableLocked}
        billSessionId={billSessionId}
        lockedTableNumber={lockedBillTableNumber}
        billStatus={billStatus}
        billTotal={activeBillTotal}
        branchTables={branchTables}
        branchTablesLoading={branchTablesLoading}
        restaurantName={restaurantContext?.restaurantName}
        branchName={restaurantContext?.branchName}
        styles={styles}
        onClose={closeCart}
        onSubmit={onSubmitOrder}
        onContinueOrdering={continueOrderingFromCart}
        onDraftChange={commitCartFieldsToStore}
        onChangeQuantity={changeQuantity}
        onClearTableError={() => setTableError('')}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenGlowTop} />
      <View style={styles.screenGlowBottom} />
      {renderTopBar()}
      {renderNotice()}
      {renderCustomerMenu()}
      {renderCartOverlay()}
    </View>
  );
};

export default memo(RestaurantMenuScreen);
