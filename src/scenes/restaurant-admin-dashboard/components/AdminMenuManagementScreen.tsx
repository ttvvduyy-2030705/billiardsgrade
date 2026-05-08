import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image as RNImage,
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
  onSaveCategory: (
    input: Partial<MenuCategory> & {name: string},
  ) => Promise<{ok: boolean; message: string; categories: MenuCategory[]}>;
  onDeleteCategory: (
    categoryId: string,
    moveItemsToCategoryId?: string,
  ) => Promise<{
    ok: boolean;
    message: string;
    categories: MenuCategory[];
    menuItems: RestaurantMenuItem[];
  }>;
};

type ViewMode = 'list' | 'create' | 'edit' | 'categories';

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

const STATUS_OPTIONS: Array<{value: RestaurantMenuItemStatus; label: string}> =
  [
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

const createEmptyFormSession = (
  categoryId = 'drink',
): AdminMenuFormSession => ({
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
let adminCategoryDraftSession: {
  id: string | null;
  createdAt?: string;
  name: string;
} = {
  id: null,
  createdAt: undefined,
  name: '',
};

const AdminMenuManagementScreen = ({
  menuItems,
  categories,
  styles,
  onSaveItem,
  onSaveCategory,
  onDeleteCategory,
}: Props) => {
  const defaultCategoryId = useMemo(
    () => categories[0]?.id || 'drink',
    [categories],
  );

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
  const [categoryDraftId, setCategoryDraftId] = useState<string | null>(
    () => adminCategoryDraftSession.id,
  );
  const [categoryDraftCreatedAt, setCategoryDraftCreatedAt] = useState<
    string | undefined
  >(() => adminCategoryDraftSession.createdAt);
  const [categoryDraftName, setCategoryDraftNameState] = useState(
    () => adminCategoryDraftSession.name,
  );
  const [categoryError, setCategoryError] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const pauseAdminFormInputImmersive = (field: string) => {
    AdminFormImmersiveModule?.pauseForCartInput?.(`admin-menu-form-${field}`);
  };

  const resumeAdminFormInputImmersive = (field: string) => {
    AdminFormImmersiveModule?.resumeAfterCartInput?.(
      `admin-menu-form-${field}`,
    );
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) {
      return null;
    }

    return menuItems.find(item => item.id === selectedItemId) || null;
  }, [menuItems, selectedItemId]);

  const categoryCounts = useMemo(() => {
    return menuItems.reduce<Record<string, number>>((result, item) => {
      result[item.categoryId] = (result[item.categoryId] || 0) + 1;
      return result;
    }, {});
  }, [menuItems]);

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

  const updateDraft = (
    patch: Partial<AdminMenuFormSession>,
    options: {syncReactState?: boolean} = {},
  ) => {
    const syncReactState = options.syncReactState !== false;
    adminMenuFormSession = {...adminMenuFormSession, ...patch};

    // Text fields are updated on every keystroke. Keep those values in the
    // module draft immediately, but do not force a React re-render for every
    // character. This removes the small Android typing lag while submitForm
    // still reads the newest value from adminMenuFormSession.
    if (!syncReactState) {
      return;
    }

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

  const updateCategoryDraft = (patch: {
    id?: string | null;
    createdAt?: string;
    name?: string;
  }) => {
    adminCategoryDraftSession = {...adminCategoryDraftSession, ...patch};

    if (Object.prototype.hasOwnProperty.call(patch, 'id')) {
      setCategoryDraftId(adminCategoryDraftSession.id);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'createdAt')) {
      setCategoryDraftCreatedAt(adminCategoryDraftSession.createdAt);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      setCategoryDraftNameState(adminCategoryDraftSession.name);
    }
  };

  const resetCategoryDraft = () => {
    adminCategoryDraftSession = {id: null, createdAt: undefined, name: ''};
    setCategoryDraftId(null);
    setCategoryDraftCreatedAt(undefined);
    setCategoryDraftNameState('');
    setCategoryError('');
  };

  useEffect(() => {
    const categoryStillExists = categories.some(
      category => category.id === categoryId,
    );

    if ((!categoryId || !categoryStillExists) && defaultCategoryId) {
      updateDraft({categoryId: defaultCategoryId});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, categoryId, defaultCategoryId]);

  const openCreate = () => {
    replaceFormSession({
      ...createEmptyFormSession(defaultCategoryId),
      viewMode: 'create',
    });
    setError('');
  };

  const openCategoryManager = () => {
    replaceFormSession({
      ...createEmptyFormSession(defaultCategoryId),
      viewMode: 'categories',
    });
    resetCategoryDraft();
  };

  const closeCategoryManager = () => {
    replaceFormSession(createEmptyFormSession(defaultCategoryId));
    resetCategoryDraft();
  };

  const openEdit = (item: RestaurantMenuItem) => {
    const nextImageUrl = getMenuItemImageValue(item);

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
  };

  const pickMenuImage = async () => {
    if (imagePicking) {
      return;
    }

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

      const persistedUri = await persistRestaurantMenuImage({
        uri: pickedUri,
        base64: pickedAsset?.base64,
        itemId: selectedItemId || 'new_dish',
      });

      updateDraft({imageUrl: persistedUri});
    } catch (pickError) {
      console.warn('[AdminMenuImage] image pick error=', pickError);
      setError('Không thể mở thư viện ảnh trên thiết bị này.');
    } finally {
      setImagePicking(false);
    }
  };

  const cancelForm = () => {
    setError('');
    setSaving(false);
    replaceFormSession(createEmptyFormSession(defaultCategoryId));
  };

  const submitForm = async () => {
    // Use the module-level draft as the source of truth. On Android, keyboard
    // focus changes and the image picker can schedule React state updates a
    // frame later than the user's tap on “Lưu”, so reading state variables here
    // can save the old item/image or show a false validation error.
    const draft = adminMenuFormSession;
    const draftName = draft.name ?? name;
    const draftPrice = draft.price ?? price;
    const draftCategoryId = draft.categoryId ?? categoryId;
    const draftDescription = draft.description ?? description;
    const draftImageUrl = draft.imageUrl ?? imageUrl;
    const draftStatus = draft.status ?? status;
    const draftViewMode = draft.viewMode ?? viewMode;
    const draftSelectedItemId = draft.selectedItemId ?? selectedItemId;

    const cleanName = draftName.trim();
    const cleanPriceText = draftPrice
      .trim()
      .replace(/\./g, '')
      .replace(/,/g, '');
    const priceValue = Number(cleanPriceText);
    const cleanCategoryId = draftCategoryId.trim();

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

    const isEdit = draftViewMode === 'edit' && !!draftSelectedItemId;
    const itemId = isEdit
      ? String(draftSelectedItemId)
      : createLocalMenuItemId();
    const cleanImageUrl = getMenuItemImageValue({imageUrl: draftImageUrl});
    const editingItem = isEdit
      ? menuItems.find(item => item.id === itemId) || selectedItem
      : null;

    setSaving(true);
    setError('');

    try {
      await onSaveItem({
        id: itemId,
        createdAt: isEdit ? editingItem?.createdAt : undefined,
        name: cleanName,
        price: priceValue,
        categoryId: cleanCategoryId,
        description: draftDescription.trim(),
        imageUrl: cleanImageUrl,
        status: draftStatus,
        available: draftStatus === 'SELLING',
      });

      replaceFormSession(createEmptyFormSession(defaultCategoryId));
    } catch (saveError) {
      console.warn('[AdminMenu] save failed', saveError);
      setError('Không thể lưu món. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const showNativeTextInput = async ({
    title,
    placeholder,
    initialValue,
    keyboardType,
    source,
  }: {
    title: string;
    placeholder: string;
    initialValue: string;
    keyboardType: 'text' | 'number' | 'note';
    source: string;
  }) => {
    if (Platform.OS !== 'android') {
      return null;
    }

    const nativeDialog = (AdminFormImmersiveModule as any)
      ?.showCartTextInputDialog;
    if (typeof nativeDialog !== 'function') {
      return null;
    }

    return nativeDialog(title, placeholder, initialValue, keyboardType, source);
  };

  const showNativeCategoryNameInput = async () => {
    return showNativeTextInput({
      title: categoryDraftId ? 'Sửa tên danh mục' : 'Thêm danh mục',
      placeholder: 'VD: Cơm / Lẩu / Hải sản / Combo',
      initialValue: categoryDraftName,
      keyboardType: 'text',
      source: 'admin-category-name',
    });
  };

  const openCategoryNameInput = async () => {
    setCategoryError('');

    try {
      const nextName = await showNativeCategoryNameInput();
      if (typeof nextName === 'string') {
        updateCategoryDraft({name: nextName});
      }
    } catch (nativeError) {
      console.warn('[AdminCategory] native input failed', nativeError);
    }
  };

  const openMenuFormInput = async (field: 'name' | 'price' | 'description') => {
    const config = {
      name: {
        title: viewMode === 'edit' ? 'Sửa tên món' : 'Nhập tên món',
        placeholder: 'Ví dụ: Coca lạnh',
        keyboardType: 'text' as const,
        initialValue: adminMenuFormSession.name,
      },
      price: {
        title: 'Nhập giá món',
        placeholder: '25000',
        keyboardType: 'number' as const,
        initialValue: adminMenuFormSession.price,
      },
      description: {
        title: 'Nhập mô tả / ghi chú món',
        placeholder: 'Mô tả ngắn hiển thị cho nhân viên/khách',
        keyboardType: 'note' as const,
        initialValue: adminMenuFormSession.description,
      },
    }[field];

    setError('');

    try {
      const nextValue = await showNativeTextInput({
        ...config,
        source: `admin-menu-form-${field}`,
      });

      if (typeof nextValue === 'string') {
        updateDraft({[field]: nextValue} as Partial<AdminMenuFormSession>);
      }
    } catch (nativeError) {
      console.warn(`[AdminMenu] native ${field} input failed`, nativeError);
    }
  };

  const renderMenuFormTextField = ({
    field,
    placeholder,
    keyboardType = 'default',
    multiline = false,
  }: {
    field: 'name' | 'price' | 'description';
    placeholder: string;
    keyboardType?: 'default' | 'number-pad';
    multiline?: boolean;
  }) => {
    const currentValue =
      field === 'name' ? name : field === 'price' ? price : description;

    if (Platform.OS === 'android') {
      return (
        <Pressable
          onPress={() => openMenuFormInput(field)}
          style={[
            styles.adminInput,
            styles.adminInputButton,
            multiline ? styles.adminTextArea : null,
          ]}
          disabled={saving}>
          <RNText
            style={
              currentValue
                ? styles.adminInputValueText
                : styles.adminInputPlaceholderText
            }
            numberOfLines={multiline ? 4 : 1}>
            {currentValue || placeholder}
          </RNText>
        </Pressable>
      );
    }

    return (
      <TextInput
        key={`${field}-${viewMode}-${selectedItemId || 'new'}`}
        defaultValue={adminMenuFormSession[field]}
        onChangeText={text =>
          updateDraft({[field]: text} as Partial<AdminMenuFormSession>, {
            syncReactState: false,
          })
        }
        onFocus={() => pauseAdminFormInputImmersive(field)}
        onBlur={() => resumeAdminFormInputImmersive(field)}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.36)"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.adminInput, multiline ? styles.adminTextArea : null]}
        textAlignVertical={multiline ? 'top' : undefined}
        returnKeyType={field === 'name' ? 'next' : 'done'}
      />
    );
  };

  const submitCategory = async () => {
    const cleanName = categoryDraftName.trim();

    if (!cleanName) {
      setCategoryError('Vui lòng nhập tên danh mục');
      return;
    }

    setCategorySaving(true);
    setCategoryError('');

    try {
      const result = await onSaveCategory({
        id: categoryDraftId || undefined,
        createdAt: categoryDraftCreatedAt,
        name: cleanName,
      });

      if (!result.ok) {
        setCategoryError(result.message);
        return;
      }

      const nextDefaultCategoryId =
        result.categories[0]?.id || defaultCategoryId;
      if (!categoryId && nextDefaultCategoryId) {
        updateDraft({categoryId: nextDefaultCategoryId});
      }

      resetCategoryDraft();
    } catch (saveCategoryError) {
      console.warn('[AdminCategory] save failed', saveCategoryError);
      setCategoryError('Không thể lưu danh mục. Vui lòng thử lại.');
    } finally {
      setCategorySaving(false);
    }
  };

  const editCategory = (category: MenuCategory) => {
    updateCategoryDraft({
      id: category.id,
      createdAt: category.createdAt,
      name: category.name,
    });
    setCategoryError('');
  };

  const performDeleteCategory = async (category: MenuCategory) => {
    const fallbackCategory = categories.find(item => item.id !== category.id);

    if (!fallbackCategory) {
      setCategoryError('Menu cần ít nhất 1 danh mục.');
      return;
    }

    setCategorySaving(true);
    setCategoryError('');

    try {
      const result = await onDeleteCategory(category.id, fallbackCategory.id);

      if (!result.ok) {
        setCategoryError(result.message);
        return;
      }

      if (categoryDraftId === category.id) {
        resetCategoryDraft();
      }

      if (categoryId === category.id) {
        updateDraft({
          categoryId: result.categories[0]?.id || fallbackCategory.id,
        });
      }
    } catch (deleteCategoryError) {
      console.warn('[AdminCategory] delete failed', deleteCategoryError);
      setCategoryError('Không thể xoá danh mục. Vui lòng thử lại.');
    } finally {
      setCategorySaving(false);
    }
  };

  const requestDeleteCategory = (category: MenuCategory) => {
    const itemCount = categoryCounts[category.id] || 0;
    const fallbackCategory = categories.find(item => item.id !== category.id);

    if (!fallbackCategory) {
      setCategoryError('Menu cần ít nhất 1 danh mục.');
      return;
    }

    if (itemCount <= 0) {
      void performDeleteCategory(category);
      return;
    }

    Alert.alert(
      'Xoá danh mục',
      `Danh mục “${category.name}” đang có ${itemCount} món. Xoá danh mục này và chuyển các món sang “${fallbackCategory.name}”?`,
      [
        {text: 'Huỷ', style: 'cancel'},
        {
          text: 'Xoá và chuyển món',
          style: 'destructive',
          onPress: () => void performDeleteCategory(category),
        },
      ],
    );
  };

  const renderCategoryNameInput = () => {
    if (Platform.OS === 'android') {
      return (
        <Pressable
          onPress={openCategoryNameInput}
          style={[styles.adminInput, styles.adminInputButton]}
          disabled={categorySaving}>
          <RNText
            style={
              categoryDraftName
                ? styles.adminInputValueText
                : styles.adminInputPlaceholderText
            }
            numberOfLines={1}>
            {categoryDraftName || 'Nhập tên danh mục'}
          </RNText>
        </Pressable>
      );
    }

    return (
      <TextInput
        key={`category-name-${categoryDraftId || 'new'}`}
        defaultValue={categoryDraftName}
        onChangeText={text => updateCategoryDraft({name: text})}
        onFocus={() => pauseAdminFormInputImmersive('category-name')}
        onBlur={() => resumeAdminFormInputImmersive('category-name')}
        placeholder="VD: Cơm / Lẩu / Món nướng"
        placeholderTextColor="rgba(255,255,255,0.36)"
        style={styles.adminInput}
        returnKeyType="done"
      />
    );
  };

  if (viewMode === 'categories') {
    return (
      <RNView>
        <RNView style={styles.sectionHeader}>
          <RNView>
            <RNText style={styles.sectionTitle}>Quản lý danh mục</RNText>
            <RNText style={styles.sectionHint}>
              Thêm, sửa hoặc xoá danh mục. Menu khách hàng và form món sẽ lấy
              trực tiếp từ danh sách này.
            </RNText>
          </RNView>
          <Pressable
            onPress={closeCategoryManager}
            style={styles.cancelButton}
            disabled={categorySaving}>
            <RNText style={styles.cancelButtonText}>Quay lại</RNText>
          </Pressable>
        </RNView>

        <RNView style={styles.categoryManagerCard}>
          <RNText style={styles.editModalTitle}>
            {categoryDraftId ? 'Sửa danh mục' : 'Thêm danh mục'}
          </RNText>
          <RNText style={styles.editModalHint}>
            Tên danh mục được lưu vào AsyncStorage và dùng chung cho Admin +
            Menu khách hàng.
          </RNText>

          <RNView style={styles.categoryFormRow}>
            <RNView style={styles.categoryInputColumn}>
              <RNText style={styles.inputLabel}>Tên danh mục</RNText>
              {renderCategoryNameInput()}
            </RNView>
            <Pressable
              onPress={submitCategory}
              style={styles.saveButton}
              disabled={categorySaving}>
              <RNText style={styles.saveButtonText}>
                {categorySaving
                  ? 'Đang lưu...'
                  : categoryDraftId
                    ? 'Lưu'
                    : 'Thêm'}
              </RNText>
            </Pressable>
            {categoryDraftId ? (
              <Pressable
                onPress={resetCategoryDraft}
                style={styles.cancelButton}
                disabled={categorySaving}>
                <RNText style={styles.cancelButtonText}>Huỷ sửa</RNText>
              </Pressable>
            ) : null}
          </RNView>

          {categoryError ? (
            <RNText style={styles.formError}>{categoryError}</RNText>
          ) : null}

          <RNView style={styles.categoryList}>
            {categories.map(category => {
              const itemCount = categoryCounts[category.id] || 0;
              const editing = category.id === categoryDraftId;

              return (
                <RNView
                  key={category.id}
                  style={[
                    styles.categoryRow,
                    editing ? styles.categoryRowActive : null,
                  ]}>
                  <RNView style={styles.categoryInfo}>
                    <RNText style={styles.categoryName}>{category.name}</RNText>
                    <RNText style={styles.categoryMeta}>
                      {itemCount} món · ID: {category.id}
                    </RNText>
                  </RNView>
                  <RNView style={styles.categoryActions}>
                    <Pressable
                      onPress={() => editCategory(category)}
                      style={styles.cancelButton}
                      disabled={categorySaving}>
                      <RNText style={styles.cancelButtonText}>Sửa</RNText>
                    </Pressable>
                    <Pressable
                      onPress={() => requestDeleteCategory(category)}
                      style={styles.dangerButton}
                      disabled={categorySaving}>
                      <RNText style={styles.dangerButtonText}>Xoá</RNText>
                    </Pressable>
                  </RNView>
                </RNView>
              );
            })}
          </RNView>
        </RNView>
      </RNView>
    );
  }

  if (isFormMode) {
    return (
      <RNView>
        <RNView style={styles.sectionHeader}>
          <RNView>
            <RNText style={styles.sectionTitle}>{formTitle}</RNText>
            <RNText style={styles.sectionHint}>
              Nhập thông tin món. Bấm Huỷ để quay lại danh sách Quản lý món,
              không đổi sang Đơn hàng.
            </RNText>
          </RNView>
          <Pressable
            onPress={cancelForm}
            style={styles.cancelButton}
            disabled={saving}>
            <RNText style={styles.cancelButtonText}>Quay lại</RNText>
          </Pressable>
        </RNView>

        <RNView style={styles.editModalCard}>
          <RNView style={styles.editModalHeader}>
            <RNView>
              <RNText style={styles.editModalTitle}>{formTitle}</RNText>
              <RNText style={styles.editModalHint}>
                Dữ liệu lưu local qua restaurantAdminStore, sau này thay bằng
                API.
              </RNText>
            </RNView>
          </RNView>

          <RNText style={styles.inputLabel}>Tên món</RNText>
          {renderMenuFormTextField({
            field: 'name',
            placeholder: 'Ví dụ: Coca lạnh',
          })}

          <RNText style={styles.inputLabel}>Giá</RNText>
          {renderMenuFormTextField({
            field: 'price',
            placeholder: '25000',
            keyboardType: 'number-pad',
          })}

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
          {renderMenuFormTextField({
            field: 'description',
            placeholder: 'Mô tả ngắn hiển thị cho nhân viên/khách',
            multiline: true,
          })}

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
              <RNView
                style={[
                  styles.imagePickerPreview,
                  styles.imagePickerPlaceholder,
                ]}>
                <RNText style={styles.imagePickerPlaceholderText}>
                  Chưa có ảnh
                </RNText>
              </RNView>
            )}

            <RNView style={styles.imagePickerInfo}>
              <RNText style={styles.imagePickerTitle}>
                {imageUrl ? 'Ảnh món đã chọn' : 'Chọn ảnh trực tiếp từ máy'}
              </RNText>
              <RNText style={styles.imagePickerHint} numberOfLines={2}>
                Ảnh được lưu vào field imageUrl. Admin và menu khách cùng đọc
                field này.
              </RNText>
              <RNView style={styles.imagePickerButtonRow}>
                <Pressable
                  onPress={pickMenuImage}
                  style={styles.imagePickerButton}
                  disabled={saving || imagePicking}>
                  <RNText style={styles.imagePickerButtonText}>
                    {imagePicking
                      ? 'Đang mở...'
                      : imageUrl
                        ? 'Đổi ảnh'
                        : 'Chọn ảnh từ máy'}
                  </RNText>
                </Pressable>
                {imageUrl ? (
                  <Pressable
                    onPress={() => {
                      updateDraft({imageUrl: ''});
                    }}
                    style={styles.imageRemoveButton}
                    disabled={saving || imagePicking}>
                    <RNText style={styles.imageRemoveButtonText}>
                      Xoá ảnh
                    </RNText>
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
            <Pressable
              onPress={cancelForm}
              style={styles.cancelButton}
              disabled={saving}>
              <RNText style={styles.cancelButtonText}>Huỷ</RNText>
            </Pressable>
            <Pressable
              onPress={submitForm}
              style={styles.saveButton}
              disabled={saving}>
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
            {menuItems.length} món · {categories.length} danh mục · Dữ liệu lưu
            local để sau này thay bằng API.
          </RNText>
        </RNView>
        <RNView style={styles.sectionHeaderActions}>
          <Pressable
            onPress={openCategoryManager}
            style={styles.headerSecondaryButton}>
            <RNText style={styles.headerSecondaryButtonText}>
              + Thêm danh mục
            </RNText>
          </Pressable>
          <Pressable onPress={openCreate} style={styles.primaryButton}>
            <RNText style={styles.primaryButtonText}>+ Thêm món</RNText>
          </Pressable>
        </RNView>
      </RNView>

      {menuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🍽️</RNText>
          <RNText style={styles.emptyText}>Chưa có món nào</RNText>
          <RNText style={styles.emptySubText}>
            Bấm “Thêm món” để tạo món local đầu tiên.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.grid}>
          {menuItems.map(item => {
            const itemImageUri = getMenuItemImageValue(item);

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
                  <RNText style={styles.priceText}>
                    {formatCurrency(item.price)}
                  </RNText>
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
                  <Pressable
                    onPress={() => openEdit(item)}
                    style={styles.secondaryButton}>
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
