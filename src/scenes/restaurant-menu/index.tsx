import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View as RNView,
  Image as RNImage,
} from 'react-native';
import type {ImageResizeMode, ImageStyle, StyleProp} from 'react-native';
import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {screens} from 'scenes/screens';
import {Navigation} from 'types/navigation';

import {
  createRestaurantOrder,
  getCategoryNameById,
} from 'services/restaurantMenuStorage';
import {
  getMenuItemImageValue,
  getRestaurantMenuImageSource,
} from 'services/restaurantMenuImage';
import {useRestaurantCartStore} from '../../stores/RestaurantCartStore';
import {useRestaurantMenuStore} from '../../stores/RestaurantMenuStore';

import type {
  MenuCategory,
  RestaurantCartItem,
  RestaurantCartState,
  RestaurantMenuItem,
} from 'services/restaurantMenuStorage';

import createStyles from './styles';

type Props = Navigation;

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

type RestaurantCartOverlayProps = {
  visible: boolean;
  cart: RestaurantCartState;
  rows: RestaurantCartRow[];
  total: number;
  badgeCount: number;
  tableError: string;
  cartError: string;
  submitting: boolean;
  styles: ReturnType<typeof createStyles>;
  onClose: (draft: CartFieldDraft) => void;
  onSubmit: (draft: CartFieldDraft) => void;
  onChangeQuantity: (itemId: string, delta: number) => void;
  onClearTableError: () => void;
};

const formatCurrency = (value: number) => {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')}đ`;
};

const normalizeTableInput = (value: string) => {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
};

type MenuDishImageProps = {
  itemId: string;
  imageValue: string;
  adminView?: boolean;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

const MenuDishImage = memo(({
  itemId,
  imageValue,
  adminView = false,
  style,
  resizeMode = 'cover',
}: MenuDishImageProps) => {
  void adminView;

  const [failed, setFailed] = useState(false);
  const cleanImageValue = imageValue.trim();

  useEffect(() => {
    setFailed(false);
  }, [cleanImageValue]);

  const source = failed
    ? getRestaurantMenuImageSource()
    : getRestaurantMenuImageSource({imageUrl: cleanImageValue});

  return (
    <RNImage
      key={`${itemId}-${failed ? 'fallback' : cleanImageValue || 'placeholder'}`}
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
});

const RestaurantCartOverlay = memo(({
  visible,
  cart,
  rows,
  total,
  badgeCount,
  tableError,
  cartError,
  submitting,
  styles,
  onClose,
  onSubmit,
  onChangeQuantity,
  onClearTableError,
}: RestaurantCartOverlayProps) => {
  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setTableNumber(cart.tableNumber || '');
      setNote(cart.note || '');
    }

    wasVisibleRef.current = visible;
  }, [cart.note, cart.tableNumber, visible]);

  const getDraft = useCallback((): CartFieldDraft => {
    return {
      tableNumber: normalizeTableInput(tableNumber).trim(),
      note,
    };
  }, [note, tableNumber]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose(getDraft());
  }, [getDraft, onClose]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) {
      return;
    }

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [handleClose, visible]);

  const handleTableChange = useCallback(
    (value: string) => {
      const nextValue = normalizeTableInput(value);
      setTableNumber(nextValue);

      if (tableError && nextValue.trim()) {
        onClearTableError();
      }
    },
    [onClearTableError, tableError],
  );

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    onSubmit(getDraft());
  }, [getDraft, onSubmit]);

  const renderCartRow = (row: RestaurantCartRow) => {
    const canIncrease = row.item.status === 'SELLING' && row.item.available !== false;

    return (
      <RNView key={row.itemId} style={styles.cartRow}>
        <RNView style={styles.cartRowMain}>
          <RNText style={styles.cartItemName}>{row.item.name}</RNText>
          <RNText style={styles.cartMeta}>
            {formatCurrency(row.item.price)} × {row.quantity}
          </RNText>
          {!canIncrease ? (
            <RNText style={styles.fieldErrorText}>Món này hiện không thể đặt thêm.</RNText>
          ) : null}
        </RNView>
        <RNView style={styles.cartRowRight}>
          <RNText style={styles.cartLineTotal}>{formatCurrency(row.lineTotal)}</RNText>
          <RNView style={styles.quantityControlSmall}>
            <Pressable
              onPress={() => onChangeQuantity(row.itemId, -1)}
              style={styles.quantityButtonSmall}>
              <RNText style={styles.quantityButtonText}>−</RNText>
            </Pressable>
            <RNText style={styles.quantityTextSmall}>{row.quantity}</RNText>
            <Pressable
              disabled={!canIncrease}
              onPress={() => onChangeQuantity(row.itemId, 1)}
              style={[styles.quantityButtonSmall, !canIncrease ? {opacity: 0.35} : null]}>
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
                {badgeCount} loại món · {formatCurrency(total)}
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
                <RNText style={styles.emptyText}>Giỏ hàng đang trống</RNText>
                <RNText style={styles.emptySubText}>
                  Chọn món trong menu để tạo đơn gọi món.
                </RNText>
              </RNView>
            ) : (
              rows.map(renderCartRow)
            )}

            <RNView style={styles.totalRow}>
              <RNText style={styles.totalLabel}>Tổng hoá đơn</RNText>
              <RNText style={styles.totalValue}>{formatCurrency(total)}</RNText>
            </RNView>

            <RNView style={styles.cartInfoSection}>
              <RNView style={[styles.inputWrap, tableError ? styles.inputWrapError : null]}>
                <RNText style={styles.inputLabel}>SỐ BÀN</RNText>
                <TextInput
                  value={tableNumber}
                  onChangeText={handleTableChange}
                  placeholder="VD: Bàn 08, VIP1, A12"
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
              {tableError ? <RNText style={styles.fieldErrorText}>{tableError}</RNText> : null}

              <RNView style={styles.inputWrap}>
                <RNText style={styles.inputLabel}>GHI CHÚ</RNText>
                <TextInput
                  value={note}
                  onChangeText={setNote}
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

            {cartError ? <RNText style={styles.fieldErrorText}>{cartError}</RNText> : null}
          </ScrollView>

          <RNView style={styles.cartModalFooter}>
            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.primaryButton, submitting ? {opacity: 0.65} : null]}>
              {submitting ? (
                <RNView style={{flexDirection: 'row', alignItems: 'center', columnGap: 8}}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <RNText style={styles.primaryButtonText}>Đang gửi đơn...</RNText>
                </RNView>
              ) : (
                <RNText style={styles.primaryButtonText}>Gửi đơn</RNText>
              )}
            </Pressable>
          </RNView>
        </RNView>
      </KeyboardAvoidingView>
    </RNView>
  );
});

const RestaurantMenuScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const styles = useMemo(
    () => createStyles(design, {width: adaptive.width, height: adaptive.height}),
    [adaptive.height, adaptive.width, design],
  );
  const isCustomerStacked = adaptive.width < 760;
  const isCompactHeader = adaptive.width < 560;

  const {
    categories,
    items,
    selectedCategoryId,
    setSelectedCategoryId,
    refreshMenuData,
  } = useRestaurantMenuStore();
  const {
    cart,
    cartHydrated,
    cartModalVisible,
    cartSubmitting,
    setCartSubmitting,
    setCart,
    hydrateCartFromStorage,
    persistCurrentCart,
    clearCart,
    changeQuantity: changeCartQuantity,
    setCartModalVisible,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
  } = useRestaurantCartStore();

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tableError, setTableError] = useState('');
  const [cartError, setCartError] = useState('');
  const cartSubmitLockRef = useRef(false);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setErrorMessage('');
  }, []);

  const showError = useCallback((text: string) => {
    setErrorMessage(text);
    setMessage('');
  }, []);

  const refreshData = useCallback(async (source = 'manual') => {
    void source;

    const [, menuResult] = await Promise.all([
      hydrateCartFromStorage(),
      refreshMenuData(),
    ]);

    updateMenuItemSnapshot(menuResult.items);
  }, [hydrateCartFromStorage, refreshMenuData, updateMenuItemSnapshot]);

  useEffect(() => {
    void refreshData('mount');
  }, [refreshData]);

  useFocusEffect(
    useCallback(() => {
      void refreshData('focus');
      return () => {};
    }, [refreshData]),
  );

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    void persistCurrentCart(cart);
  }, [cart, cartHydrated, persistCurrentCart]);

  useEffect(() => {
    updateMenuItemSnapshot(items);
  }, [items, updateMenuItemSnapshot]);

  const selectedCategory = useMemo<MenuCategory | undefined>(() => {
    return categories.find(category => category.id === selectedCategoryId) || categories[0];
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

  const visibleItems = useMemo(() => {
    return items.filter(
      item => item.status !== 'HIDDEN' && item.categoryId === selectedCategory?.id,
    );
  }, [items, selectedCategory?.id]);

  const cartItemMap = useMemo(() => {
    return cart.items.reduce<Record<string, RestaurantCartItem>>((result, item) => {
      result[item.itemId] = item;
      return result;
    }, {});
  }, [cart.items]);

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
          ...cartItem,
          item: menuItem,
          lineTotal: menuItem.price * cartItem.quantity,
        };
      })
      .filter(Boolean) as RestaurantCartRow[];
  }, [cart.items, getSnapshotMenuItem, items]);

  const cartTotal = useMemo(
    () => cartRows.reduce((total, row) => total + row.lineTotal, 0),
    [cartRows],
  );

  const cartBadgeCount = cartRows.length;

  const commitCartFieldsToStore = useCallback(
    (draft: CartFieldDraft) => {
      const activeCart = getActiveCart();
      const tableNumber = normalizeTableInput(draft.tableNumber || '').trim();
      const note = draft.note || '';
      const nextCart = {
        ...activeCart,
        tableNumber,
        note,
      };

      if (activeCart.tableNumber !== tableNumber || activeCart.note !== note) {
        setCart(nextCart);
      }

      return nextCart;
    },
    [getActiveCart, setCart],
  );

  const closeCart = useCallback(
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

  const onSubmitOrder = useCallback(async (draft: CartFieldDraft) => {
    if (cartSubmitting || cartSubmitLockRef.current) {
      return;
    }

    const activeCart = commitCartFieldsToStore(draft);
    const tableNumber = activeCart.tableNumber.trim();

    if (cartRows.length === 0) {
      setCartError('Vui lòng chọn món trước khi gửi đơn.');
      setTableError('');
      return;
    }

    if (!tableNumber) {
      setTableError('Vui lòng nhập số bàn.');
      setCartError('');
      return;
    }

    const invalidRows = cartRows.filter(
      row => row.item.status !== 'SELLING' || row.item.available === false,
    );

    if (invalidRows.length > 0) {
      setCartError('Có món đã hết hàng hoặc bị ẩn. Vui lòng xoá món đó khỏi giỏ.');
      setTableError('');
      return;
    }

    const orderItems = cartRows.map(row => ({
      itemId: row.item.id,
      name: row.item.name,
      price: row.item.price,
      quantity: row.quantity,
    }));

    cartSubmitLockRef.current = true;
    setCartSubmitting(true);

    try {
      const nextOrders = await createRestaurantOrder({
        tableNumber,
        note: activeCart.note.trim(),
        items: orderItems,
        total: cartTotal,
      });
      const createdOrder = nextOrders[0];
      const shortOrderId = String(createdOrder?.id || '').slice(-6).toUpperCase();

      await clearCart();
      setTableError('');
      setCartError('');
      Keyboard.dismiss();
      setCartModalVisible(false);
      showMessage(
        shortOrderId
          ? `Đã gửi đơn #${shortOrderId} cho bàn ${tableNumber}.`
          : `Đã gửi đơn cho bàn ${tableNumber}.`,
      );
    } catch (error) {
      setCartError('Không thể gửi đơn. Vui lòng thử lại.');
      showError('Không thể gửi đơn. Giỏ hàng vẫn được giữ nguyên.');
    } finally {
      cartSubmitLockRef.current = false;
      setCartSubmitting(false);
    }
  }, [
    cartRows,
    cartSubmitting,
    cartTotal,
    clearCart,
    commitCartFieldsToStore,
    setCartModalVisible,
    setCartSubmitting,
    showError,
    showMessage,
  ]);

  const renderNotice = () => {
    if (!message && !errorMessage) {
      return null;
    }

    return (
      <View style={[styles.notice, errorMessage ? styles.errorNotice : null]}>
        <RNText style={styles.noticeText}>{errorMessage || message}</RNText>
      </View>
    );
  };

  const renderTopBar = () => {
    return (
      <View style={styles.topBar}>
        <View style={styles.headerSide}>
          <Pressable onPress={props.goBack} style={styles.backButton}>
            <RNText style={styles.backText}>‹ Về Home</RNText>
          </Pressable>
        </View>

        <View style={styles.headerAuthCenter}>
          <Pressable
            onPress={() =>
              props.navigate(screens.restaurantAdminLogin, {initialMode: 'login'})
            }
            style={styles.headerAuthButton}>
            <RNText style={styles.headerAuthText}>Đăng nhập Admin</RNText>
          </Pressable>
          <Pressable
            onPress={() =>
              props.navigate(screens.restaurantAdminLogin, {initialMode: 'register'})
            }
            style={styles.headerAuthButtonSecondary}>
            <RNText style={styles.headerAuthText}>Đăng ký Admin</RNText>
          </Pressable>
        </View>

        <View style={[styles.headerSide, styles.headerSideRight]}>
          {!isCompactHeader ? (
            <Image source={images.logoSmall} style={styles.headerLogo} resizeMode="contain" />
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

  const renderQuantityOrAdd = (item: RestaurantMenuItem) => {
    const quantity = cartItemMap[item.id]?.quantity || 0;

    if (item.status === 'OUT_OF_STOCK' || item.available === false) {
      return (
        <RNText style={styles.disabledText}>
          {item.status === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Tạm ẩn'}
        </RNText>
      );
    }

    if (quantity <= 0) {
      return (
        <Pressable onPress={() => changeQuantity(item.id, 1)} style={styles.addButton}>
          <RNText style={styles.addButtonText}>+ Thêm</RNText>
        </Pressable>
      );
    }

    return (
      <View style={styles.quantityControl}>
        <Pressable
          onPress={() => changeQuantity(item.id, -1)}
          style={styles.quantityButton}>
          <RNText style={styles.quantityButtonText}>−</RNText>
        </Pressable>
        <RNText style={styles.quantityText}>{quantity}</RNText>
        <Pressable
          onPress={() => changeQuantity(item.id, 1)}
          style={styles.quantityButton}>
          <RNText style={styles.quantityButtonText}>+</RNText>
        </Pressable>
      </View>
    );
  };

  const renderDishCard = (item: RestaurantMenuItem) => {
    const itemImageValue = getMenuItemImageValue(item);

    return (
      <View key={`${item.id}-${itemImageValue || 'no-image'}`} style={styles.dishCard}>
        <View style={styles.dishImageWrap}>
          <MenuDishImage
            itemId={item.id}
            imageValue={itemImageValue}
            style={styles.dishImage}
            resizeMode="cover"
          />
          <View style={styles.dishImageShade} />
          <RNText style={styles.dishCategoryLabel}>
            {getCategoryNameById(item.categoryId, categories)}
          </RNText>
        </View>
        <View style={styles.dishBody}>
          <RNText numberOfLines={1} style={styles.dishName}>
            {item.name}
          </RNText>
          {item.description ? (
            <RNText numberOfLines={2} style={styles.dishDescription}>
              {item.description}
            </RNText>
          ) : null}
          <View style={styles.dishFooter}>
            <RNText style={styles.dishPrice}>{formatCurrency(item.price)}</RNText>
            {renderQuantityOrAdd(item)}
          </View>
        </View>
      </View>
    );
  };

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
            <RNText style={styles.menuCountPill}>{visibleItems.length} món</RNText>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.menuGridContent}>
            {visibleItems.length === 0 ? (
              <View style={styles.emptyState}>
                <RNText style={styles.emptyIcon}>🍽️</RNText>
                <RNText style={styles.emptyText}>Chưa có món trong danh mục này</RNText>
                <RNText style={styles.emptySubText}>
                  Admin có thể thêm món mới trong dashboard.
                </RNText>
              </View>
            ) : (
              <View style={styles.menuGrid}>{visibleItems.map(item => renderDishCard(item))}</View>
            )}
          </ScrollView>
        </View>

        <Pressable onPress={openCart} style={styles.cartBottomBar}>
          <View style={styles.cartBarIconWrap}>
            <RNText style={styles.cartFloatingIcon}>🧺</RNText>
            <View style={styles.cartBadge}>
              <RNText style={styles.cartBadgeText}>{cartBadgeCount}</RNText>
            </View>
          </View>
          <View style={styles.cartBarMain}>
            <RNText style={styles.cartFloatingText}>Giỏ hàng</RNText>
            <RNText style={styles.cartBarSubText}>{cartBadgeCount} loại món</RNText>
          </View>
          <RNText style={styles.cartBarTotal}>{formatCurrency(cartTotal)}</RNText>
        </Pressable>
      </View>
    );
  };

  const renderCartOverlay = () => {
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
        styles={styles}
        onClose={closeCart}
        onSubmit={onSubmitOrder}
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
