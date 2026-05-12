import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearCurrentCart,
  createRestaurantOrder,
  getActiveRestaurantContext,
  loadCurrentCart,
  loadPublicTablesByQrToken,
  saveCurrentCart,
} from "../services/restaurantMenuRepository";
import { devModuleWarn, devWarn } from "../utils/devLogger";
import {
  getScoreMenuErrorMessage,
  logScoreMenuError,
  shouldKeepCartOnSubmitError,
} from "../utils/scoremenuErrors";
import type {
  RestaurantCartState,
  RestaurantMenuContext,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantTable,
} from "../services/restaurantMenuRepository";

export type RestaurantCartFieldType = "table" | "note";

export type RestaurantCartSubmitIssue =
  | "ALREADY_SUBMITTING"
  | "EMPTY_CART"
  | "TABLE_REQUIRED"
  | "TABLE_INVALID"
  | "CONTEXT_REQUIRED"
  | "INVALID_ITEMS"
  | "SUBMIT_FAILED";

export type RestaurantCartSubmitResult =
  | {
      ok: true;
      order: RestaurantOrder | null;
      orderId: string;
      tableNumber: string;
    }
  | {
      ok: false;
      reason: RestaurantCartSubmitIssue;
      message: string;
      invalidItemIds?: string[];
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

type SubmitCartOptions = {
  fallbackItemsById?: Record<string, RestaurantMenuItem>;
};

const MAX_TABLE_NUMBER_LENGTH = 32;
const UNSAFE_TABLE_NUMBER_PATTERN = /[<>()[\]{}"'`|\\]/;

const normalizeTableCompareKey = (value: string) =>
  normalizeRestaurantTableNumber(value).toLowerCase();

const getCustomerQrTokenFromContext = (context?: RestaurantMenuContext | null) => {
  if (!context) {
    return "";
  }

  if (context.qrTokenScope === "TABLE" && context.qrCodeToken) {
    return String(context.qrCodeToken).trim();
  }

  return String(context.menuQrToken || context.qrCodeToken || "").trim();
};

const isPublicCustomerTableUsable = (table?: RestaurantTable | null) => {
  return Boolean(table) && table?.status !== "LOCKED" && table?.status !== "HIDDEN";
};

const resolveCustomerTableForOrder = async ({
  context,
  tableNumber,
}: {
  context?: RestaurantMenuContext | null;
  tableNumber: string;
}): Promise<
  | {ok: true; tableId?: string; tableNumber: string}
  | {ok: false; message: string}
> => {
  const normalizedTableNumber = normalizeRestaurantTableNumber(tableNumber);

  if (!context || context.source !== "customer") {
    return {ok: true, tableNumber: normalizedTableNumber};
  }

  if (!context.branchId) {
    return {
      ok: false,
      message: "Không xác định được chi nhánh. Vui lòng quét lại QR menu của quán.",
    };
  }

  if (context.qrTokenScope === "TABLE" && context.tableId) {
    if (
      context.tableNumber &&
      normalizeTableCompareKey(context.tableNumber) !==
        normalizeTableCompareKey(normalizedTableNumber)
    ) {
      return {
        ok: false,
        message: "Số bàn không khớp với QR đã quét. Vui lòng kiểm tra lại.",
      };
    }

    return {
      ok: true,
      tableId: context.tableId,
      tableNumber: context.tableNumber || normalizedTableNumber,
    };
  }

  const qrToken = getCustomerQrTokenFromContext(context);
  if (!qrToken) {
    return {
      ok: false,
      message: "Không xác định được QR menu. Vui lòng quét lại QR của quán.",
    };
  }

  const tables = await loadPublicTablesByQrToken(qrToken);
  const matchedTable = tables.find(
    table =>
      table.branchId === context.branchId &&
      normalizeTableCompareKey(table.tableNumber) ===
        normalizeTableCompareKey(normalizedTableNumber),
  );

  if (!matchedTable) {
    return {
      ok: false,
      message: "Số bàn không tồn tại trong chi nhánh này. Vui lòng chọn/nhập lại.",
    };
  }

  if (!isPublicCustomerTableUsable(matchedTable)) {
    return {
      ok: false,
      message: "Bàn này đang bị khóa hoặc không nhận đơn. Vui lòng gọi nhân viên.",
    };
  }

  return {
    ok: true,
    tableId: matchedTable.id,
    tableNumber: matchedTable.tableNumber,
  };
};

export const normalizeRestaurantTableNumber = (value: string) => {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const validateRestaurantTableNumber = (value: string) => {
  const tableNumber = normalizeRestaurantTableNumber(value);

  if (!tableNumber) {
    return {
      ok: false,
      value: tableNumber,
      message: "Vui lòng nhập số bàn.",
    };
  }

  if (tableNumber.length > MAX_TABLE_NUMBER_LENGTH) {
    return {
      ok: false,
      value: tableNumber,
      message: `Số bàn tối đa ${MAX_TABLE_NUMBER_LENGTH} ký tự.`,
    };
  }

  if (UNSAFE_TABLE_NUMBER_PATTERN.test(tableNumber)) {
    return {
      ok: false,
      value: tableNumber,
      message:
        "Số bàn chỉ nên dùng chữ, số, khoảng trắng và ký tự đơn giản như -, /, #.",
    };
  }

  return {
    ok: true,
    value: tableNumber,
    message: "",
  };
};

export const createEmptyRestaurantCart = (): RestaurantCartState => ({
  tableNumber: "",
  note: "",
  items: [],
});

export const hasRestaurantCartContent = (cart: RestaurantCartState) => {
  return (
    (Array.isArray(cart.items) ? cart.items.length : 0) > 0 ||
    String(cart.tableNumber || "").trim().length > 0 ||
    String(cart.note || "").trim().length > 0
  );
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
  persistRequestId: number;
  menuItemSnapshot: Record<string, RestaurantMenuItem>;
} = {
  cart: createEmptyRestaurantCart(),
  cartHydrated: false,
  cartModalVisible: false,
  cartDisplayVersion: 0,
  cartSubmitting: false,
  mutationVersion: 0,
  hydrateRequestId: 0,
  persistRequestId: 0,
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
  listeners.forEach((listener) => listener());
};

const normalizeCartState = (
  cart: RestaurantCartState,
): RestaurantCartState => ({
  ...cart,
  tableNumber: String(cart.tableNumber || ""),
  note: String(cart.note || ""),
  items: Array.isArray(cart.items)
    ? cart.items.filter((item) => item.itemId && item.quantity > 0)
    : [],
});

const reportCartStoreError = (label: string, error: unknown) => {
  devModuleWarn('CART', label, error);
};

const persistCartState = async (cart: RestaurantCartState) => {
  const requestId = storeState.persistRequestId + 1;
  storeState.persistRequestId = requestId;

  try {
    await saveCurrentCart(cart);
  } catch (error) {
    if (requestId === storeState.persistRequestId) {
      reportCartStoreError("persist failed", error);
    }
  }
};

const replaceCartState = (
  nextCart: RestaurantCartState,
  options: { persist?: boolean; hydrated?: boolean } = {},
) => {
  const normalizedCart = normalizeCartState(nextCart);
  storeState.cart = normalizedCart;
  storeState.cartHydrated = options.hydrated ?? true;
  storeState.mutationVersion += 1;
  emitChange();

  if (options.persist !== false) {
    void persistCartState(normalizedCart);
  }

  return normalizedCart;
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
  return typeof next === "function"
    ? (next as (previous: RestaurantCartState) => RestaurantCartState)(
        storeState.cart,
      )
    : next;
};

const setCartSubmittingState = (submitting: boolean) => {
  if (storeState.cartSubmitting === submitting) {
    return;
  }

  storeState.cartSubmitting = submitting;
  emitChange();
};

const resolveCartRows = (
  fallbackItemsById: Record<string, RestaurantMenuItem> = {},
) => {
  const rows = storeState.cart.items
    .map((cartItem) => {
      const item =
        storeState.menuItemSnapshot[cartItem.itemId] ||
        fallbackItemsById[cartItem.itemId];

      if (!item || cartItem.quantity <= 0) {
        return null;
      }

      return {
        itemId: cartItem.itemId,
        quantity: cartItem.quantity,
        item,
        lineTotal: item.price * cartItem.quantity,
      };
    })
    .filter(Boolean) as Array<{
    itemId: string;
    quantity: number;
    item: RestaurantMenuItem;
    lineTotal: number;
  }>;

  return rows;
};

export const resetRestaurantCartStore = () => {
  storeState.cart = createEmptyRestaurantCart();
  storeState.cartHydrated = false;
  storeState.cartModalVisible = false;
  storeState.cartDisplayVersion = 0;
  storeState.cartSubmitting = false;
  storeState.mutationVersion += 1;
  storeState.hydrateRequestId += 1;
  storeState.menuItemSnapshot = {};
  emitChange();
};

export const useRestaurantCartStore = () => {
  const [, forceRender] = useState(0);
  const cartRef = useRef<RestaurantCartState>(storeState.cart);

  useEffect(() => {
    const listener = () => {
      cartRef.current = storeState.cart;
      forceRender((version) => version + 1);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const snapshot = getSnapshot();
  cartRef.current = snapshot.cart;

  const replaceCart = useCallback((nextCart: RestaurantCartState) => {
    return replaceCartState(nextCart);
  }, []);

  const setCart = useCallback((next: CartSetter) => {
    const resolved = resolveCartSetter(next);
    return replaceCartState(resolved);
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

    const normalizedCart = normalizeCartState(nextCart);
    storeState.cart = normalizedCart;
    storeState.cartHydrated = true;
    emitChange();
    return normalizedCart;
  }, []);

  const persistCurrentCart = useCallback(
    async (nextCart?: RestaurantCartState) => {
      const cartToSave = normalizeCartState(nextCart || storeState.cart);
      storeState.cart = cartToSave;
      await saveCurrentCart(cartToSave);
      emitChange();
    },
    [],
  );

  const clearCart = useCallback(async () => {
    const emptyCart = createEmptyRestaurantCart();
    await clearCurrentCart();
    replaceCartState(emptyCart, { persist: false });
    return emptyCart;
  }, []);

  const changeQuantity = useCallback(
    (itemId: string, delta: number) => {
      return setCart((current) => {
        const existing = current.items.find((item) => item.itemId === itemId);
        const nextQuantity = Math.max(0, (existing?.quantity || 0) + delta);

        if (nextQuantity === 0) {
          return {
            ...current,
            items: current.items.filter((item) => item.itemId !== itemId),
          };
        }

        if (existing) {
          return {
            ...current,
            items: current.items.map((item) =>
              item.itemId === itemId
                ? { ...item, quantity: nextQuantity }
                : item,
            ),
          };
        }

        return {
          ...current,
          items: [...current.items, { itemId, quantity: nextQuantity }],
        };
      });
    },
    [setCart],
  );

  const commitCartFields = useCallback(
    (fields: { tableNumber?: string; note?: string }) => {
      const baseCart = storeState.cart;
      const nextCart = {
        ...baseCart,
        tableNumber:
          fields.tableNumber === undefined
            ? baseCart.tableNumber
            : normalizeRestaurantTableNumber(fields.tableNumber),
        note:
          fields.note === undefined ? baseCart.note : String(fields.note || ""),
      };

      const committedCart = replaceCartState(nextCart);
      bumpCartDisplayVersionAfterInput();
      return committedCart;
    },
    [],
  );

  const commitCartFieldValue = useCallback(
    (type: RestaurantCartFieldType, value: string) => {
      return commitCartFields(
        type === "table" ? { tableNumber: value } : { note: value },
      );
    },
    [commitCartFields],
  );

  const setCartModalVisible = useCallback((visible: boolean) => {
    storeState.cartModalVisible = visible;
    emitChange();
  }, []);

  const setCartSubmitting = useCallback((submitting: boolean) => {
    setCartSubmittingState(submitting);
  }, []);

  const updateMenuItemSnapshot = useCallback((items: RestaurantMenuItem[]) => {
    if (items.length === 0) {
      return;
    }

    const nextSnapshot = { ...storeState.menuItemSnapshot };
    items.forEach((item) => {
      nextSnapshot[item.id] = item;
    });
    storeState.menuItemSnapshot = nextSnapshot;
  }, []);

  const getSnapshotMenuItem = useCallback((itemId: string) => {
    return storeState.menuItemSnapshot[itemId];
  }, []);

  const getActiveCart = useCallback(() => storeState.cart, []);

  const submitCurrentCartOrder = useCallback(
    async (
      options: SubmitCartOptions = {},
    ): Promise<RestaurantCartSubmitResult> => {
      if (storeState.cartSubmitting) {
        return {
          ok: false,
          reason: "ALREADY_SUBMITTING",
          message: "Đơn hàng đang được gửi. Vui lòng chờ trong giây lát.",
        };
      }

      const activeCart = normalizeCartState(storeState.cart);
      const context = await getActiveRestaurantContext().catch(() => null);
      const scopedCart = {
        ...activeCart,
        restaurantId: activeCart.restaurantId || context?.restaurantId,
        branchId: activeCart.branchId || context?.branchId,
        tableId: activeCart.tableId || context?.tableId,
        tableNumber: activeCart.tableNumber || context?.tableNumber || "",
      };
      const tableValidation = validateRestaurantTableNumber(scopedCart.tableNumber);
      const tableNumber = tableValidation.value;
      const fallbackItemsById = options.fallbackItemsById || {};
      const rows = resolveCartRows(fallbackItemsById);
      const unresolvedItemIds = activeCart.items
        .filter(
          (cartItem) =>
            !storeState.menuItemSnapshot[cartItem.itemId] &&
            !fallbackItemsById[cartItem.itemId],
        )
        .map((cartItem) => cartItem.itemId);

      if (rows.length === 0) {
        if (unresolvedItemIds.length > 0) {
          return {
            ok: false,
            reason: "INVALID_ITEMS",
            invalidItemIds: unresolvedItemIds,
            message:
              "Có món không còn tồn tại trong menu. Vui lòng xoá món đó khỏi giỏ rồi gửi lại.",
          };
        }

        return {
          ok: false,
          reason: "EMPTY_CART",
          message: "Giỏ hàng đang trống. Vui lòng chọn món trước khi gửi đơn.",
        };
      }

      if (!tableValidation.ok) {
        return {
          ok: false,
          reason: tableNumber ? "TABLE_INVALID" : "TABLE_REQUIRED",
          message: tableValidation.message,
        };
      }

      const requiresCustomerQrScope =
        context?.source === "customer" &&
        Boolean(context.menuQrToken || context.qrCodeToken || context.branchId);

      if (
        !scopedCart.restaurantId ||
        (requiresCustomerQrScope && !scopedCart.branchId)
      ) {
        return {
          ok: false,
          reason: "CONTEXT_REQUIRED",
          message:
            "Không xác định được nhà hàng/chi nhánh. Vui lòng quét lại QR menu của quán.",
        };
      }

      const tableResolution = await resolveCustomerTableForOrder({
        context,
        tableNumber,
      });

      if (!tableResolution.ok) {
        return {
          ok: false,
          reason: "TABLE_INVALID",
          message: tableResolution.message,
        };
      }

      const submittedTableId = tableResolution.tableId || scopedCart.tableId;
      const submittedTableNumber = tableResolution.tableNumber || tableNumber;

      const invalidRows = rows.filter(
        (row) => row.item.status !== "SELLING" || row.item.available === false,
      );
      const invalidItemIds = [
        ...unresolvedItemIds,
        ...invalidRows.map((row) => row.itemId),
      ];

      if (invalidItemIds.length > 0) {
        return {
          ok: false,
          reason: "INVALID_ITEMS",
          invalidItemIds,
          message:
            "Có món đã hết hàng, bị ẩn hoặc không còn tồn tại. Vui lòng xoá món đó khỏi giỏ.",
        };
      }

      const orderItems = rows.map((row) => ({
        itemId: row.item.id,
        name: row.item.name,
        price: row.item.price,
        quantity: row.quantity,
      }));
      const total = rows.reduce((result, row) => result + row.lineTotal, 0);

      setCartSubmittingState(true);

      try {
        const nextOrders = await createRestaurantOrder({
          restaurantId: scopedCart.restaurantId,
          branchId: scopedCart.branchId,
          tableId: submittedTableId,
          orderSource: "customer",
          tableNumber: submittedTableNumber,
          note: scopedCart.note.trim(),
          items: orderItems,
          total,
        });
        const createdOrder = nextOrders[0] || null;

        await clearCurrentCart();
        replaceCartState(createEmptyRestaurantCart(), { persist: false });

        return {
          ok: true,
          order: createdOrder,
          orderId: String(createdOrder?.id || ""),
          tableNumber: submittedTableNumber,
        };
      } catch (error) {
        reportCartStoreError("submit failed", error);
        logScoreMenuError(
          {
            module: 'ORDER',
            action: 'submit customer order failed',
            restaurantId: scopedCart.restaurantId,
            branchId: scopedCart.branchId,
            tableId: submittedTableId,
            tableNumber: submittedTableNumber,
            extra: {
              itemCount: orderItems.length,
              total,
              keepCart: shouldKeepCartOnSubmitError(error),
            },
          },
          error,
        );
        return {
          ok: false,
          reason: "SUBMIT_FAILED",
          message: `${getScoreMenuErrorMessage(error, "Không thể gửi đơn.")} Giỏ hàng vẫn được giữ nguyên, bạn có thể thử lại.`,
        };
      } finally {
        setCartSubmittingState(false);
      }
    },
    [],
  );

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
    commitCartFields,
    commitCartFieldValue,
    setCartModalVisible,
    updateMenuItemSnapshot,
    getSnapshotMenuItem,
    getActiveCart,
    submitCurrentCartOrder,
  };
};
