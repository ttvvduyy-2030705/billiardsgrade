import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Image as RNImage,
  NativeModules,
  Platform,
  Pressable,
  TextInput,
  View as RNView,
} from 'react-native';
import RNText from './AdminText';
import type {ImageResizeMode, ImageStyle, StyleProp} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

import {
  getCategoryLabel,
  getMenuItemStatusLabel,
} from 'services/restaurantAdminStore';
import {devWarn} from 'utils/devLogger';
import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
} from 'services/restaurantMenuRepository';
import {
  createRestaurantMenuImagePreviewUri,
  getMenuItemImageValue,
  persistRestaurantMenuImage,
  resolveRestaurantMenuImage,
} from 'services/restaurantMenuImage';

const AdminFormImmersiveModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

type NativeMenuImagePickerResult = {
  cancelled?: boolean;
  uri?: string;
  base64?: string;
  mimeType?: string;
  fileName?: string;
};

type MenuImagePickerResponse = {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: Array<{
    uri?: string;
    base64?: string;
    type?: string;
    fileName?: string;
  }>;
};

type NativeMenuImagePickerModuleType = {
  pickMenuImage?: () => Promise<NativeMenuImagePickerResult>;
};

const NativeMenuImagePicker =
  Platform.OS === 'android'
    ? ((NativeModules.AplusMenuImagePickerModule ||
        NativeModules.AplusMenuImagePicker) as
        | NativeMenuImagePickerModuleType
        | undefined)
    : undefined;

const pickMenuImageAsset = async (): Promise<MenuImagePickerResponse> => {
  if (NativeMenuImagePicker?.pickMenuImage) {
    const nativeResult = await NativeMenuImagePicker.pickMenuImage();
    if (nativeResult?.cancelled) {
      return {didCancel: true};
    }

    return {
      assets: [
        {
          uri: nativeResult?.uri || '',
          base64: nativeResult?.base64 || '',
          type: nativeResult?.mimeType || 'image/jpeg',
          fileName: nativeResult?.fileName || 'menu_image.jpg',
        },
      ],
    };
  }

  return launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.5,
    maxWidth: 900,
    maxHeight: 900,
    includeBase64: true,
  }) as Promise<MenuImagePickerResponse>;
};

type MenuItemFormInput = {
  id?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName?: string;
  description: string;
  imageUrl?: string;
  status: RestaurantMenuItemStatus;
  available?: boolean;
};

type MenuItemImageUploadInput = {
  itemId?: string;
  dishId?: string;
  uri?: string;
  base64?: string;
  dataUri?: string;
  fileName?: string;
  mimeType?: string;
};

type MenuItemImageUploadResult = {
  imageUrl?: string;
  publicUrl?: string;
  itemUpdated?: boolean;
  items?: RestaurantMenuItem[];
};

type Props = {
  menuItems: RestaurantMenuItem[];
  categories: MenuCategory[];
  styles: any;
  onSaveItem: (input: MenuItemFormInput) => Promise<RestaurantMenuItem[]>;
  onDeleteItem: (itemId: string) => Promise<RestaurantMenuItem[]>;
  onUploadImage?: (
    input: MenuItemImageUploadInput,
  ) => Promise<MenuItemImageUploadResult>;
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
type MenuStatusFilter = 'ALL' | RestaurantMenuItemStatus;
type MenuSortOption =
  | 'CREATED_DESC'
  | 'NAME_ASC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'STATUS_ASC';

type AdminMenuFormSession = {
  viewMode: ViewMode;
  selectedItemId: string | null;
  name: string;
  price: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  imageUrl: string;
  pendingImageUri?: string;
  pendingImageBase64?: string;
  pendingImageDataUri?: string;
  pendingImageFileName?: string;
  pendingImageMimeType?: string;
  status: RestaurantMenuItemStatus;
};

const STATUS_OPTIONS: Array<{
  value: RestaurantMenuItemStatus;
  label: string;
}> = [
  {value: 'SELLING', label: 'Đang bán'},
  {value: 'HIDDEN', label: 'Tạm ẩn'},
  {value: 'OUT_OF_STOCK', label: 'Hết hàng'},
];

const STATUS_FILTER_OPTIONS: Array<{value: MenuStatusFilter; label: string}> = [
  {value: 'ALL', label: 'Tất cả trạng thái'},
  ...STATUS_OPTIONS,
];

const SORT_OPTIONS: Array<{value: MenuSortOption; label: string}> = [
  {value: 'CREATED_DESC', label: 'Mới nhất'},
  {value: 'NAME_ASC', label: 'Tên A-Z'},
  {value: 'PRICE_ASC', label: 'Giá thấp-cao'},
  {value: 'PRICE_DESC', label: 'Giá cao-thấp'},
  {value: 'STATUS_ASC', label: 'Theo trạng thái'},
];

const normaliseSearchTerm = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getItemStatusRank = (item: RestaurantMenuItem) => {
  if (item.status === 'SELLING') {
    return 0;
  }
  if (item.status === 'OUT_OF_STOCK') {
    return 1;
  }
  return 2;
};

const getItemTimestamp = (item: RestaurantMenuItem) => {
  const rawTime = item.updatedAt || item.createdAt || '';
  const value = new Date(rawTime).getTime();
  return Number.isFinite(value) ? value : 0;
};

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const findSavedMenuItemForPayload = (
  items: RestaurantMenuItem[],
  payload: {
    id?: string;
    name: string;
    price: number;
    categoryId: string;
    categoryName?: string;
  },
  categories: MenuCategory[],
) => {
  const expectedName = normaliseSearchTerm(payload.name);
  const expectedCategoryName = normaliseSearchTerm(payload.categoryName);
  const categoryNameById = categories.reduce<Record<string, string>>(
    (result, category) => {
      result[category.id] = normaliseSearchTerm(category.name);
      return result;
    },
    {},
  );

  return (
    (payload.id ? items.find(item => item.id === payload.id) : undefined) ||
    items.find(item => {
      const sameName = normaliseSearchTerm(item.name) === expectedName;
      const samePrice = Math.abs(Number(item.price || 0) - payload.price) < 1;
      const sameCategory =
        item.categoryId === payload.categoryId ||
        (!!expectedCategoryName &&
          categoryNameById[item.categoryId] === expectedCategoryName);

      return sameName && samePrice && sameCategory;
    }) ||
    null
  );
};

type AdminMenuImageProps = {
  imageValue: string;
  imageKey: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

const AdminMenuImage = memo(
  ({
    imageValue,
    imageKey,
    style,
    resizeMode = 'cover',
  }: AdminMenuImageProps) => {
    const [failed, setFailed] = useState(false);
    const imageResolution = useMemo(
      () =>
        resolveRestaurantMenuImage(
          {imageUrl: imageValue},
          {forceFallback: failed, cacheKey: imageKey},
        ),
      [failed, imageKey, imageValue],
    );

    useEffect(() => {
      setFailed(false);
    }, [imageValue]);

    return (
      <RNImage
        key={imageResolution.cacheKey}
        source={imageResolution.source}
        style={style}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
      />
    );
  },
);

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

const createEmptyFormSession = (categoryId = ''): AdminMenuFormSession => ({
  viewMode: 'list',
  selectedItemId: null,
  name: '',
  price: '',
  categoryId,
  description: '',
  imageUrl: '',
  pendingImageUri: '',
  pendingImageBase64: '',
  pendingImageDataUri: '',
  pendingImageFileName: '',
  pendingImageMimeType: '',
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
  onDeleteItem,
  onUploadImage,
  onSaveCategory,
  onDeleteCategory,
}: Props) => {
  const defaultCategoryId = useMemo(
    () => categories[0]?.id || '',
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState(
    () => adminMenuFormSession.imageUrl,
  );
  const [imagePreviewRevision, setImagePreviewRevision] = useState(0);
  const [status, setStatusState] = useState<RestaurantMenuItemStatus>(
    () => adminMenuFormSession.status,
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagePicking, setImagePicking] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imagePickRequestIdRef = useRef(0);
  const [listError, setListError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState<MenuSortOption>('CREATED_DESC');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
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

  const statusCounts = useMemo(() => {
    return menuItems.reduce<Record<RestaurantMenuItemStatus, number>>(
      (result, item) => {
        const itemStatus = getInitialStatus(item);
        result[itemStatus] += 1;
        return result;
      },
      {SELLING: 0, OUT_OF_STOCK: 0, HIDDEN: 0},
    );
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    const search = normaliseSearchTerm(searchTerm);

    return menuItems
      .filter(item => {
        const itemStatus = getInitialStatus(item);
        const category = getCategoryLabel(item.categoryId, categories);

        const matchesSearch =
          !search ||
          normaliseSearchTerm(
            `${item.name} ${item.description} ${item.id} ${item.categoryId} ${category}`,
          ).includes(search);
        const matchesCategory =
          categoryFilter === 'ALL' || item.categoryId === categoryFilter;
        const matchesStatus =
          statusFilter === 'ALL' || itemStatus === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'NAME_ASC':
            return a.name.localeCompare(b.name, 'vi');
          case 'PRICE_ASC':
            return Number(a.price || 0) - Number(b.price || 0);
          case 'PRICE_DESC':
            return Number(b.price || 0) - Number(a.price || 0);
          case 'STATUS_ASC':
            return (
              getItemStatusRank(a) - getItemStatusRank(b) ||
              a.name.localeCompare(b.name, 'vi')
            );
          case 'CREATED_DESC':
          default:
            return getItemTimestamp(b) - getItemTimestamp(a);
        }
      });
  }, [
    categories,
    categoryFilter,
    menuItems,
    searchTerm,
    sortOption,
    statusFilter,
  ]);

  const isFilteringMenu =
    !!searchTerm.trim() || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const formTitle = viewMode === 'edit' ? 'Sửa món' : 'Thêm món mới';
  const isFormMode = viewMode === 'create' || viewMode === 'edit';
  const formPreviewImageUrl = imagePreviewUrl || imageUrl;

  const replaceFormSession = (next: AdminMenuFormSession) => {
    adminMenuFormSession = next;
    setViewModeState(next.viewMode);
    setSelectedItemIdState(next.selectedItemId);
    setNameState(next.name);
    setPriceState(next.price);
    setCategoryIdState(next.categoryId || defaultCategoryId);
    setDescriptionState(next.description);
    setImageUrlState(next.imageUrl);
    setImagePreviewUrl(next.imageUrl);
    setImagePreviewRevision(revision => revision + 1);
    setStatusState(next.status);
  };

  const updateDraft = (
    patch: Partial<AdminMenuFormSession>,
    options: {syncReactState?: boolean; syncImagePreview?: boolean} = {},
  ) => {
    const syncReactState = options.syncReactState !== false;
    const syncImagePreview = options.syncImagePreview !== false;
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
      if (syncImagePreview) {
        setImagePreviewUrl(adminMenuFormSession.imageUrl);
        setImagePreviewRevision(revision => revision + 1);
      }
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
    if (categories.length === 0) {
      setListError('Bạn cần thêm ít nhất 1 danh mục trước khi thêm món.');
      replaceFormSession({
        ...createEmptyFormSession(defaultCategoryId),
        viewMode: 'categories',
      });
      return;
    }

    setListError('');
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
    setListError('');
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
    if (imagePicking || imageProcessing || imageUploading || saving) {
      return;
    }

    const requestId = imagePickRequestIdRef.current + 1;
    imagePickRequestIdRef.current = requestId;
    setImagePicking(true);
    setImageProcessing(false);
    setError('');
    setListError('');

    try {
      const response = await pickMenuImageAsset();

      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        const message = response.errorMessage || response.errorCode;
        devWarn('[AdminMenuImage] image pick error=' + message);
        setError('Không thể chọn ảnh. Vui lòng thử lại.');
        return;
      }

      const pickedAsset = response.assets?.[0];
      const pickedUri = pickedAsset?.uri || '';
      const pickedBase64 = String(pickedAsset?.base64 || '').trim();
      const pickedMimeType = pickedAsset?.type || 'image/jpeg';
      const inlineDataUri = pickedBase64
        ? createRestaurantMenuImagePreviewUri({
            uri: '',
            base64: pickedBase64,
            type: pickedMimeType,
          })
        : '';

      if (!pickedUri && !pickedBase64) {
        devWarn('[AdminMenuImage] image pick error=missing-uri-base64');
        setError('Không lấy được ảnh đã chọn. Vui lòng chọn ảnh khác.');
        return;
      }

      // Cập nhật draft ngay lập tức để dù Android remount màn hình sau khi đóng
      // thư viện ảnh, form vẫn biết rằng ảnh đã được chọn trong lần bấm đầu tiên.
      const firstPreviewUri = pickedUri || inlineDataUri;
      updateDraft(
        {
          imageUrl: firstPreviewUri,
          pendingImageUri: pickedUri,
          pendingImageBase64: pickedBase64,
          pendingImageDataUri: inlineDataUri,
          pendingImageFileName: pickedAsset?.fileName || '',
          pendingImageMimeType: pickedMimeType,
        },
        {syncImagePreview: false},
      );
      setImageUrlState(firstPreviewUri);
      setImagePreviewUrl(firstPreviewUri);
      setImagePreviewRevision(revision => revision + 1);

      // Android release có máy không render ổn content:// hoặc data:image quá dài.
      // Vì vậy sau khi nhận ảnh lần 1, tạo luôn một file preview riêng trong app
      // rồi đổi preview sang file:// ổn định. Đây vẫn là cùng một lần chọn ảnh,
      // không yêu cầu người dùng bấm chọn lại lần 2.
      setImageProcessing(true);
      try {
        const stablePreviewUri = await persistRestaurantMenuImage({
          uri: pickedUri,
          base64: pickedBase64,
          itemId: selectedItemId || 'menu_draft_preview',
          type: pickedMimeType,
          fileName: pickedAsset?.fileName || '',
        });

        if (stablePreviewUri && imagePickRequestIdRef.current === requestId) {
          updateDraft(
            {
              imageUrl: stablePreviewUri,
              pendingImageUri: stablePreviewUri,
              pendingImageBase64: pickedBase64,
              pendingImageDataUri: inlineDataUri,
              pendingImageFileName: pickedAsset?.fileName || '',
              pendingImageMimeType: pickedMimeType,
            },
            {syncImagePreview: false},
          );
          setImageUrlState(stablePreviewUri);
          setImagePreviewUrl(stablePreviewUri);
          setImagePreviewRevision(revision => revision + 1);
        }
      } catch (persistError) {
        devWarn('[AdminMenuImage] stable preview persist failed', persistError);
        // Giữ firstPreviewUri đã set ở trên, không bắt người dùng chọn lại.
      }
    } catch (pickError) {
      devWarn('[AdminMenuImage] image pick error=', pickError);
      setError('Không thể mở thư viện ảnh trên thiết bị này.');
    } finally {
      if (imagePickRequestIdRef.current === requestId) {
        setImageProcessing(false);
      }
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
    const draftPendingImageUri = draft.pendingImageUri || '';
    const draftPendingImageBase64 = draft.pendingImageBase64 || '';
    const draftPendingImageDataUri = draft.pendingImageDataUri || '';
    const draftPendingImageFileName = draft.pendingImageFileName || '';
    const draftPendingImageMimeType =
      draft.pendingImageMimeType || 'image/jpeg';
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
    const selectedCategoryForSubmit = categories.find(
      category => category.id === cleanCategoryId,
    );
    const cleanCategoryName =
      selectedCategoryForSubmit?.name || cleanCategoryId;

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
    const itemId = isEdit ? String(draftSelectedItemId) : '';
    const editingItem = isEdit
      ? menuItems.find(item => item.id === itemId) || selectedItem
      : null;
    const hasPendingImage = Boolean(
      draftPendingImageBase64 ||
      draftPendingImageDataUri ||
      draftPendingImageUri,
    );
    const existingServerImageUrl = getMenuItemImageValue(
      editingItem || undefined,
    );
    const cleanDraftImageUrl = getMenuItemImageValue({imageUrl: draftImageUrl});

    setSaving(true);
    setError('');
    setListError('');

    try {
      const basePayload: MenuItemFormInput = {
        ...(isEdit ? {id: itemId, createdAt: editingItem?.createdAt} : {}),
        name: cleanName,
        price: priceValue,
        categoryId: cleanCategoryId,
        categoryName: cleanCategoryName,
        description: draftDescription.trim(),
        // Với món mới có ảnh pending, lưu món trước không kèm ảnh. Sau khi server
        // trả id thật của món, mới upload ảnh và PATCH lại imageUrl. Như vậy nếu
        // upload ảnh lỗi thì món/danh mục vẫn không bị mất.
        imageUrl: hasPendingImage
          ? isEdit
            ? existingServerImageUrl
            : ''
          : cleanDraftImageUrl,
        status: draftStatus,
        available: draftStatus === 'SELLING',
      };

      let savedItems = await onSaveItem(basePayload);
      let savedItem = findSavedMenuItemForPayload(
        savedItems,
        {
          id: basePayload.id,
          name: cleanName,
          price: priceValue,
          categoryId: cleanCategoryId,
          categoryName: cleanCategoryName,
        },
        categories,
      );
      const savedItemId = savedItem?.id || itemId;
      let imageWarning = '';

      if (hasPendingImage) {
        if (!savedItemId) {
          imageWarning =
            'Món đã lưu nhưng chưa lấy được mã món để gắn ảnh. Vào lại Quản lý món rồi bấm Sửa món để chọn ảnh lại.';
        } else {
          try {
            setImageUploading(true);
            let serverImageUrl = '';

            if (
              onUploadImage &&
              (draftPendingImageBase64 || draftPendingImageDataUri)
            ) {
              const uploadResult = await onUploadImage({
                uri: draftPendingImageUri,
                base64: draftPendingImageBase64,
                dataUri: draftPendingImageDataUri,
                itemId: savedItemId,
                dishId: savedItemId,
                mimeType: draftPendingImageMimeType,
                fileName: draftPendingImageFileName,
              });
              serverImageUrl = getMenuItemImageValue({
                imageUrl:
                  uploadResult?.imageUrl || uploadResult?.publicUrl || '',
              });
              if (Array.isArray(uploadResult?.items)) {
                savedItems = uploadResult.items;
                savedItem =
                  savedItems.find(item => item.id === savedItemId) ||
                  findSavedMenuItemForPayload(
                    savedItems,
                    {
                      id: savedItemId,
                      name: cleanName,
                      price: priceValue,
                      categoryId: cleanCategoryId,
                      categoryName: cleanCategoryName,
                    },
                    categories,
                  );
              }
            }

            if (!serverImageUrl && !onUploadImage) {
              serverImageUrl = await persistRestaurantMenuImage({
                uri: draftPendingImageUri,
                base64: draftPendingImageBase64,
                itemId: savedItemId,
                type: draftPendingImageMimeType,
                fileName: draftPendingImageFileName,
              });
            }

            if (serverImageUrl) {
              const imageAlreadyAttached = Boolean(
                getMenuItemImageValue(savedItem || undefined) === serverImageUrl ||
                  (Array.isArray(savedItems) &&
                    savedItems.some(
                      item =>
                        item.id === savedItemId &&
                        getMenuItemImageValue(item) === serverImageUrl,
                    )),
              );

              if (!imageAlreadyAttached) {
                const imagePayload: MenuItemFormInput = {
                  ...basePayload,
                  id: savedItemId,
                  createdAt: savedItem?.createdAt || editingItem?.createdAt,
                  imageUrl: serverImageUrl,
                };
                savedItems = await onSaveItem(imagePayload);
                savedItem = findSavedMenuItemForPayload(
                  savedItems,
                  {
                    id: savedItemId,
                    name: cleanName,
                    price: priceValue,
                    categoryId: cleanCategoryId,
                    categoryName: cleanCategoryName,
                  },
                  categories,
                );
              }
            } else {
              imageWarning =
                'Món đã lưu, nhưng ảnh chưa upload được. Ảnh có thể quá lớn hoặc máy chưa cấp dữ liệu ảnh; hãy sửa món và chọn lại ảnh nhỏ hơn.';
            }
          } catch (uploadError) {
            devWarn(
              '[AdminMenu] image upload failed after item save',
              uploadError,
            );
            imageWarning =
              'Món đã lưu, nhưng ảnh chưa upload được. Hãy vào Sửa món và chọn lại ảnh nhỏ hơn nếu cần.';
          }
        }
      }

      replaceFormSession(createEmptyFormSession(defaultCategoryId));
      if (imageWarning) {
        setListError(imageWarning);
      }
    } catch (saveError) {
      devWarn('[AdminMenu] save failed', saveError);
      const message =
        saveError instanceof Error && saveError.message.trim()
          ? saveError.message.trim()
          : 'Không thể lưu món. Vui lòng thử lại.';
      setError(message);
    } finally {
      setImageUploading(false);
      setSaving(false);
    }
  };

  const performDeleteItem = async (item: RestaurantMenuItem) => {
    if (deletingItemId) {
      return;
    }

    setDeletingItemId(item.id);
    setListError('');

    try {
      await onDeleteItem(item.id);
      if (selectedItemId === item.id) {
        replaceFormSession(createEmptyFormSession(defaultCategoryId));
      }
    } catch (deleteError) {
      devWarn('[AdminMenu] delete item failed', deleteError);
      setListError('Không thể xoá món. Vui lòng thử lại.');
    } finally {
      setDeletingItemId(null);
    }
  };

  const requestDeleteItem = (item: RestaurantMenuItem) => {
    Alert.alert(
      'Xoá món',
      `Bạn chắc chắn muốn xoá “${item.name}”? Đơn hàng cũ vẫn giữ tên và giá đã chốt, nhưng món này sẽ bị xoá khỏi menu hiện tại.`,
      [
        {text: 'Huỷ', style: 'cancel'},
        {
          text: 'Xoá món',
          style: 'destructive',
          onPress: () => void performDeleteItem(item),
        },
      ],
    );
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

  const openAdminSearchInput = async () => {
    setListError('');

    try {
      const nextValue = await showNativeTextInput({
        title: 'Tìm kiếm món',
        placeholder: 'Nhập tên món, mô tả, mã hoặc danh mục',
        initialValue: searchTerm,
        keyboardType: 'text',
        source: 'admin-menu-search',
      });

      if (typeof nextValue === 'string') {
        setSearchTerm(nextValue);
      }
    } catch (nativeError) {
      devWarn('[AdminMenu] native search input failed', nativeError);
    }
  };

  const renderAdminSearchInput = () => {
    if (Platform.OS === 'android') {
      return (
        <Pressable
          onPress={openAdminSearchInput}
          style={[styles.adminInput, styles.adminInputButton]}>
          <RNText
            style={
              searchTerm
                ? styles.adminInputValueText
                : styles.adminInputPlaceholderText
            }
            numberOfLines={1}>
            {searchTerm || 'Tìm tên món, mô tả, mã hoặc danh mục'}
          </RNText>
        </Pressable>
      );
    }

    return (
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        onFocus={() => pauseAdminFormInputImmersive('menu-search')}
        onBlur={() => resumeAdminFormInputImmersive('menu-search')}
        placeholder="Tìm tên món, mô tả, mã hoặc danh mục"
        placeholderTextColor="rgba(255,255,255,0.36)"
        style={styles.adminInput}
        returnKeyType="search"
      />
    );
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
      devWarn('[AdminCategory] native input failed', nativeError);
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
      devWarn(`[AdminMenu] native ${field} input failed`, nativeError);
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

      const savedCategory = result.categories.find(
        category =>
          category.id === categoryDraftId ||
          normaliseSearchTerm(category.name) === normaliseSearchTerm(cleanName),
      );
      const nextCategoryId =
        savedCategory?.id || result.categories[0]?.id || defaultCategoryId;
      if (nextCategoryId) {
        updateDraft({categoryId: nextCategoryId});
        setCategoryFilter(current =>
          current !== 'ALL' && categoryDraftId && current === categoryDraftId
            ? nextCategoryId
            : current,
        );
      }

      resetCategoryDraft();
    } catch (saveCategoryError) {
      devWarn('[AdminCategory] save failed', saveCategoryError);
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
      devWarn('[AdminCategory] delete failed', deleteCategoryError);
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

    const message =
      itemCount > 0
        ? `Danh mục “${category.name}” đang có ${itemCount} món. Xoá danh mục này và chuyển các món sang “${fallbackCategory.name}”?`
        : `Bạn chắc chắn muốn xoá danh mục “${category.name}”?`;

    Alert.alert('Xoá danh mục', message, [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: itemCount > 0 ? 'Xoá và chuyển món' : 'Xoá danh mục',
        style: 'destructive',
        onPress: () => void performDeleteCategory(category),
      },
    ]);
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
            Tên danh mục được lưu qua repository dùng chung cho Admin + Menu
            khách hàng.
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
                Dữ liệu lưu local qua restaurantAdminStore, sau này thay bằng hệ
                thống.
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
          {categories.length === 0 ? (
            <RNText style={styles.formError}>
              Chưa có danh mục. Bấm “+ Thêm danh mục” để tạo danh mục trước.
            </RNText>
          ) : null}
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
            {formPreviewImageUrl ? (
              <AdminMenuImage
                imageKey={`${selectedItemId || 'new'}-${imagePreviewRevision}`}
                imageValue={formPreviewImageUrl}
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
                {formPreviewImageUrl
                  ? 'Ảnh món đã chọn'
                  : 'Chọn ảnh trực tiếp từ máy'}
              </RNText>
              <RNText style={styles.imagePickerHint} numberOfLines={2}>
                Chọn ảnh xong bấm Lưu món, ảnh sẽ được tải lên server nếu có
                mạng.
              </RNText>
              <RNView style={styles.imagePickerButtonRow}>
                <Pressable
                  onPress={pickMenuImage}
                  style={styles.imagePickerButton}
                  disabled={
                    saving || imagePicking || imageProcessing || imageUploading
                  }>
                  <RNText style={styles.imagePickerButtonText}>
                    {imageUploading
                      ? 'Đang tải ảnh...'
                      : imageProcessing
                        ? 'Đang nhận ảnh...'
                        : imagePicking
                          ? 'Đang mở...'
                          : formPreviewImageUrl
                            ? 'Đổi ảnh'
                            : 'Chọn ảnh từ máy'}
                  </RNText>
                </Pressable>
                {formPreviewImageUrl ? (
                  <Pressable
                    onPress={() => {
                      imagePickRequestIdRef.current += 1;
                      updateDraft({
                        imageUrl: '',
                        pendingImageUri: '',
                        pendingImageBase64: '',
                        pendingImageDataUri: '',
                        pendingImageFileName: '',
                        pendingImageMimeType: '',
                      });
                    }}
                    style={styles.imageRemoveButton}
                    disabled={
                      saving ||
                      imagePicking ||
                      imageProcessing ||
                      imageUploading
                    }>
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
              disabled={saving || imageProcessing || categories.length === 0}>
              <RNText style={styles.saveButtonText}>
                {imageUploading
                  ? 'Đang tải ảnh...'
                  : imageProcessing
                    ? 'Đang nhận ảnh...'
                    : saving
                      ? 'Đang lưu...'
                      : 'Lưu'}
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
            {menuItems.length} món · {categories.length} danh mục · Dữ liệu đồng
            bộ theo tài khoản/quán hiện tại.
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

      <RNView style={styles.adminFilterPanel}>
        <RNView style={styles.adminStatusSummaryRow}>
          {STATUS_OPTIONS.map(option => (
            <RNView key={option.value} style={styles.adminStatusSummaryCard}>
              <RNText style={styles.adminStatusSummaryValue}>
                {statusCounts[option.value]}
              </RNText>
              <RNText style={styles.adminStatusSummaryLabel}>
                {option.label}
              </RNText>
            </RNView>
          ))}
        </RNView>

        <RNView style={styles.adminSearchRow}>
          <RNView style={styles.adminSearchBox}>
            <RNText style={styles.inputLabel}>Tìm kiếm món</RNText>
            {renderAdminSearchInput()}
          </RNView>
          {searchTerm ? (
            <Pressable
              onPress={() => setSearchTerm('')}
              style={styles.cancelButton}>
              <RNText style={styles.cancelButtonText}>Xoá tìm kiếm</RNText>
            </Pressable>
          ) : null}
        </RNView>

        <RNText style={styles.inputLabel}>Lọc danh mục</RNText>
        <RNView style={styles.categoryPickerWrap}>
          <Pressable
            onPress={() => setCategoryFilter('ALL')}
            style={[
              styles.categoryPickChip,
              categoryFilter === 'ALL' ? styles.categoryPickChipActive : null,
            ]}>
            <RNText
              style={[
                styles.categoryPickText,
                categoryFilter === 'ALL' ? styles.categoryPickTextActive : null,
              ]}>
              Tất cả danh mục
            </RNText>
          </Pressable>
          {categories.map(category => {
            const active = categoryFilter === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setCategoryFilter(category.id)}
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

        <RNText style={styles.inputLabel}>Lọc trạng thái</RNText>
        <RNView style={styles.categoryPickerWrap}>
          {STATUS_FILTER_OPTIONS.map(option => {
            const active = option.value === statusFilter;
            return (
              <Pressable
                key={option.value}
                onPress={() => setStatusFilter(option.value)}
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

        <RNText style={styles.inputLabel}>Sắp xếp</RNText>
        <RNView style={styles.categoryPickerWrap}>
          {SORT_OPTIONS.map(option => {
            const active = option.value === sortOption;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSortOption(option.value)}
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

        <RNView style={styles.adminFilterSummaryRow}>
          <RNText style={styles.adminFilterSummaryText}>
            Đang hiển thị {filteredMenuItems.length}/{menuItems.length} món
          </RNText>
          {isFilteringMenu ? (
            <Pressable
              onPress={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setSortOption('CREATED_DESC');
              }}
              style={styles.headerSecondaryButton}>
              <RNText style={styles.headerSecondaryButtonText}>Bỏ lọc</RNText>
            </Pressable>
          ) : null}
        </RNView>
      </RNView>

      {listError ? <RNText style={styles.formError}>{listError}</RNText> : null}

      {menuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🍽️</RNText>
          <RNText style={styles.emptyText}>Chưa có món nào</RNText>
          <RNText style={styles.emptySubText}>
            Bấm “Thêm món” để tạo món local đầu tiên.
          </RNText>
        </RNView>
      ) : filteredMenuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🔎</RNText>
          <RNText style={styles.emptyText}>Không có món phù hợp</RNText>
          <RNText style={styles.emptySubText}>
            Thử bỏ tìm kiếm, đổi danh mục hoặc đổi trạng thái lọc.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.grid}>
          {filteredMenuItems.map(item => {
            const itemImageUri = getMenuItemImageValue(item);
            const itemStatus = getInitialStatus(item);
            const deleting = deletingItemId === item.id;

            return (
              <RNView
                key={`${item.id}-${itemImageUri || 'no-image'}`}
                style={styles.menuCard}>
                {itemImageUri ? (
                  <AdminMenuImage
                    imageKey={item.id}
                    imageValue={itemImageUri}
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
                          itemStatus === 'OUT_OF_STOCK'
                            ? 'rgba(255,75,75,0.16)'
                            : itemStatus === 'SELLING'
                              ? 'rgba(9,168,107,0.18)'
                              : 'rgba(242,165,26,0.16)',
                        borderColor:
                          itemStatus === 'OUT_OF_STOCK'
                            ? 'rgba(255,110,110,0.32)'
                            : itemStatus === 'SELLING'
                              ? 'rgba(60,210,150,0.32)'
                              : 'rgba(255,190,70,0.30)',
                      },
                    ]}>
                    <RNText style={styles.statusPillText}>
                      {getMenuItemStatusLabel(item)}
                    </RNText>
                  </RNView>
                  <RNView style={styles.menuCardActionRow}>
                    <Pressable
                      onPress={() => openEdit(item)}
                      style={[
                        styles.secondaryButton,
                        styles.menuCardActionButton,
                      ]}
                      disabled={!!deletingItemId}>
                      <RNText style={styles.secondaryButtonText}>
                        Sửa món
                      </RNText>
                    </Pressable>
                    <Pressable
                      onPress={() => requestDeleteItem(item)}
                      style={[styles.dangerButton, styles.menuCardActionButton]}
                      disabled={deleting}>
                      <RNText style={styles.dangerButtonText}>
                        {deleting ? 'Đang xoá...' : 'Xoá'}
                      </RNText>
                    </Pressable>
                  </RNView>
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
