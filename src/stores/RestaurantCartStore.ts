import {useCallback, useRef, useState} from 'react';

import {
  clearCurrentCart,
  loadCurrentCart,
  saveCurrentCart,
} from '../services/restaurantMenuStorage';
import type {
  RestaurantCartState,
  RestaurantMenuItem,
} from '../services/restaurantMenuStorage';

export type RestaurantCartFieldType = 'table' | 'note';

export const createEmptyRestaurantCart = (): RestaurantCartState => ({
  tableNumber: '',
  note: '',
  items: [],
});

export const hasRestaurantCartContent = (cart: RestaurantCartState) => {
  return (
    (Array.isArray(cart.items) ? cart.items.length : 0) > 0 ||
    String(cart.tableNumber || '').trim().length > 0 ||
    String(cart.note || '').trim().length > 0
  );
};

type CartSetter =
  | RestaurantCartState
  | ((previous: RestaurantCartState) => RestaurantCartState);

export const useRestaurantCartStore = () => {
  const [cart, setCartState] = useState<RestaurantCartState>(() =>
    createEmptyRestaurantCart(),
  );
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartModalVisible, setCartModalVisibleState] = useState(false);
  const [cartDisplayVersion, setCartDisplayVersion] = useState(0);
  const [cartSubmitting, setCartSubmitting] = useState(false);

  const cartRef = useRef<RestaurantCartState>(cart);
  const hydratedRef = useRef(false);
  const mutationVersionRef = useRef(0);
  const hydrateRequestIdRef = useRef(0);
  const menuItemSnapshotRef = useRef<Record<string, RestaurantMenuItem>>({});

  const replaceCart = useCallback((nextCart: RestaurantCartState) => {
    cartRef.current = nextCart;
    hydratedRef.current = true;
    mutationVersionRef.current += 1;
    setCartHydrated(true);
    setCartState(nextCart);
  }, []);

  const setCart = useCallback(
    (next: CartSetter) => {
      const resolved =
        typeof next === 'function'
          ? (next as (previous: RestaurantCartState) => RestaurantCartState)(
              cartRef.current,
            )
          : next;

      replaceCart(resolved);
      return resolved;
    },
    [replaceCart],
  );

  const bumpCartDisplayVersion = useCallback(() => {
    setCartDisplayVersion(version => version + 1);
  }, []);

  const bumpCartDisplayVersionAfterNativeDialog = useCallback(() => {
    bumpCartDisplayVersion();

    requestAnimationFrame(() => {
      bumpCartDisplayVersion();
    });

    setTimeout(() => {
      bumpCartDisplayVersion();
    }, 80);

    setTimeout(() => {
      bumpCartDisplayVersion();
    }, 240);
  }, [bumpCartDisplayVersion]);

  const hydrateCartFromStorage = useCallback(async () => {
    const requestId = hydrateRequestIdRef.current + 1;
    const startedAtVersion = mutationVersionRef.current;
    hydrateRequestIdRef.current = requestId;

    const nextCart = await loadCurrentCart();

    if (requestId !== hydrateRequestIdRef.current) {
      return cartRef.current;
    }

    const mutationHappenedDuringLoad =
      mutationVersionRef.current !== startedAtVersion;
    const current = cartRef.current;
    const currentHasCart = hasRestaurantCartContent(current);
    const loadedHasCart = hasRestaurantCartContent(nextCart);

    if (mutationHappenedDuringLoad || (currentHasCart && !loadedHasCart)) {
      hydratedRef.current = true;
      setCartHydrated(true);
      setCartState(current);
      return current;
    }

    cartRef.current = nextCart;
    hydratedRef.current = true;
    setCartHydrated(true);
    setCartState(nextCart);
    return nextCart;
  }, []);

  const persistCurrentCart = useCallback(async (nextCart?: RestaurantCartState) => {
    const cartToSave = nextCart || cartRef.current;
    cartRef.current = cartToSave;
    await saveCurrentCart(cartToSave);
  }, []);

  const clearCart = useCallback(async () => {
    const emptyCart = createEmptyRestaurantCart();
    await clearCurrentCart();
    replaceCart(emptyCart);
    return emptyCart;
  }, [replaceCart]);

  const changeQuantity = useCallback(
    (itemId: string, delta: number) => {
      return setCart(current => {
        const existing = current.items.find(item => item.itemId === itemId);
        const nextQuantity = Math.max(0, (existing?.quantity || 0) + delta);

        if (nextQuantity === 0) {
          return {
            ...current,
            items: current.items.filter(item => item.itemId !== itemId),
          };
        }

        if (existing) {
          return {
            ...current,
            items: current.items.map(item =>
              item.itemId === itemId
                ? {...item, quantity: nextQuantity}
                : item,
            ),
          };
        }

        return {
          ...current,
          items: [...current.items, {itemId, quantity: nextQuantity}],
        };
      });
    },
    [setCart],
  );

  const commitCartFieldValue = useCallback(
    (type: RestaurantCartFieldType, value: string) => {
      const baseCart = cartRef.current;
      const nextCart =
        type === 'table'
          ? {...baseCart, tableNumber: value}
          : {...baseCart, note: value};

      replaceCart(nextCart);
      bumpCartDisplayVersionAfterNativeDialog();
      void persistCurrentCart(nextCart);
      return nextCart;
    },
    [bumpCartDisplayVersionAfterNativeDialog, persistCurrentCart, replaceCart],
  );

  const setCartModalVisible = useCallback((visible: boolean) => {
    setCartModalVisibleState(visible);
  }, []);

  const updateMenuItemSnapshot = useCallback((items: RestaurantMenuItem[]) => {
    if (items.length === 0) {
      return;
    }

    const nextSnapshot = {...menuItemSnapshotRef.current};
    items.forEach(item => {
      nextSnapshot[item.id] = item;
    });
    menuItemSnapshotRef.current = nextSnapshot;
  }, []);

  const getSnapshotMenuItem = useCallback((itemId: string) => {
    return menuItemSnapshotRef.current[itemId];
  }, []);

  const getActiveCart = useCallback(() => cartRef.current, []);

  return {
    cart,
    cartRef,
    cartHydrated,
    cartModalVisible,
    cartDisplayVersion,
    cartSubmitting,
    setCartSubmitting,
    setCart,
    replaceCart,
    hydrateCartFromStorage,
    persistCurrentCart,
    clearCart,
    changeQuantity,
    commitCartFieldValue,
    setCartModalVisible,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
  };
};
