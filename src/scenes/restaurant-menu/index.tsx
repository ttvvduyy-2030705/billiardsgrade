import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
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
import useScreenSystemUI, {configureSystemUI} from 'theme/systemUI';
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
import {
  useRestaurantCartStore,
  type RestaurantCartFieldType,
} from '../../stores/RestaurantCartStore';
import {useRestaurantMenuStore} from '../../stores/RestaurantMenuStore';

const CartImmersiveModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

import type {
  MenuCategory,
  RestaurantCartItem,
  RestaurantMenuItem,
} from 'services/restaurantMenuStorage';

import createStyles from './styles';

type Props = Navigation;

type CartFieldInputType = RestaurantCartFieldType;

type CartFieldInputState = {
  visible: boolean;
  type: CartFieldInputType;
  draftValue: string;
};

const formatCurrency = (value: number) => {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')}đ`;
};

const createClosedCartFieldInput = (): CartFieldInputState => ({
  visible: false,
  type: 'table',
  draftValue: '',
});

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
    cartDisplayVersion,
    cartSubmitting,
    setCartSubmitting,
    hydrateCartFromStorage,
    persistCurrentCart,
    clearCart,
    changeQuantity: changeCartQuantity,
    commitCartFieldValue,
    setCartModalVisible,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
  } = useRestaurantCartStore();
  const [cartFieldInput, setCartFieldInput] = useState<CartFieldInputState>(
    createClosedCartFieldInput,
  );
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tableError, setTableError] = useState('');
  const [cartError, setCartError] = useState('');
  const [cartFieldKeyboardHeight, setCartFieldKeyboardHeight] = useState(0);
  const cartOpenStartedAtRef = useRef(0);
  const cartFieldInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const cartInputFocusedRef = useRef(false);
  const cartKeyboardVisibleRef = useRef(false);
  const cartFullscreenTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cartFieldInputFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartFieldInputVisibleRef = useRef(false);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setErrorMessage('');
  }, []);

  const clearCartFullscreenTimers = useCallback(() => {
    cartFullscreenTimersRef.current.forEach(timer => clearTimeout(timer));
    cartFullscreenTimersRef.current = [];
  }, []);

  const clearCartFieldInputFocusTimer = useCallback(() => {
    if (cartFieldInputFocusTimerRef.current) {
      clearTimeout(cartFieldInputFocusTimerRef.current);
      cartFieldInputFocusTimerRef.current = null;
    }
  }, []);

  const pauseCartInputImmersive = useCallback((source: string) => {
    if (Platform.OS !== 'android') {
      return;
    }

    CartImmersiveModule?.pauseForCartInput?.(source);
  }, []);

  const resumeCartInputImmersive = useCallback((source: string) => {
    if (Platform.OS !== 'android') {
      return;
    }

    CartImmersiveModule?.resumeAfterCartInput?.(source);
  }, []);

  const showNativeCartFieldDialog = useCallback(
    (
      type: CartFieldInputType,
      initialValue: string,
      source: string,
    ): Promise<string | null> | null => {
      if (Platform.OS !== 'android') {
        return null;
      }

      const nativeDialog = (CartImmersiveModule as any)?.showCartTextInputDialog;
      if (typeof nativeDialog !== 'function') {
        return null;
      }

      const isTable = type === 'table';
      return nativeDialog(
        isTable ? 'Số bàn' : 'Ghi chú',
        isTable ? 'VD: Bàn 08' : 'Nhập ghi chú cho đơn hàng',
        initialValue,
        isTable ? 'text' : 'note',
        source,
      );
    },
    [],
  );

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
      .filter(Boolean) as Array<{
      itemId: string;
      quantity: number;
      item: RestaurantMenuItem;
      lineTotal: number;
    }>;
  }, [cart.items, getSnapshotMenuItem, items]);

  const cartTotal = useMemo(
    () => cartRows.reduce((total, row) => total + row.lineTotal, 0),
    [cartRows],
  );

  const cartBadgeCount = cartRows.length;

  const displayCart = useMemo(() => {
    // cartDisplayVersion forces this memo to refresh immediately after the
    // native Android input dialog writes Số bàn/Ghi chú and closes.
    return getActiveCart();
  }, [cart, cartDisplayVersion, getActiveCart]);

  const closeCart = useCallback(
    (source: string) => {
      clearCartFullscreenTimers();
      clearCartFieldInputFocusTimer();
      Keyboard.dismiss();
      cartFieldInputVisibleRef.current = false;
      setCartFieldInput(current =>
        current.visible ? {...current, visible: false} : current,
      );
      cartInputFocusedRef.current = false;
      cartKeyboardVisibleRef.current = false;
      resumeCartInputImmersive('cart-close-' + source);
      setCartModalVisible(false);
    },
    [
      clearCartFieldInputFocusTimer,
      clearCartFullscreenTimers,
      resumeCartInputImmersive,
      setCartModalVisible,
    ],
  );

  const openCart = useCallback(() => {
    clearCartFullscreenTimers();
    cartOpenStartedAtRef.current = Date.now();
    setTableError('');
    setCartError('');
    setErrorMessage('');
    setCartModalVisible(true);
  }, [clearCartFullscreenTimers, setCartModalVisible]);

  useEffect(() => {
    cartFieldInputVisibleRef.current = cartFieldInput.visible;

    if (cartFieldInput.visible) {
      cartInputFocusedRef.current = true;
    }

    return () => {
      clearCartFieldInputFocusTimer();
    };
  }, [cartFieldInput.visible, clearCartFieldInputFocusTimer]);

  const reinforceFullscreen = useCallback((source: string) => {
    if (
      cartFieldInputVisibleRef.current ||
      cartInputFocusedRef.current ||
      cartKeyboardVisibleRef.current
    ) {
      return;
    }

    configureSystemUI({
      barStyle: 'light-content',
      backgroundColor: 'transparent',
      animated: false,
    });
  }, []);

  const scheduleCartInputRestore = useCallback(
    (source: string, delay = 520) => {
      clearCartFullscreenTimers();

      const restoreWhenClosed = () => {
        if (cartFieldInputVisibleRef.current || cartKeyboardVisibleRef.current) {
          const waitTimer = setTimeout(restoreWhenClosed, 240);
          cartFullscreenTimersRef.current.push(waitTimer);
          return;
        }

        cartInputFocusedRef.current = false;
        resumeCartInputImmersive(source);
        reinforceFullscreen(source);
      };

      const timer = setTimeout(restoreWhenClosed, delay);
      cartFullscreenTimersRef.current.push(timer);
    },
    [clearCartFullscreenTimers, reinforceFullscreen, resumeCartInputImmersive],
  );

  const commitCartFieldInputValue = useCallback(
    (type: CartFieldInputType, value: string) => {
      commitCartFieldValue(type, value);

      if (type === 'table') {
        setTableError('');
      }
    },
    [commitCartFieldValue],
  );

  const openCartFieldInput = useCallback(
    async (type: CartFieldInputType) => {
      const source = `[CartFieldInput] open field: ${type}`;
      const activeCart = getActiveCart();
      const initialValue = type === 'table' ? activeCart.tableNumber : activeCart.note;

      if (cartFieldInputVisibleRef.current) {
        return;
      }

      clearCartFullscreenTimers();
      clearCartFieldInputFocusTimer();

      cartFieldInputVisibleRef.current = true;
      cartInputFocusedRef.current = true;
      cartKeyboardVisibleRef.current = false;
      pauseCartInputImmersive(source);

      setCartFieldKeyboardHeight(0);
      setCartFieldInput({
        visible: true,
        type,
        draftValue: initialValue,
      });

      const nativeDialogPromise = showNativeCartFieldDialog(type, initialValue, source);

      if (!nativeDialogPromise) {
        // Non-Android fallback keeps the existing React overlay path. Android
        // must use the native EditText dialog so CartOverlay cannot steal focus.
        return;
      }

      try {
        const nextValue = await nativeDialogPromise;

        if (typeof nextValue === 'string') {
          commitCartFieldInputValue(type, nextValue);
        } else {
          // User cancelled native input dialog.
        }
      } catch (error) {
        setCartError('Không thể nhập thông tin giỏ hàng. Vui lòng thử lại.');
      } finally {
        clearCartFullscreenTimers();
        clearCartFieldInputFocusTimer();
        setCartFieldKeyboardHeight(0);
        cartFieldInputVisibleRef.current = false;
        cartInputFocusedRef.current = false;
        cartKeyboardVisibleRef.current = false;
        setCartFieldInput(createClosedCartFieldInput());
        Keyboard.dismiss();
        scheduleCartInputRestore('cart-field-native-dialog-closed', 450);
      }
    },
    [
      clearCartFieldInputFocusTimer,
      clearCartFullscreenTimers,
      commitCartFieldInputValue,
      getActiveCart,
      pauseCartInputImmersive,
      scheduleCartInputRestore,
      showNativeCartFieldDialog,
    ],
  );

  const cancelCartFieldInput = useCallback(() => {
    clearCartFieldInputFocusTimer();
    clearCartFullscreenTimers();
    setCartFieldInput(current =>
      current.visible ? {...current, visible: false} : current,
    );
    setCartFieldKeyboardHeight(0);
    cartFieldInputVisibleRef.current = false;
    Keyboard.dismiss();
    scheduleCartInputRestore('cart-field-cancel');
  }, [
    clearCartFieldInputFocusTimer,
    clearCartFullscreenTimers,
    scheduleCartInputRestore,
  ]);

  const saveCartFieldInput = useCallback(() => {
    clearCartFieldInputFocusTimer();
    clearCartFullscreenTimers();
    setCartFieldInput(current => {
      if (!current.visible) {
        return current;
      }

      commitCartFieldInputValue(current.type, current.draftValue);
      return {...current, visible: false};
    });

    setCartFieldKeyboardHeight(0);
    cartFieldInputVisibleRef.current = false;
    Keyboard.dismiss();
    scheduleCartInputRestore('cart-field-commit');
  }, [
    clearCartFieldInputFocusTimer,
    clearCartFullscreenTimers,
    commitCartFieldInputValue,
    scheduleCartInputRestore,
  ]);

  useEffect(() => {
    clearCartFullscreenTimers();

    if (!cartModalVisible) {
      reinforceFullscreen('cart-hidden');
      return;
    }

    // Apply fullscreen once when the cart first opens. Do not schedule delayed
    // immersive calls here: if the user taps Số bàn/Ghi chú immediately after
    // opening the cart, delayed immersive calls can steal TextInput focus and
    // close the IME.
    reinforceFullscreen('cart-visible');

    return () => {
      clearCartFullscreenTimers();
    };
  }, [cartModalVisible, clearCartFullscreenTimers, reinforceFullscreen]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !cartModalVisible) {
      return;
    }

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cartFieldInputVisibleRef.current) {
        cancelCartFieldInput();
        return true;
      }

      closeCart('android-back');
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [cancelCartFieldInput, cartModalVisible, closeCart]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const keyboardShow = Keyboard.addListener('keyboardDidShow', event => {
      clearCartFullscreenTimers();
      cartKeyboardVisibleRef.current = true;
      if (cartFieldInputVisibleRef.current) {
        setCartFieldKeyboardHeight(event.endCoordinates?.height || 0);
        pauseCartInputImmersive('[CartFieldInput] keyboard-show');
      }
      // Do not force immersive while the IME is opening; doing so can
      // steal TextInput focus on Android and immediately dismiss keyboard.
    });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      cartKeyboardVisibleRef.current = false;
      setCartFieldKeyboardHeight(0);

      clearCartFullscreenTimers();

      if (cartFieldInputVisibleRef.current) {
        // The input dock remains open. Do not restore immersive or force refocus
        // here; doing either can create a keyboard show/hide loop on Android.
        cartInputFocusedRef.current = false;
        return;
      }

      scheduleCartInputRestore('[CartFieldInput] keyboard-hide', 320);
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
      clearCartFullscreenTimers();
    };
  }, [
    clearCartFullscreenTimers,
    pauseCartInputImmersive,
    scheduleCartInputRestore,
  ]);

  const changeQuantity = useCallback(
    (itemId: string, delta: number) => {
      changeCartQuantity(itemId, delta);
      setCartError('');
    },
    [changeCartQuantity],
  );

  const onSubmitOrder = useCallback(async () => {
    if (cartSubmitting) {
      return;
    }

    const activeCart = getActiveCart();
    const tableNumber = activeCart.tableNumber.trim();

    if (cartRows.length === 0) {
      setCartError('Vui lòng chọn món');
      setTableError('');
      return;
    }

    if (!tableNumber) {
      setTableError('Vui lòng nhập số bàn');
      setCartError('');
      return;
    }

    const orderItems = cartRows.map(row => ({
      itemId: row.item.id,
      name: row.item.name,
      price: row.item.price,
      quantity: row.quantity,
    }));

    setCartSubmitting(true);

    try {
      await createRestaurantOrder({
        tableNumber,
        note: activeCart.note.trim(),
        items: orderItems,
        total: cartTotal,
      });

      await clearCart();
      setTableError('');
      setCartError('');
      closeCart('submit-success');
      showMessage(`Đã gửi đơn cho bàn ${tableNumber}. Admin/quầy có thể xem ngay.`);
    } finally {
      setCartSubmitting(false);
    }
  }, [
    cartRows,
    cartSubmitting,
    cartTotal,
    clearCart,
    closeCart,
    getActiveCart,
    setCartSubmitting,
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

  const renderCartDisplayField = ({
    label,
    value,
    placeholder,
    onPress,
    multiline = false,
    hasError = false,
  }: {
    label: string;
    value: string;
    placeholder: string;
    onPress: () => void;
    multiline?: boolean;
    hasError?: boolean;
  }) => {
    const displayValue = value.trim();

    return (
      <Pressable
        style={[
          styles.inputWrap,
          styles.cartDisplayField,
          multiline ? styles.cartDisplayFieldMultiline : null,
          hasError ? styles.inputWrapError : null,
        ]}
        onPress={onPress}
        android_disableSound>
        <RNText style={styles.inputLabel}>{label}</RNText>
        <RNText
          style={[
            styles.cartDisplayValue,
            !displayValue ? styles.cartDisplayPlaceholder : null,
            multiline ? styles.cartDisplayValueMultiline : null,
          ]}
          numberOfLines={multiline ? 3 : 1}>
          {displayValue || placeholder}
        </RNText>
      </Pressable>
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

    if (item.status === 'OUT_OF_STOCK' || !item.available) {
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

  const renderCartRow = (row: (typeof cartRows)[number]) => {
    return (
      <View key={row.itemId} style={styles.cartRow}>
        <View style={styles.cartRowMain}>
          <RNText style={styles.cartItemName}>{row.item.name}</RNText>
          <RNText style={styles.cartMeta}>
            {formatCurrency(row.item.price)} × {row.quantity}
          </RNText>
        </View>
        <View style={styles.cartRowRight}>
          <RNText style={styles.cartLineTotal}>{formatCurrency(row.lineTotal)}</RNText>
          <View style={styles.quantityControlSmall}>
            <Pressable
              onPress={() => changeQuantity(row.itemId, -1)}
              style={styles.quantityButtonSmall}>
              <RNText style={styles.quantityButtonText}>−</RNText>
            </Pressable>
            <RNText style={styles.quantityTextSmall}>{row.quantity}</RNText>
            <Pressable
              onPress={() => changeQuantity(row.itemId, 1)}
              style={styles.quantityButtonSmall}>
              <RNText style={styles.quantityButtonText}>+</RNText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderCartFieldInputOverlay = () => {
    if (Platform.OS === 'android') {
      // Android uses a native AlertDialog/EditText launched from
      // CartImmersiveModule.showCartTextInputDialog. Keeping a React Native
      // Modal/TextInput here creates a second window inside immersive mode and
      // is the source of the keyboard show/hide flicker.
      return null;
    }

    const isTable = cartFieldInput.type === 'table';
    const title = isTable ? 'Số bàn' : 'Ghi chú';
    const placeholder = isTable ? 'VD: Bàn 08' : 'Nhập ghi chú cho đơn hàng';

    const focusFieldInput = () => {
      clearCartFieldInputFocusTimer();
      cartFieldInputFocusTimerRef.current = setTimeout(() => {
        if (!cartFieldInputVisibleRef.current) {
          return;
        }

          cartInputFocusedRef.current = true;
                cartFieldInputRef.current?.focus();
      }, 0);
    };

    return (
      <Modal
        visible={cartFieldInput.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={cancelCartFieldInput}
        onShow={() => {
            requestAnimationFrame(focusFieldInput);
        }}>
        <RNView style={styles.fieldInputOverlayRoot}>
          <RNView pointerEvents="none" style={styles.fieldInputOverlayBackdrop} />
          <KeyboardAvoidingView
            pointerEvents="box-none"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
            style={[
              styles.fieldInputKeyboardLayer,
              Platform.OS === 'android' && cartFieldKeyboardHeight > 0
                ? {paddingBottom: cartFieldKeyboardHeight + 10}
                : null,
            ]}>
            <RNView style={styles.fieldInputPanel}>
              <RNView style={styles.fieldInputHeader}>
                <Pressable
                  onPress={cancelCartFieldInput}
                  style={styles.fieldInputActionButton}
                  android_disableSound>
                  <RNText style={styles.fieldInputCancelText}>Huỷ</RNText>
                </Pressable>
                <RNView style={styles.fieldInputTitleWrap}>
                  <RNText style={styles.fieldInputTitle}>{title}</RNText>
                  <RNText style={styles.fieldInputSubtitle}>
                    {isTable ? 'Nhập số bàn cho đơn gọi món' : 'Nhập một dòng ghi chú'}
                  </RNText>
                </RNView>
                <Pressable
                  onPress={saveCartFieldInput}
                  style={[styles.fieldInputActionButton, styles.fieldInputSaveButton]}
                  android_disableSound>
                  <RNText style={styles.fieldInputSaveText}>Xong</RNText>
                </Pressable>
              </RNView>

              <TextInput
                ref={cartFieldInputRef}
                value={cartFieldInput.draftValue}
                onChangeText={text =>
                  setCartFieldInput(current => ({...current, draftValue: text}))
                }
                onFocus={() => {
                  clearCartFullscreenTimers();
                              cartInputFocusedRef.current = true;
                  pauseCartInputImmersive('[CartFieldInput] input focused');
                }}
                onBlur={() => {
                  if (!cartFieldInputVisibleRef.current) {
              cartInputFocusedRef.current = false;
                  }
                }}
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.42)"
                keyboardType="default"
                multiline={!isTable}
                blurOnSubmit
                returnKeyType="done"
                onSubmitEditing={saveCartFieldInput}
                autoFocus
                showSoftInputOnFocus
                autoCorrect={false}
                style={styles.fieldInputTextInput}
                selectionColor="#E22A32"
                underlineColorAndroid="transparent"
              />
            </RNView>
          </KeyboardAvoidingView>
        </RNView>
      </Modal>
    );
  };

  const renderCartModal = () => {
    if (!cartModalVisible) {
      return null;
    }

    return (
      <RNView style={styles.cartModalRoot}>
        <RNView style={styles.cartModalDimLayer} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.cartModalKeyboardLayer}>
          <RNView style={styles.cartModalCard}>
            <View style={styles.cartModalHeader}>
              <View>
                <RNText style={styles.cartModalTitle}>Giỏ hàng</RNText>
                <RNText style={styles.cartModalSubTitle}>
                  {cartBadgeCount} loại món · {formatCurrency(cartTotal)}
                </RNText>
              </View>
              <Pressable
                onPress={() => closeCart('close-button')}
                style={styles.closeButton}>
                <RNText style={styles.closeButtonText}>×</RNText>
              </Pressable>
            </View>

            <ScrollView
              style={styles.cartList}
              contentContainerStyle={styles.cartListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {cartRows.length === 0 ? (
                <View style={styles.emptyState}>
                  <RNText style={styles.emptyIcon}>🧺</RNText>
                  <RNText style={styles.emptyText}>Giỏ hàng đang trống</RNText>
                  <RNText style={styles.emptySubText}>
                    Chọn Coca, Fanta, Mirinda hoặc Pepsi để tạo đơn.
                  </RNText>
                </View>
              ) : (
                cartRows.map(renderCartRow)
              )}

              <View style={styles.totalRow}>
                <RNText style={styles.totalLabel}>Tổng tiền</RNText>
                <RNText style={styles.totalValue}>{formatCurrency(cartTotal)}</RNText>
              </View>

              {cartError ? <RNText style={styles.fieldErrorText}>{cartError}</RNText> : null}
            </ScrollView>

            <View style={styles.cartModalFooter}>
              {renderCartDisplayField({
                label: 'SỐ BÀN',
                value: displayCart.tableNumber,
                placeholder: 'Chưa nhập số bàn',
                hasError: Boolean(tableError),
                onPress: () => openCartFieldInput('table'),
              })}
              {tableError ? (
                <RNText style={styles.fieldErrorText}>{tableError}</RNText>
              ) : null}
              {renderCartDisplayField({
                label: 'GHI CHÚ',
                value: displayCart.note,
                placeholder: 'Thêm ghi chú',
                multiline: true,
                onPress: () => openCartFieldInput('note'),
              })}
              <Pressable
                disabled={cartSubmitting}
                onPress={() => {
                  onSubmitOrder();
                }}
                style={[styles.primaryButton, cartSubmitting ? {opacity: 0.65} : null]}>
                <RNText style={styles.primaryButtonText}>
                  {cartSubmitting ? 'Đang gửi...' : 'Gửi đơn'}
                </RNText>
              </Pressable>
            </View>
          </RNView>
        </KeyboardAvoidingView>
      </RNView>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenGlowTop} />
      <View style={styles.screenGlowBottom} />
      {renderTopBar()}
      {renderNotice()}
      {renderCustomerMenu()}
      {renderCartModal()}
      {renderCartFieldInputOverlay()}
    </View>
  );
};

export default memo(RestaurantMenuScreen);
