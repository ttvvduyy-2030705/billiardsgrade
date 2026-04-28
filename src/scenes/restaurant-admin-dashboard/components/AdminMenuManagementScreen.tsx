import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  Image as RNImage,
  Pressable,
  Text as RNText,
  TextInput,
  View as RNView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

import {
  getCategoryLabel,
  getMenuItemStatusLabel,
} from 'services/restaurantAdminStore';
import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
} from 'services/restaurantMenuStorage';

type MenuItemFormInput = {
  id?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  description: string;
  imageUri?: string;
  status: RestaurantMenuItemStatus;
  available?: boolean;
};

type Props = {
  menuItems: RestaurantMenuItem[];
  categories: MenuCategory[];
  styles: any;
  onSaveItem: (input: MenuItemFormInput) => Promise<RestaurantMenuItem[]>;
};

type ViewMode = 'list' | 'create' | 'edit';

const STATUS_OPTIONS: Array<{value: RestaurantMenuItemStatus; label: string}> = [
  {value: 'SELLING', label: 'Đang bán'},
  {value: 'HIDDEN', label: 'Tạm ẩn'},
  {value: 'OUT_OF_STOCK', label: 'Hết hàng'},
];

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const getMenuItemImageUri = (item?: RestaurantMenuItem | null) => {
  return (item?.imageUri || '').trim();
};

const createLocalMenuItemId = () => {
  return `admin_dish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const getInitialStatus = (item?: RestaurantMenuItem | null): RestaurantMenuItemStatus => {
  if (item?.status === 'HIDDEN' || item?.status === 'OUT_OF_STOCK' || item?.status === 'SELLING') {
    return item.status;
  }

  return item?.available === false ? 'HIDDEN' : 'SELLING';
};

const AdminMenuManagementScreen = ({
  menuItems,
  categories,
  styles,
  onSaveItem,
}: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<RestaurantMenuItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'drink');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [status, setStatus] = useState<RestaurantMenuItemStatus>('SELLING');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagePicking, setImagePicking] = useState(false);

  const defaultCategoryId = useMemo(() => categories[0]?.id || 'drink', [categories]);
  const formTitle = viewMode === 'edit' ? 'Sửa món' : 'Thêm món mới';
  const isFormMode = viewMode === 'create' || viewMode === 'edit';

  useEffect(() => {
    if (viewMode === 'list') {
      return;
    }

    if (viewMode === 'edit' && selectedItem) {
      setName(selectedItem.name || '');
      setPrice(String(Number(selectedItem.price) || 0));
      setCategoryId(selectedItem.categoryId || defaultCategoryId);
      setDescription(selectedItem.description || '');
      setImageUri(getMenuItemImageUri(selectedItem));
      setStatus(getInitialStatus(selectedItem));
      setError('');
      return;
    }

    setName('');
    setPrice('');
    setCategoryId(defaultCategoryId);
    setDescription('');
    setImageUri('');
    setStatus('SELLING');
    setError('');
  }, [defaultCategoryId, selectedItem, viewMode]);

  const openCreate = () => {
    console.log('[AdminMenu] open create');
    setSelectedItem(null);
    setViewMode('create');
    console.log('[AdminMenu] active tab remains menu');
  };

  const openEdit = (item: RestaurantMenuItem) => {
    console.log(`[AdminMenu] open edit itemId=${item.id}`);
    setSelectedItem(item);
    setViewMode('edit');
    console.log('[AdminMenu] active tab remains menu');
  };

  const pickMenuImage = async () => {
    if (imagePicking) {
      return;
    }

    console.log(`[AdminMenuImage] pick image pressed itemId=${selectedItem?.id || 'new'}`);
    setImagePicking(true);
    setError('');

    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.86,
        includeBase64: false,
      });

      if (response.didCancel) {
        console.log('[AdminMenuImage] image pick cancelled');
        return;
      }

      if (response.errorCode) {
        const message = response.errorMessage || response.errorCode;
        console.warn('[AdminMenuImage] image pick error=' + message);
        setError('Không thể chọn ảnh. Vui lòng thử lại.');
        return;
      }

      const pickedUri = response.assets?.[0]?.uri || '';

      if (!pickedUri) {
        console.warn('[AdminMenuImage] image pick error=missing-uri');
        setError('Không lấy được đường dẫn ảnh đã chọn.');
        return;
      }

      console.log('[AdminMenuImage] selected new image uri=' + pickedUri);
      setImageUri(pickedUri);
    } catch (pickError) {
      console.warn('[AdminMenuImage] image pick error=', pickError);
      setError('Không thể mở thư viện ảnh trên thiết bị này.');
    } finally {
      setImagePicking(false);
    }
  };

  const cancelForm = () => {
    console.log('[AdminMenu] cancel form');
    setError('');
    setSaving(false);
    setSelectedItem(null);
    setViewMode('list');
    console.log('[AdminMenu] active tab remains menu');
  };

  const submitForm = async () => {
    const cleanName = name.trim();
    const cleanPriceText = price.trim().replace(/\./g, '').replace(/,/g, '');
    const priceValue = Number(cleanPriceText);
    const cleanCategoryId = categoryId.trim();

    if (!cleanName) {
      setError('Vui lòng nhập tên món');
      return;
    }

    if (!cleanPriceText || Number.isNaN(priceValue) || priceValue < 0) {
      setError('Vui lòng nhập giá hợp lệ và lớn hơn hoặc bằng 0');
      return;
    }

    if (!cleanCategoryId) {
      setError('Vui lòng chọn danh mục');
      return;
    }

    const isEdit = viewMode === 'edit' && !!selectedItem;
    const itemId = isEdit ? selectedItem.id : createLocalMenuItemId();

    setSaving(true);
    setError('');

    try {
      const cleanImageUri = imageUri.trim();

      console.log('[AdminMenuForm] draft image before save=' + (imageUri || 'none'));
      console.log('[AdminMenuForm] submit payload image=' + (cleanImageUri || 'none'));
      console.log(
        '[AdminMenu] save ' + (isEdit ? 'edit' : 'create') + ' with image=' + (cleanImageUri || 'none'),
      );

      await onSaveItem({
        id: itemId,
        createdAt: selectedItem?.createdAt,
        name: cleanName,
        price: priceValue,
        categoryId: cleanCategoryId,
        description: description.trim(),
        imageUri: cleanImageUri,
        status,
        available: status === 'SELLING',
      });

      console.log(
        `[AdminMenu] save ${isEdit ? 'edit' : 'create'} itemId=${itemId}`,
      );
      setSelectedItem(null);
      setViewMode('list');
      console.log('[AdminMenu] active tab remains menu');
    } catch (saveError) {
      console.warn('[AdminMenu] save failed', saveError);
      setError('Không thể lưu món. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (isFormMode) {
    return (
      <RNView>
        <RNView style={styles.sectionHeader}>
          <RNView>
            <RNText style={styles.sectionTitle}>{formTitle}</RNText>
            <RNText style={styles.sectionHint}>
              Nhập thông tin món. Bấm Huỷ để quay lại danh sách Quản lý món, không đổi sang Đơn hàng.
            </RNText>
          </RNView>
          <Pressable onPress={cancelForm} style={styles.cancelButton} disabled={saving}>
            <RNText style={styles.cancelButtonText}>Quay lại</RNText>
          </Pressable>
        </RNView>

        <RNView style={styles.editModalCard}>
          <RNView style={styles.editModalHeader}>
            <RNView>
              <RNText style={styles.editModalTitle}>{formTitle}</RNText>
              <RNText style={styles.editModalHint}>
                Dữ liệu lưu local qua restaurantAdminStore, sau này thay bằng API.
              </RNText>
            </RNView>
          </RNView>

          <RNText style={styles.inputLabel}>Tên món</RNText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Coca lạnh"
            placeholderTextColor="rgba(255,255,255,0.36)"
            style={styles.adminInput}
            returnKeyType="next"
          />

          <RNText style={styles.inputLabel}>Giá</RNText>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="25000"
            placeholderTextColor="rgba(255,255,255,0.36)"
            keyboardType="number-pad"
            style={styles.adminInput}
          />

          <RNText style={styles.inputLabel}>Danh mục</RNText>
          <RNView style={styles.categoryPickerWrap}>
            {categories.map(category => {
              const active = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.categoryPickChip, active ? styles.categoryPickChipActive : null]}>
                  <RNText
                    style={[
                      styles.categoryPickText,
                      active ? styles.categoryPickTextActive : null,
                    ]}>
                    {category.name}
                  </RNText>
                </Pressable>
              );
            })}
          </RNView>

          <RNText style={styles.inputLabel}>Mô tả / ghi chú món</RNText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả ngắn hiển thị cho nhân viên/khách"
            placeholderTextColor="rgba(255,255,255,0.36)"
            multiline
            style={[styles.adminInput, styles.adminTextArea]}
            textAlignVertical="top"
          />

          <RNText style={styles.inputLabel}>Ảnh món</RNText>
          <RNView style={styles.imagePickerCard}>
            {imageUri ? (
              <RNImage
                key={imageUri}
                source={{uri: imageUri}}
                style={styles.imagePickerPreview}
                resizeMode="cover"
              />
            ) : (
              <RNView style={[styles.imagePickerPreview, styles.imagePickerPlaceholder]}>
                <RNText style={styles.imagePickerPlaceholderText}>Chưa có ảnh</RNText>
              </RNView>
            )}

            <RNView style={styles.imagePickerInfo}>
              <RNText style={styles.imagePickerTitle}>
                {imageUri ? 'Ảnh món đã chọn' : 'Chọn ảnh trực tiếp từ máy'}
              </RNText>
              <RNText style={styles.imagePickerHint} numberOfLines={2}>
                Ảnh được lưu vào dữ liệu món bằng local URI. Menu khách sẽ dùng chung ảnh này nếu đang đọc cùng store.
              </RNText>
              <RNView style={styles.imagePickerButtonRow}>
                <Pressable
                  onPress={pickMenuImage}
                  style={styles.imagePickerButton}
                  disabled={saving || imagePicking}>
                  <RNText style={styles.imagePickerButtonText}>
                    {imagePicking ? 'Đang mở...' : imageUri ? 'Đổi ảnh' : 'Chọn ảnh từ máy'}
                  </RNText>
                </Pressable>
                {imageUri ? (
                  <Pressable
                    onPress={() => {
                      console.log('[AdminMenuImage] clear image');
                      setImageUri('');
                    }}
                    style={styles.imageRemoveButton}
                    disabled={saving || imagePicking}>
                    <RNText style={styles.imageRemoveButtonText}>Xoá ảnh</RNText>
                  </Pressable>
                ) : null}
              </RNView>
            </RNView>
          </RNView>

          <RNText style={styles.inputLabel}>Trạng thái</RNText>
          <RNView style={styles.categoryPickerWrap}>
            {STATUS_OPTIONS.map(option => {
              const active = option.value === status;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setStatus(option.value)}
                  style={[styles.categoryPickChip, active ? styles.categoryPickChipActive : null]}>
                  <RNText
                    style={[
                      styles.categoryPickText,
                      active ? styles.categoryPickTextActive : null,
                    ]}>
                    {option.label}
                  </RNText>
                </Pressable>
              );
            })}
          </RNView>

          {error ? <RNText style={styles.formError}>{error}</RNText> : null}

          <RNView style={styles.editModalFooter}>
            <Pressable onPress={cancelForm} style={styles.cancelButton} disabled={saving}>
              <RNText style={styles.cancelButtonText}>Huỷ</RNText>
            </Pressable>
            <Pressable onPress={submitForm} style={styles.saveButton} disabled={saving}>
              <RNText style={styles.saveButtonText}>{saving ? 'Đang lưu...' : 'Lưu'}</RNText>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    );
  }

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
          {menuItems.map(item => {
            const itemImageUri = getMenuItemImageUri(item);
            console.log(`[AdminMenuList] render itemId=${item.id} image=${itemImageUri || 'none'}`);

            return (
              <RNView key={`${item.id}-${itemImageUri || 'no-image'}`} style={styles.menuCard}>
                {itemImageUri ? (
                  <RNImage
                    key={itemImageUri}
                    source={{uri: itemImageUri}}
                    style={styles.menuThumb}
                    resizeMode="cover"
                  />
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
                      backgroundColor:
                        item.status === 'OUT_OF_STOCK'
                          ? 'rgba(255,75,75,0.16)'
                          : item.available
                            ? 'rgba(9,168,107,0.18)'
                            : 'rgba(242,165,26,0.16)',
                      borderColor:
                        item.status === 'OUT_OF_STOCK'
                          ? 'rgba(255,110,110,0.32)'
                          : item.available
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
            );
          })}
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminMenuManagementScreen);
