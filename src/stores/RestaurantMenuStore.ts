import {useCallback, useEffect, useRef, useState} from 'react';

import {
  loadMenuCategories,
  loadMenuItems,
  loadPublicMenuByQrToken,
} from '../services/restaurantMenuRepository';
import type {
  MenuCategory,
  RestaurantMenuItem,
} from '../services/restaurantMenuRepository';

type RestaurantMenuStoreSnapshot = {
  categories: MenuCategory[];
  items: RestaurantMenuItem[];
  selectedCategoryId: string;
  loading: boolean;
  hydrated: boolean;
  errorMessage: string;
  refreshVersion: number;
};

const listeners = new Set<() => void>();

const storeState: RestaurantMenuStoreSnapshot & {
  refreshRequestId: number;
} = {
  categories: [],
  items: [],
  selectedCategoryId: '',
  loading: false,
  hydrated: false,
  errorMessage: '',
  refreshVersion: 0,
  refreshRequestId: 0,
};

const getSnapshot = (): RestaurantMenuStoreSnapshot => ({
  categories: storeState.categories,
  items: storeState.items,
  selectedCategoryId: storeState.selectedCategoryId,
  loading: storeState.loading,
  hydrated: storeState.hydrated,
  errorMessage: storeState.errorMessage,
  refreshVersion: storeState.refreshVersion,
});

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const setLoading = (loading: boolean) => {
  if (storeState.loading === loading) {
    return;
  }

  storeState.loading = loading;
  emitChange();
};

const selectValidCategory = (
  currentCategoryId: string,
  categories: MenuCategory[],
) => {
  if (
    currentCategoryId &&
    categories.some(category => category.id === currentCategoryId)
  ) {
    return currentCategoryId;
  }

  return categories[0]?.id || '';
};


const applyMenuData = (
  categories: MenuCategory[],
  items: RestaurantMenuItem[],
) => {
  storeState.categories = categories;
  storeState.items = items;
  storeState.selectedCategoryId = selectValidCategory(
    storeState.selectedCategoryId,
    categories,
  );
  storeState.hydrated = true;
  storeState.errorMessage = '';
  storeState.refreshVersion += 1;
  emitChange();
};

export const resetRestaurantMenuStore = () => {
  storeState.categories = [];
  storeState.items = [];
  storeState.selectedCategoryId = '';
  storeState.loading = false;
  storeState.hydrated = false;
  storeState.errorMessage = '';
  storeState.refreshVersion += 1;
  storeState.refreshRequestId += 1;
  emitChange();
};

export const useRestaurantMenuStore = () => {
  const [, forceRender] = useState(0);
  const snapshotRef = useRef(getSnapshot());

  useEffect(() => {
    const listener = () => {
      snapshotRef.current = getSnapshot();
      forceRender(version => version + 1);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const snapshot = getSnapshot();
  snapshotRef.current = snapshot;

  const setSelectedCategoryId = useCallback((categoryId: string) => {
    if (storeState.selectedCategoryId === categoryId) {
      return;
    }

    storeState.selectedCategoryId = categoryId;
    emitChange();
  }, []);

  const refreshMenuData = useCallback(async () => {
    const requestId = storeState.refreshRequestId + 1;
    storeState.refreshRequestId = requestId;
    setLoading(true);

    try {
      const [nextCategories, nextItems] = await Promise.all([
        loadMenuCategories(),
        loadMenuItems(),
      ]);

      if (requestId !== storeState.refreshRequestId) {
        return {
          categories: storeState.categories,
          items: storeState.items,
        };
      }

      applyMenuData(nextCategories, nextItems);

      return {categories: nextCategories, items: nextItems};
    } catch (error) {
      void error;

      if (requestId === storeState.refreshRequestId) {
        storeState.errorMessage = 'Không thể tải menu. Vui lòng thử lại.';
        storeState.hydrated = true;
        storeState.refreshVersion += 1;
        emitChange();
      }

      return {
        categories: storeState.categories,
        items: storeState.items,
      };
    } finally {
      if (requestId === storeState.refreshRequestId) {
        setLoading(false);
      }
    }
  }, []);


  const refreshPublicMenuData = useCallback(async (qrToken: string) => {
    const requestId = storeState.refreshRequestId + 1;
    storeState.refreshRequestId = requestId;
    setLoading(true);

    try {
      const publicMenu = await loadPublicMenuByQrToken(qrToken);
      const nextCategories = publicMenu.categories;
      const nextItems = publicMenu.items;

      if (requestId !== storeState.refreshRequestId) {
        return {
          categories: storeState.categories,
          items: storeState.items,
        };
      }

      applyMenuData(nextCategories, nextItems);
      return {categories: nextCategories, items: nextItems};
    } catch (error) {
      void error;

      if (requestId === storeState.refreshRequestId) {
        storeState.errorMessage =
          'Không thể tải menu từ QR. Vui lòng quét lại mã QR của quán/chi nhánh.';
        storeState.hydrated = true;
        storeState.refreshVersion += 1;
        emitChange();
      }

      return {
        categories: storeState.categories,
        items: storeState.items,
      };
    } finally {
      if (requestId === storeState.refreshRequestId) {
        setLoading(false);
      }
    }
  }, []);

  return {
    categories: snapshot.categories,
    items: snapshot.items,
    selectedCategoryId: snapshot.selectedCategoryId,
    setSelectedCategoryId,
    refreshMenuData,
    refreshPublicMenuData,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    errorMessage: snapshot.errorMessage,
    refreshVersion: snapshot.refreshVersion,
  };
};
