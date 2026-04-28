import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  Image as RNImage,
  Keyboard,
  NativeModules,
  Platform,
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
import {
  getMenuItemImageValue,
  persistRestaurantMenuImage,
} from 'services/restaurantMenuStorage';

const AdminFormImmersiveModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

type MenuItemFormInput = {
  id?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  description: string;
  imageUrl?: string;
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

type AdminMenuFormSession = {
  viewMode: ViewMode;
  selectedItemId: string | null;
  name: string;
  price: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  status: RestaurantMenuItemStatus;
};

const STATUS_OPTIONS: Array<{value: RestaurantMenuItemStatus; label: string}> = [
  {value: 'SELLING', label: 'Đang bán'},
  {value: 'HIDDEN', label: 'Tạm ẩn'},
  {value: 'OUT_OF_STOCK', label: 'Hết hàng'},
];

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const createLocalMenuItemId = () => {
  return `admin_dish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const getInitialStatus = (
  item?: RestaurantMenuItem | null,
): RestaurantMenuItemStatus => {
  if (
    item?.status === 'HIDDEN' ||
    item?.status === 'OUT_OF_STOCK' ||
    item?.status === 'SELLING'
  ) {
    return item.status;
  }

  return item?.available === false ? 'HIDDEN' : 'SELLING';
};

const createEmptyFormSession = (categoryId = 'drink'): AdminMenuFormSession => ({
  viewMode: 'list',
  selectedItemId: null,
  name: '',
  price: '',
  categoryId,
  description: '',
  imageUrl: '',
  status: 'SELLING',
});

// Keep the menu form outside the component so keyboard/system remounts cannot
// drop the Admin tab back to Orders or erase the form draft while typing.
let adminMenuFormSession: AdminMenuFormSession = createEmptyFormSession();

const AdminMenuManagementScreen = ({
  menuItems,
  categories,
  styles,
  onSaveItem,
}: Props) => {
  const defaultCategoryId = useMemo(() => categories[0]?.id || 'drink', [categories]);

  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => adminMenuFormSession.viewMode,
  );
  const [selectedItemId, setSelectedItemIdState] = useState<string | null>(
    () => adminMenuFormSession.selectedItemId,
  );
  const [name, setNameState] = useState(() => adminMenuFormSession.name);
  const [price, setPriceState] = useState(() => adminMenuFormSession.price);
  const [categoryId, setCategoryIdState] = useState(
    () => adminMenuFormSession.categoryId || defaultCategoryId,
  );
  const [description, setDescriptionState] = useState(
    () => adminMenuFormSession.description,
  );
  const [imageUrl, setImageUrlState] = useState(
    () => adminMenuFormSession.imageUrl,
  );
  const [status, setStatusState] = useState<RestaurantMenuItemStatus>(
    () => adminMenuFormSession.status,
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagePicking, setImagePicking] = useState(false);

  const pauseAdminFormInputImmersive = (field: string) => {
    console.log(`[AdminMenuForm] focus field=${field}`);
    AdminFormImmersiveModule?.pauseForCartInput?.(`admin-menu-form-${field}`);
  };

  const resumeAdminFormInputImmersive = (field: string) => {
    console.log(`[AdminMenuForm] blur field=${field}`);
    AdminFormImmersiveModule?.resumeAfterCartInput?.(`admin-menu-form-${field}`);
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) {
      return null;
    }

    return menuItems.find(item => item.id === selectedItemId) || null;
  }, [menuItems, selectedItemId]);

  const formTitle = viewMode === 'edit' ? 'Sửa món' : 'Thêm món mới';
  const isFormMode = viewMode === 'create' || viewMode === 'edit';

  const replaceFormSession = (next: AdminMenuFormSession) => {
    adminMenuFormSession = next;
    setViewModeState(next.viewMode);
    setSelectedItemIdState(next.selectedItemId);
    setNameState(next.name);
    setPriceState(next.price);
    setCategoryIdState(next.categoryId || defaultCategoryId);
    setDescriptionState(next.description);
    setImageUrlState(next.imageUrl);
    setStatusState(next.status);
  };

  const updateDraft = (patch: Partial<AdminMenuFormSession>) => {
    adminMenuFormSession = {...adminMenuFormSession, ...patch};

    if (Object.prototype.hasOwnProperty.call(patch, 'viewMode')) {
      setViewModeState(adminMenuFormSession.viewMode);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'selectedItemId')) {
      setSelectedItemIdState(adminMenuFormSession.selectedItemId);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      setNameState(adminMenuFormSession.name);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'price')) {
      setPriceState(adminMenuFormSession.price);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'categoryId')) {
      setCategoryIdState(adminMenuFormSession.categoryId);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
      setDescriptionState(adminMenuFormSession.description);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'imageUrl')) {
      setImageUrlState(adminMenuFormSession.imageUrl);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
      setStatusState(adminMenuFormSession.status);
    }
  };

  useEffect(() => {
    if (!categoryId && defaultCategoryId) {
      updateDraft({categoryId: defaultCategoryId});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, defaultCategoryId]);

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', () => {
      if (adminMenuFormSession.viewMode !== 'list') {
        console.log('[AdminMenuForm] keyboard show');
        console.log('[AdminMenu] active tab remains menu');
      }
    });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      if (adminMenuFormSession.viewMode !== 'list') {
        console.log('[AdminMenuForm] keyboard hide');
        console.log('[AdminMenu] active tab remains menu');
      }
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  const openCreate = () => {
    console.log('[AdminMenu] open create');
    replaceFormSession({
      ...createEmptyFormSession(defaultCategoryId),
      viewMode: 'create',
    });
    setError('');
    console.log('[AdminMenu] active tab remains menu');
  };

  const openEdit = (item: RestaurantMenuItem) => {
    const nextImageUrl = getMenuItemImageValue(item);

    console.log(`[AdminMenu] open edit itemId=${item.id}`);
    replaceFormSession({
      viewMode: 'edit',
      selectedItemId: item.id,
      name: item.name || '',
      price: String(Number(item.price) || 0),
      categoryId: item.categoryId || defaultCategoryId,
      description: item.description || '',
      imageUrl: nextImageUrl,
      status: getInitialStatus(item),
    });
    setError('');
    console.log('[AdminMenu] active tab remains menu');
  };

  const pickMenuImage = async () => {
    if (imagePicking) {
      return;
    }

    console.log(
      `[AdminMenuImage] pick image pressed itemId=${selectedItemId || 'new'}`,
    );
    setImagePicking(true);
    setError('');

    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.86,
        includeBase64: true,
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

      const pickedAsset = response.assets?.[0];
      const pickedUri = pickedAsset?.uri || '';

      if (!pickedUri) {
        console.warn('[AdminMenuImage] image pick error=missing-uri');
        setError('Không lấy được đường dẫn ảnh đã chọn.');
        return;
      }

      console.log('[AdminMenuImage] selected uri=' + pickedUri);

      const persistedUri = await persistRestaurantMenuImage({
        uri: pickedUri,
        base64: pickedAsset?.base64,
        itemId: selectedItemId || 'new_dish',
      });

      updateDraft({imageUrl: persistedUri});
      console.log('[AdminMenuForm] draft image after pick=' + persistedUri);
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
    replaceFormSession(createEmptyFormSession(defaultCategoryId));
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

    const isEdit = viewMode === 'edit' && !!selectedItemId;
    const itemId = isEdit ? selectedItemId : createLocalMenuItemId();
    const cleanImageUrl = getMenuItemImageValue({imageUrl});

    setSaving(true);
    setError('');

    try {
      console.log('[AdminMenuForm] draft image=' + (imageUrl || 'none'));
      console.log('[AdminMenuForm] submit image=' + (cleanImageUrl || 'none'));
      console.log(
        '[AdminMenu] save ' +
          (isEdit ? 'edit' : 'create') +
          ' with image=' +
          (cleanImageUrl || 'none'),
      );

      await onSaveItem({
        id: itemId,
        createdAt: isEdit ? selectedItem?.createdAt : undefined,
        name: cleanName,
        price: priceValue,
        categoryId: cleanCategoryId,
        description: description.trim(),
        imageUrl: cleanImageUrl,
        status,
        available: status === 'SELLING',
      });

      console.log(
        `[AdminMenu] save ${isEdit ? 'edit' : 'create'} itemId=${itemId}`,
      );
      replaceFormSession(createEmptyFormSession(defaultCategoryId));
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
            onChangeText={text => updateDraft({name: text})}
            onFocus={() => pauseAdminFormInputImmersive('name')}
            onBlur={() => resumeAdminFormInputImmersive('name')}
            placeholder="Ví dụ: Coca lạnh"
            placeholderTextColor="rgba(255,255,255,0.36)"
            style={styles.adminInput}
            returnKeyType="next"
          />

          <RNText style={styles.inputLabel}>Giá</RNText>
          <TextInput
            value={price}
            onChangeText={text => updateDraft({price: text})}
            onFocus={() => pauseAdminFormInputImmersive('price')}
            onBlur={() => resumeAdminFormInputImmersive('price')}
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
                  onPress={() => updateDraft({categoryId: category.id})}
                  style={[
                    styles.categoryPickChip,
                    active ? styles.categoryPickChipActive : null,
                  ]}>
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
            onChangeText={text => updateDraft({description: text})}
            onFocus={() => pauseAdminFormInputImmersive('description')}
            onBlur={() => resumeAdminFormInputImmersive('description')}
            placeholder="Mô tả ngắn hiển thị cho nhân viên/khách"
            placeholderTextColor="rgba(255,255,255,0.36)"
            multiline
            style={[styles.adminInput, styles.adminTextArea]}
            textAlignVertical="top"
          />

          <RNText style={styles.inputLabel}>Ảnh món</RNText>
          <RNView style={styles.imagePickerCard}>
            {imageUrl ? (
              <RNImage
                key={`${selectedItemId || 'new'}-${imageUrl}`}
                source={{uri: imageUrl}}
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
                {imageUrl ? 'Ảnh món đã chọn' : 'Chọn ảnh trực tiếp từ máy'}
              </RNText>
              <RNText style={styles.imagePickerHint} numberOfLines={2}>
                Ảnh được lưu vào field imageUrl. Admin và menu khách cùng đọc field này.
              </RNText>
              <RNView style={styles.imagePickerButtonRow}>
                <Pressable
                  onPress={pickMenuImage}
                  style={styles.imagePickerButton}
                  disabled={saving || imagePicking}>
                  <RNText style={styles.imagePickerButtonText}>
                    {imagePicking ? 'Đang mở...' : imageUrl ? 'Đổi ảnh' : 'Chọn ảnh từ máy'}
                  </RNText>
                </Pressable>
                {imageUrl ? (
                  <Pressable
                    onPress={() => {
                      console.log('[AdminMenuImage] clear image');
                      updateDraft({imageUrl: ''});
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
                  onPress={() => updateDraft({status: option.value})}
                  style={[
                    styles.categoryPickChip,
                    active ? styles.categoryPickChipActive : null,
                  ]}>
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
              <RNText style={styles.saveButtonText}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </RNText>
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
            const itemImageUri = getMenuItemImageValue(item);
            console.log(
              `[AdminMenuList] render itemId=${item.id} image=${itemImageUri || 'none'}`,
            );

            return (
              <RNView
                key={`${item.id}-${itemImageUri || 'no-image'}`}
                style={styles.menuCard}>
                {itemImageUri ? (
                  <RNImage
                    key={`${item.id}-${itemImageUri}`}
                    source={{uri: itemImageUri}}
                    style={styles.menuThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <RNView style={styles.menuThumb} />
                )}
                <RNView style={styles.menuInfo}>
                  <RNText style={styles.menuName} numberOfLines={2}>
                    {item.name}
                  </RNText>
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
                    <RNText style={styles.statusPillText}>
                      {getMenuItemStatusLabel(item)}
                    </RNText>
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
