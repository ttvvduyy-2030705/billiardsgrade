import {useCallback, useEffect, useRef, useState} from 'react';

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

type CartStoreSnapshot = {
  cart: RestaurantCartState;
  cartHydrated: boolean;
  cartModalVisible: boolean;
  cartDisplayVersion: number;
  cartSubmitting: boolean;
};

const listeners = new Set<() => void>();

const storeState: {
  cart: RestaurantCartState;
  cartHydrated: boolean;
  cartModalVisible: boolean;
  cartDisplayVersion: number;
  cartSubmitting: boolean;
  mutationVersion: number;
  hydrateRequestId: number;
  menuItemSnapshot: Record<string, RestaurantMenuItem>;
} = {
  cart: createEmptyRestaurantCart(),
  cartHydrated: false,
  cartModalVisible: false,
  cartDisplayVersion: 0,
  cartSubmitting: false,
  mutationVersion: 0,
  hydrateRequestId: 0,
  menuItemSnapshot: {},
};

const getSnapshot = (): CartStoreSnapshot => ({
  cart: storeState.cart,
  cartHydrated: storeState.cartHydrated,
  cartModalVisible: storeState.cartModalVisible,
  cartDisplayVersion: storeState.cartDisplayVersion,
  cartSubmitting: storeState.cartSubmitting,
});

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const replaceCartState = (nextCart: RestaurantCartState) => {
  storeState.cart = nextCart;
  storeState.cartHydrated = true;
  storeState.mutationVersion += 1;
  emitChange();
};

const bumpCartDisplayVersion = () => {
  storeState.cartDisplayVersion += 1;
  emitChange();
};

const bumpCartDisplayVersionAfterInput = () => {
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
};

const resolveCartSetter = (next: CartSetter) => {
  return typeof next === 'function'
    ? (next as (previous: RestaurantCartState) => RestaurantCartState)(storeState.cart)
    : next;
};

export const useRestaurantCartStore = () => {
  const [, forceRender] = useState(0);
  const cartRef = useRef<RestaurantCartState>(storeState.cart);

  useEffect(() => {
    const listener = () => {
      cartRef.current = storeState.cart;
      forceRender(version => version + 1);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const snapshot = getSnapshot();
  cartRef.current = snapshot.cart;

  const replaceCart = useCallback((nextCart: RestaurantCartState) => {
    replaceCartState(nextCart);
  }, []);

  const setCart = useCallback((next: CartSetter) => {
    const resolved = resolveCartSetter(next);
    replaceCartState(resolved);
    return resolved;
  }, []);

  const hydrateCartFromStorage = useCallback(async () => {
    const requestId = storeState.hydrateRequestId + 1;
    const startedAtVersion = storeState.mutationVersion;
    storeState.hydrateRequestId = requestId;

    const nextCart = await loadCurrentCart();

    if (requestId !== storeState.hydrateRequestId) {
      return storeState.cart;
    }

    const mutationHappenedDuringLoad =
      storeState.mutationVersion !== startedAtVersion;
    const current = storeState.cart;
    const currentHasCart = hasRestaurantCartContent(current);
    const loadedHasCart = hasRestaurantCartContent(nextCart);

    if (mutationHappenedDuringLoad || (currentHasCart && !loadedHasCart)) {
      storeState.cartHydrated = true;
      emitChange();
      return current;
    }

    storeState.cart = nextCart;
    storeState.cartHydrated = true;
    emitChange();
    return nextCart;
  }, []);

  const persistCurrentCart = useCallback(async (nextCart?: RestaurantCartState) => {
    const cartToSave = nextCart || storeState.cart;
    storeState.cart = cartToSave;
    await saveCurrentCart(cartToSave);
  }, []);

  const clearCart = useCallback(async () => {
    const emptyCart = createEmptyRestaurantCart();
    await clearCurrentCart();
    replaceCartState(emptyCart);
    return emptyCart;
  }, []);

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
      const baseCart = storeState.cart;
      const nextCart =
        type === 'table'
          ? {...baseCart, tableNumber: value}
          : {...baseCart, note: value};

      replaceCartState(nextCart);
      bumpCartDisplayVersionAfterInput();
      void saveCurrentCart(nextCart);
      return nextCart;
    },
    [],
  );

  const setCartModalVisible = useCallback((visible: boolean) => {
    storeState.cartModalVisible = visible;
    emitChange();
  }, []);

  const setCartSubmitting = useCallback((submitting: boolean) => {
    storeState.cartSubmitting = submitting;
    emitChange();
  }, []);

  const updateMenuItemSnapshot = useCallback((items: RestaurantMenuItem[]) => {
    if (items.length === 0) {
      return;
    }

    const nextSnapshot = {...storeState.menuItemSnapshot};
    items.forEach(item => {
      nextSnapshot[item.id] = item;
    });
    storeState.menuItemSnapshot = nextSnapshot;
  }, []);

  const getSnapshotMenuItem = useCallback((itemId: string) => {
    return storeState.menuItemSnapshot[itemId];
  }, []);

  const getActiveCart = useCallback(() => storeState.cart, []);

  return {
    cart: snapshot.cart,
    cartRef,
    cartHydrated: snapshot.cartHydrated,
    cartModalVisible: snapshot.cartModalVisible,
    cartDisplayVersion: snapshot.cartDisplayVersion,
    cartSubmitting: snapshot.cartSubmitting,
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
