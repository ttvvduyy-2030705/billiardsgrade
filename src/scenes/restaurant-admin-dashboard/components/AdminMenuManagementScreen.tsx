import React, {memo, useState} from 'react';
import {
  Image as RNImage,
  Pressable,
  Text as RNText,
  View as RNView,
} from 'react-native';

import {
  getCategoryLabel,
  getMenuItemStatusLabel,
} from 'services/restaurantAdminStore';
import type {MenuCategory, RestaurantMenuItem} from 'services/restaurantMenuStorage';

import EditMenuItemModal from './EditMenuItemModal';

type Props = {
  menuItems: RestaurantMenuItem[];
  categories: MenuCategory[];
  styles: any;
  onSaveItem: (input: {
    id?: string;
    createdAt?: string;
    name: string;
    price: number;
    categoryId: string;
    description: string;
    imageUri?: string;
    available: boolean;
  }) => void;
};

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const AdminMenuManagementScreen = ({
  menuItems,
  categories,
  styles,
  onSaveItem,
}: Props) => {
  const [editingItem, setEditingItem] = useState<RestaurantMenuItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEdit = (item: RestaurantMenuItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  const saveItem = (input: Parameters<typeof onSaveItem>[0]) => {
    onSaveItem(input);
    closeModal();
  };

  return (
    <RNView>
      <RNView style={styles.sectionHeader}>
        <RNView>
          <RNText style={styles.sectionTitle}>Quản lý món / sản phẩm</RNText>
          <RNText style={styles.sectionHint}>
            {menuItems.length} món · {categories.length} danh mục · Dữ liệu lưu local để sau này thay bằng API.
          </RNText>
        </RNView>
        <Pressable onPress={openCreate} style={styles.primaryButton}>
          <RNText style={styles.primaryButtonText}>+ Thêm món</RNText>
        </Pressable>
      </RNView>

      {menuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🍽️</RNText>
          <RNText style={styles.emptyText}>Chưa có món nào</RNText>
          <RNText style={styles.emptySubText}>Bấm “Thêm món” để tạo món local đầu tiên.</RNText>
        </RNView>
      ) : (
        <RNView style={styles.grid}>
          {menuItems.map(item => (
            <RNView key={item.id} style={styles.menuCard}>
              {item.imageUri ? (
                <RNImage source={{uri: item.imageUri}} style={styles.menuThumb} resizeMode="cover" />
              ) : (
                <RNView style={styles.menuThumb} />
              )}
              <RNView style={styles.menuInfo}>
                <RNText style={styles.menuName} numberOfLines={2}>{item.name}</RNText>
                <RNText style={styles.menuMeta} numberOfLines={1}>
                  {getCategoryLabel(item.categoryId, categories)}
                </RNText>
                <RNText style={styles.priceText}>{formatCurrency(item.price)}</RNText>
                <RNView
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: item.available
                        ? 'rgba(9,168,107,0.18)'
                        : 'rgba(242,165,26,0.16)',
                      borderColor: item.available
                        ? 'rgba(60,210,150,0.32)'
                        : 'rgba(255,190,70,0.30)',
                    },
                  ]}>
                  <RNText style={styles.statusPillText}>{getMenuItemStatusLabel(item)}</RNText>
                </RNView>
                <Pressable onPress={() => openEdit(item)} style={styles.secondaryButton}>
                  <RNText style={styles.secondaryButtonText}>Sửa món</RNText>
                </Pressable>
              </RNView>
            </RNView>
          ))}
        </RNView>
      )}

      <EditMenuItemModal
        visible={modalVisible}
        item={editingItem}
        categories={categories}
        styles={styles}
        onClose={closeModal}
        onSave={saveItem}
      />
    </RNView>
  );
};

export default memo(AdminMenuManagementScreen);
