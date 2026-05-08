import {useCallback, useState} from 'react';

import {
  loadMenuCategories,
  loadMenuItems,
} from '../services/restaurantMenuStorage';
import type {
  MenuCategory,
  RestaurantMenuItem,
} from '../services/restaurantMenuStorage';

export const useRestaurantMenuStore = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshMenuData = useCallback(async () => {
    setLoading(true);

    try {
      const [nextCategories, nextItems] = await Promise.all([
        loadMenuCategories(),
        loadMenuItems(),
      ]);

      setCategories(nextCategories);
      setItems(nextItems);
      setSelectedCategoryId(current => {
        if (current && nextCategories.some(category => category.id === current)) {
          return current;
        }
        return nextCategories[0]?.id || '';
      });

      return {categories: nextCategories, items: nextItems};
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    categories,
    items,
    selectedCategoryId,
    setSelectedCategoryId,
    refreshMenuData,
    loading,
  };
};
