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
import {createRestaurantOrder} from 'services/restaurantMenuStorage';
import type {RestaurantMenuItem} from 'services/restaurantMenuStorage';
import {useRestaurantCartStore} from '../../stores/RestaurantCartStore';
import {useRestaurantMenuStore} from '../../stores/RestaurantMenuStore';
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

const normalizeTableInput = (value: string) => {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ');
};

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
    setCart,
    setCartSubmitting,
    hydrateCartFromStorage,
    persistCurrentCart,
    clearCart,
    changeQuantity,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
  } = useRestaurantCartStore();
  const {items, refreshMenuData} = useRestaurantMenuStore();

  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const [tableError, setTableError] = useState('');
  const [cartError, setCartError] = useState('');
  const [message, setMessage] = useState('');
  const submitLockRef = useRef(false);
  const tableNumberRef = useRef('');
  const noteRef = useRef('');

  const syncInputsFromCart = useCallback(() => {
    const activeCart = getActiveCart();
    const nextTableNumber = activeCart.tableNumber || '';
    const nextNote = activeCart.note || '';
    tableNumberRef.current = nextTableNumber;
    noteRef.current = nextNote;
    setTableNumber(nextTableNumber);
    setNote(nextNote);
  }, [getActiveCart]);

  const refreshData = useCallback(async () => {
    const [, menuResult] = await Promise.all([
      hydrateCartFromStorage(),
      refreshMenuData(),
    ]);

    updateMenuItemSnapshot(menuResult.items);
    syncInputsFromCart();
  }, [
    hydrateCartFromStorage,
    refreshMenuData,
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

  const cartRows = useMemo(() => {
    return cart.items
      .map(cartItem => {
        const menuItem =
          items.find(item => item.id === cartItem.itemId) ||
          getSnapshotMenuItem(cartItem.itemId);

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
  }, [cart.items, getSnapshotMenuItem, items]);

  const total = useMemo(
    () => cartRows.reduce((result, row) => result + row.lineTotal, 0),
    [cartRows],
  );

  const commitInputs = useCallback(() => {
    const activeCart = getActiveCart();
    const nextCart = {
      ...activeCart,
      tableNumber: normalizeTableInput(tableNumberRef.current).trim(),
      note: noteRef.current,
    };

    setCart(nextCart);
    void persistCurrentCart(nextCart);
    return nextCart;
  }, [getActiveCart, persistCurrentCart, setCart]);

  const handleGoBack = useCallback(() => {
    commitInputs();
    Keyboard.dismiss();
    props.goBack();
  }, [commitInputs, props]);

  const handleTableChange = useCallback((value: string) => {
    const nextValue = normalizeTableInput(value);
    tableNumberRef.current = nextValue;
    setTableNumber(nextValue);

    if (nextValue.trim()) {
      setTableError('');
    }
  }, []);

  const handleNoteChange = useCallback((value: string) => {
    noteRef.current = value;
    setNote(value);
  }, []);

  const handleQuantity = useCallback(
    (itemId: string, delta: number) => {
      changeQuantity(itemId, delta);
      setCartError('');
    },
    [changeQuantity],
  );

  const handleSubmit = useCallback(async () => {
    if (cartSubmitting || submitLockRef.current) {
      return;
    }

    const activeCart = commitInputs();
    const cleanTableNumber = activeCart.tableNumber.trim();

    if (cartRows.length === 0) {
      setCartError('Vui lòng chọn món trước khi gửi đơn.');
      setTableError('');
      return;
    }

    if (!cleanTableNumber) {
      setTableError('Vui lòng nhập số bàn.');
      setCartError('');
      return;
    }

    const invalidRows = cartRows.filter(
      row => row.item.status !== 'SELLING' || row.item.available === false,
    );

    if (invalidRows.length > 0) {
      setCartError(
        'Có món đã hết hàng hoặc bị ẩn. Vui lòng xoá món đó khỏi giỏ.',
      );
      setTableError('');
      return;
    }

    const orderItems = cartRows.map(row => ({
      itemId: row.item.id,
      name: row.item.name,
      price: row.item.price,
      quantity: row.quantity,
    }));

    submitLockRef.current = true;
    setCartSubmitting(true);
    setCartError('');
    setMessage('');

    try {
      const nextOrders = await createRestaurantOrder({
        tableNumber: cleanTableNumber,
        note: activeCart.note.trim(),
        items: orderItems,
        total,
      });
      const createdOrder = nextOrders[0];
      const shortOrderId = String(createdOrder?.id || '')
        .slice(-6)
        .toUpperCase();

      await clearCart();
      setTableNumber('');
      setNote('');
      setTableError('');
      setCartError('');
      setMessage(
        shortOrderId
          ? `Đã gửi đơn #${shortOrderId} cho bàn ${cleanTableNumber}.`
          : `Đã gửi đơn cho bàn ${cleanTableNumber}.`,
      );
      Keyboard.dismiss();
      props.goBack();
    } catch (error) {
      setCartError('Không thể gửi đơn. Vui lòng thử lại.');
    } finally {
      submitLockRef.current = false;
      setCartSubmitting(false);
    }
  }, [
    cartRows,
    cartSubmitting,
    clearCart,
    commitInputs,
    props,
    setCartSubmitting,
    total,
  ]);

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
              onPress={() => handleQuantity(row.itemId, -1)}
              style={styles.quantityButtonSmall}>
              <RNText style={styles.quantityButtonText}>−</RNText>
            </Pressable>
            <RNText style={styles.quantityTextSmall}>{row.quantity}</RNText>
            <Pressable
              disabled={!canIncrease}
              onPress={() => handleQuantity(row.itemId, 1)}
              style={[
                styles.quantityButtonSmall,
                !canIncrease ? styles.disabledButton : null,
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
              {cartRows.length} loại món · {formatCurrency(total)}
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
              <RNText style={styles.emptyText}>Giỏ hàng đang trống</RNText>
              <RNText style={styles.emptySubText}>
                Chọn món trong menu để tạo đơn gọi món.
              </RNText>
            </RNView>
          ) : (
            cartRows.map(renderCartRow)
          )}

          <RNView style={styles.totalRow}>
            <RNText style={styles.totalLabel}>Tổng hoá đơn</RNText>
            <RNText style={styles.totalValue}>{formatCurrency(total)}</RNText>
          </RNView>

          <RNView style={styles.infoSection}>
            <RNView
              style={[
                styles.inputWrap,
                tableError ? styles.inputWrapError : null,
              ]}>
              <RNText style={styles.inputLabel}>SỐ BÀN</RNText>
              <TextInput
                value={tableNumber}
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
            {tableError ? (
              <RNText style={styles.fieldErrorText}>{tableError}</RNText>
            ) : null}

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
          </RNView>

          {cartError ? (
            <RNText style={styles.fieldErrorText}>{cartError}</RNText>
          ) : null}
        </ScrollView>

        <RNView style={styles.footer}>
          <Pressable
            disabled={cartSubmitting}
            onPress={handleSubmit}
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
              <RNText style={styles.primaryButtonText}>Gửi đơn</RNText>
            )}
          </Pressable>
        </RNView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default memo(RestaurantCartScreen);
