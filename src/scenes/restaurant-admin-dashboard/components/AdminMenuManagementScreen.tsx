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
import {formatVnd, useAppTranslation} from 'utils/appI18n';
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
  labelKey: string;
}> = [
  {value: 'SELLING', labelKey: 'restaurantAdmin.menu.statusSelling'},
  {value: 'HIDDEN', labelKey: 'restaurantAdmin.menu.statusHidden'},
  {value: 'OUT_OF_STOCK', labelKey: 'restaurantAdmin.menu.statusOutOfStock'},
];

const STATUS_FILTER_OPTIONS: Array<{value: MenuStatusFilter; labelKey: string}> = [
  {value: 'ALL', labelKey: 'restaurantAdmin.menu.allStatuses'},
  ...STATUS_OPTIONS,
];

const SORT_OPTIONS: Array<{value: MenuSortOption; labelKey: string}> = [
  {value: 'CREATED_DESC', labelKey: 'restaurantAdmin.menu.sortNewest'},
  {value: 'NAME_ASC', labelKey: 'restaurantAdmin.menu.sortName'},
  {value: 'PRICE_ASC', labelKey: 'restaurantAdmin.menu.sortPriceAsc'},
  {value: 'PRICE_DESC', labelKey: 'restaurantAdmin.menu.sortPriceDesc'},
  {value: 'STATUS_ASC', labelKey: 'restaurantAdmin.menu.sortStatus'},
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

const formatCurrency = formatVnd;

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
  const t = useAppTranslation();
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

  const formTitle = viewMode === 'edit' ? t('restaurantAdmin.menu.editItem') : t('restaurantAdmin.menu.addItem');
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
      setListError(t('restaurantAdmin.menu.needCategoryBeforeItem'));
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
        setError(t('restaurantAdmin.menu.chooseImageError'));
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
        setError(t('restaurantAdmin.menu.invalidImageError'));
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
      setError(t('restaurantAdmin.menu.openGalleryError'));
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
      setError(t('restaurantAdmin.menu.enterItemName'));
      return;
    }

    if (!cleanPriceText || Number.isNaN(priceValue) || priceValue < 0) {
      setError(t('restaurantAdmin.menu.invalidPrice'));
      return;
    }

    if (!cleanCategoryId) {
      setError(t('restaurantAdmin.menu.chooseCategory'));
      return;
    }

    const requestedEdit = draftViewMode === 'edit' && !!draftSelectedItemId;
    const requestedItemId = requestedEdit ? String(draftSelectedItemId) : '';
    const editingItem = requestedEdit
      ? menuItems.find(item => item.id === requestedItemId) ||
        (selectedItem?.id === requestedItemId ? selectedItem : null)
      : null;
    // Do not PATCH a phantom/stale item id. Android can restore an old form
    // session after image picking; if that id is not in the current menu
    // snapshot, treating the submit as an edit makes the API return
    // “Không tìm thấy món”. In that case create a fresh item instead.
    const isEdit = Boolean(requestedEdit && editingItem?.id);
    const itemId = isEdit ? requestedItemId : '';
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
      let imageWarning = '';
      let uploadedImageUrl = '';

      // Ảnh phải được xử lý TRƯỚC khi tạo món mới. Bản cũ tạo món trước,
      // upload ảnh sau, rồi PATCH lại món để gắn ảnh; trên Render bước PATCH
      // đôi khi trả 404 dù POST món và POST ảnh đã thành công. Luồng mới là:
      // chọn ảnh -> upload ảnh lấy URL -> POST/PATCH món đúng 1 lần kèm imageUrl.
      if (hasPendingImage) {
        try {
          setImageUploading(true);
          if (onUploadImage && (draftPendingImageBase64 || draftPendingImageDataUri)) {
            const uploadResult = await onUploadImage({
              uri: draftPendingImageUri,
              base64: draftPendingImageBase64,
              dataUri: draftPendingImageDataUri,
              // Khi sửa món thì đã có id thật, upload có thể tự gắn vào món.
              // Khi thêm món mới thì chưa có id, chỉ upload lấy public URL trước.
              itemId: isEdit ? itemId : undefined,
              dishId: isEdit ? itemId : undefined,
              mimeType: draftPendingImageMimeType,
              fileName: draftPendingImageFileName,
            });
            uploadedImageUrl = getMenuItemImageValue({
              imageUrl: uploadResult?.imageUrl || uploadResult?.publicUrl || '',
            });
          } else if (!onUploadImage) {
            uploadedImageUrl = await persistRestaurantMenuImage({
              uri: draftPendingImageUri,
              base64: draftPendingImageBase64,
              itemId: itemId || 'menu_draft_image',
              type: draftPendingImageMimeType,
              fileName: draftPendingImageFileName,
            });
          }

          if (!uploadedImageUrl) {
            imageWarning =
              t('restaurantAdmin.menu.imageUploadWarning');
          }
        } catch (uploadError) {
          devWarn('[AdminMenu] image upload before item save failed', uploadError);
          imageWarning =
            t('restaurantAdmin.menu.imageUploadWarning');
        } finally {
          setImageUploading(false);
        }
      }

      const finalImageUrl = hasPendingImage
        ? uploadedImageUrl || (isEdit ? existingServerImageUrl : '')
        : cleanDraftImageUrl;

      const basePayload: MenuItemFormInput = {
        ...(isEdit ? {id: itemId, createdAt: editingItem?.createdAt} : {}),
        name: cleanName,
        price: priceValue,
        categoryId: cleanCategoryId,
        categoryName: cleanCategoryName,
        description: draftDescription.trim(),
        imageUrl: finalImageUrl,
        status: draftStatus,
        available: draftStatus === 'SELLING',
      };

      await onSaveItem(basePayload);

      replaceFormSession(createEmptyFormSession(defaultCategoryId));
      if (imageWarning) {
        setListError(imageWarning);
      }
    } catch (saveError) {
      devWarn('[AdminMenu] save failed', saveError);
      const message =
        saveError instanceof Error && saveError.message.trim()
          ? saveError.message.trim()
          : t('restaurantAdmin.menu.saveItemError');
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
      setListError(t('restaurantAdmin.menu.deleteItemError'));
    } finally {
      setDeletingItemId(null);
    }
  };

  const requestDeleteItem = (item: RestaurantMenuItem) => {
    Alert.alert(
      t('restaurantAdmin.menu.deleteItemTitle'),
      t('restaurantAdmin.menu.deleteItemMessage', {name: item.name}),
      [
        {text: t('restaurantAdmin.menu.cancel'), style: 'cancel'},
        {
          text: t('restaurantAdmin.menu.confirmDeleteItem'),
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
        title: t('restaurantAdmin.menu.searchTitle'),
        placeholder: t('restaurantAdmin.menu.searchPlaceholder'),
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
            {searchTerm || t('restaurantAdmin.menu.searchShortPlaceholder')}
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
        placeholder={t('restaurantAdmin.menu.searchShortPlaceholder')}
        placeholderTextColor="rgba(255,255,255,0.36)"
        style={styles.adminInput}
        returnKeyType="search"
      />
    );
  };

  const showNativeCategoryNameInput = async () => {
    return showNativeTextInput({
      title: categoryDraftId ? t('restaurantAdmin.menu.editCategoryName') : t('restaurantAdmin.menu.addCategory'),
      placeholder: t('restaurantAdmin.menu.categoryPlaceholder'),
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
        title: viewMode === 'edit' ? t('restaurantAdmin.menu.editItemNameTitle') : t('restaurantAdmin.menu.itemNameTitle'),
        placeholder: t('restaurantAdmin.menu.itemNamePlaceholder'),
        keyboardType: 'text' as const,
        initialValue: adminMenuFormSession.name,
      },
      price: {
        title: t('restaurantAdmin.menu.priceTitle'),
        placeholder: '25000',
        keyboardType: 'number' as const,
        initialValue: adminMenuFormSession.price,
      },
      description: {
        title: t('restaurantAdmin.menu.descriptionTitle'),
        placeholder: t('restaurantAdmin.menu.descriptionPlaceholder'),
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
      setCategoryError(t('restaurantAdmin.menu.enterCategoryName'));
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
      setCategoryError(t('restaurantAdmin.menu.saveCategoryError'));
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
      setCategoryError(t('restaurantAdmin.menu.needOneCategory'));
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
      setCategoryError(t('restaurantAdmin.menu.deleteCategoryError'));
    } finally {
      setCategorySaving(false);
    }
  };

  const requestDeleteCategory = (category: MenuCategory) => {
    const itemCount = categoryCounts[category.id] || 0;
    const fallbackCategory = categories.find(item => item.id !== category.id);

    if (!fallbackCategory) {
      setCategoryError(t('restaurantAdmin.menu.needOneCategory'));
      return;
    }

    const message =
      itemCount > 0
        ? t('restaurantAdmin.menu.deleteCategoryWithItems', {name: category.name, count: itemCount, fallback: fallbackCategory.name})
        : t('restaurantAdmin.menu.deleteCategoryMessage', {name: category.name});

    Alert.alert(t('restaurantAdmin.menu.deleteCategoryTitle'), message, [
      {text: t('restaurantAdmin.menu.cancel'), style: 'cancel'},
      {
        text: itemCount > 0 ? t('restaurantAdmin.menu.deleteAndMoveItems') : t('restaurantAdmin.menu.confirmDeleteCategory'),
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
            {categoryDraftName || t('restaurantAdmin.menu.categoryNameInput')}
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
        placeholder={t('restaurantAdmin.menu.categoryPlaceholderShort')}
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
            <RNText style={styles.sectionTitle}>{t('restaurantAdmin.menu.categoryManagerTitle')}</RNText>
            <RNText style={styles.sectionHint}>
              {t('restaurantAdmin.menu.categoryManagerHint')}
            </RNText>
          </RNView>
          <Pressable
            onPress={closeCategoryManager}
            style={styles.cancelButton}
            disabled={categorySaving}>
            <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.back')}</RNText>
          </Pressable>
        </RNView>

        <RNView style={styles.categoryManagerCard}>
          <RNText style={styles.editModalTitle}>
            {categoryDraftId ? t('restaurantAdmin.menu.editCategoryName') : t('restaurantAdmin.menu.addCategory')}
          </RNText>
          <RNText style={styles.editModalHint}>
            {t('restaurantAdmin.menu.categoryStoredHint')}
          </RNText>

          <RNView style={styles.categoryFormRow}>
            <RNView style={styles.categoryInputColumn}>
              <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.categoryName')}</RNText>
              {renderCategoryNameInput()}
            </RNView>
            <Pressable
              onPress={submitCategory}
              style={styles.saveButton}
              disabled={categorySaving}>
              <RNText style={styles.saveButtonText}>
                {categorySaving
                  ? t('restaurantAdmin.menu.saving')
                  : categoryDraftId
                    ? t('restaurantAdmin.menu.saveCategory')
                    : t('restaurantAdmin.menu.add')}
              </RNText>
            </Pressable>
            {categoryDraftId ? (
              <Pressable
                onPress={resetCategoryDraft}
                style={styles.cancelButton}
                disabled={categorySaving}>
                <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.cancelEdit')}</RNText>
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
                      {t('restaurantAdmin.menu.itemsCountWithId', {count: itemCount, id: category.id})}
                    </RNText>
                  </RNView>
                  <RNView style={styles.categoryActions}>
                    <Pressable
                      onPress={() => editCategory(category)}
                      style={styles.cancelButton}
                      disabled={categorySaving}>
                      <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.edit')}</RNText>
                    </Pressable>
                    <Pressable
                      onPress={() => requestDeleteCategory(category)}
                      style={styles.dangerButton}
                      disabled={categorySaving}>
                      <RNText style={styles.dangerButtonText}>{t('restaurantAdmin.menu.delete')}</RNText>
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
              {t('restaurantAdmin.menu.itemFormHint')}
            </RNText>
          </RNView>
          <Pressable
            onPress={cancelForm}
            style={styles.cancelButton}
            disabled={saving}>
            <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.back')}</RNText>
          </Pressable>
        </RNView>

        <RNView style={styles.editModalCard}>
          <RNView style={styles.editModalHeader}>
            <RNView>
              <RNText style={styles.editModalTitle}>{formTitle}</RNText>
              <RNText style={styles.editModalHint}>
                {t('restaurantAdmin.menu.localDataHint')}
              </RNText>
            </RNView>
          </RNView>

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.itemName')}</RNText>
          {renderMenuFormTextField({
            field: 'name',
            placeholder: t('restaurantAdmin.menu.itemNamePlaceholder'),
          })}

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.price')}</RNText>
          {renderMenuFormTextField({
            field: 'price',
            placeholder: '25000',
            keyboardType: 'number-pad',
          })}

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.category')}</RNText>
          {categories.length === 0 ? (
            <RNText style={styles.formError}>
              {t('restaurantAdmin.menu.noCategoryHint')}
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

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.description')}</RNText>
          {renderMenuFormTextField({
            field: 'description',
            placeholder: t('restaurantAdmin.menu.descriptionPlaceholder'),
            multiline: true,
          })}

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.itemImage')}</RNText>
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
                  {t('restaurantAdmin.menu.noImage')}
                </RNText>
              </RNView>
            )}

            <RNView style={styles.imagePickerInfo}>
              <RNText style={styles.imagePickerTitle}>
                {formPreviewImageUrl
                  ? t('restaurantAdmin.menu.imageSelected')
                  : t('restaurantAdmin.menu.chooseImageFromDevice')}
              </RNText>
              <RNText style={styles.imagePickerHint} numberOfLines={2}>
                {t('restaurantAdmin.menu.imageUploadHint')}
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
                      ? t('restaurantAdmin.menu.uploadingImage')
                      : imageProcessing
                        ? t('restaurantAdmin.menu.receivingImage')
                        : imagePicking
                          ? t('restaurantAdmin.menu.opening')
                          : formPreviewImageUrl
                            ? t('restaurantAdmin.menu.changeImage')
                            : t('restaurantAdmin.menu.chooseImage')}
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
                      {t('restaurantAdmin.menu.removeImage')}
                    </RNText>
                  </Pressable>
                ) : null}
              </RNView>
            </RNView>
          </RNView>

          <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.status')}</RNText>
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
                    {t(option.labelKey)}
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
              <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.cancel')}</RNText>
            </Pressable>
            <Pressable
              onPress={submitForm}
              style={styles.saveButton}
              disabled={saving || imageProcessing || categories.length === 0}>
              <RNText style={styles.saveButtonText}>
                {imageUploading
                  ? t('restaurantAdmin.menu.uploadingImage')
                  : imageProcessing
                    ? t('restaurantAdmin.menu.receivingImage')
                    : saving
                      ? t('restaurantAdmin.menu.saving')
                      : t('restaurantAdmin.menu.save')}
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
          <RNText style={styles.sectionTitle}>{t('restaurantAdmin.menu.menuManagerTitle')}</RNText>
          <RNText style={styles.sectionHint}>
            {t('restaurantAdmin.menu.menuManagerSubtitle', {itemCount: menuItems.length, categoryCount: categories.length})}
          </RNText>
        </RNView>
        <RNView style={styles.sectionHeaderActions}>
          <Pressable
            onPress={openCategoryManager}
            style={styles.headerSecondaryButton}>
            <RNText style={styles.headerSecondaryButtonText}>
              {t('restaurantAdmin.menu.addCategoryButton')}
            </RNText>
          </Pressable>
          <Pressable onPress={openCreate} style={styles.primaryButton}>
            <RNText style={styles.primaryButtonText}>{t('restaurantAdmin.menu.addItemButton')}</RNText>
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
                {t(option.labelKey)}
              </RNText>
            </RNView>
          ))}
        </RNView>

        <RNView style={styles.adminSearchRow}>
          <RNView style={styles.adminSearchBox}>
            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.searchLabel')}</RNText>
            {renderAdminSearchInput()}
          </RNView>
          {searchTerm ? (
            <Pressable
              onPress={() => setSearchTerm('')}
              style={styles.cancelButton}>
              <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.clearSearch')}</RNText>
            </Pressable>
          ) : null}
        </RNView>

        <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.filterCategory')}</RNText>
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
              {t('restaurantAdmin.menu.allCategories')}
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

        <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.filterStatus')}</RNText>
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
                  {t(option.labelKey)}
                </RNText>
              </Pressable>
            );
          })}
        </RNView>

        <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.sort')}</RNText>
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
                  {t(option.labelKey)}
                </RNText>
              </Pressable>
            );
          })}
        </RNView>

        <RNView style={styles.adminFilterSummaryRow}>
          <RNText style={styles.adminFilterSummaryText}>
            {t('restaurantAdmin.menu.showingItems', {visible: filteredMenuItems.length, total: menuItems.length})}
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
              <RNText style={styles.headerSecondaryButtonText}>{t('restaurantAdmin.menu.clearFilter')}</RNText>
            </Pressable>
          ) : null}
        </RNView>
      </RNView>

      {listError ? <RNText style={styles.formError}>{listError}</RNText> : null}

      {menuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🍽️</RNText>
          <RNText style={styles.emptyText}>{t('restaurantAdmin.menu.noItems')}</RNText>
          <RNText style={styles.emptySubText}>
            {t('restaurantAdmin.menu.noItemsHint')}
          </RNText>
        </RNView>
      ) : filteredMenuItems.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🔎</RNText>
          <RNText style={styles.emptyText}>{t('restaurantAdmin.menu.noMatchingItems')}</RNText>
          <RNText style={styles.emptySubText}>
            {t('restaurantAdmin.menu.noMatchingItemsHint')}
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
                      {t(`restaurantAdmin.menu.status${itemStatus === 'SELLING' ? 'Selling' : itemStatus === 'OUT_OF_STOCK' ? 'OutOfStock' : 'Hidden'}`)}
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
                        {t('restaurantAdmin.menu.editItem')}
                      </RNText>
                    </Pressable>
                    <Pressable
                      onPress={() => requestDeleteItem(item)}
                      style={[styles.dangerButton, styles.menuCardActionButton]}
                      disabled={deleting}>
                      <RNText style={styles.dangerButtonText}>
                        {deleting ? t('restaurantAdmin.menu.deleteInProgress') : t('restaurantAdmin.menu.delete')}
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
