import type {ImageSourcePropType} from 'react-native';
import RNFS from 'react-native-fs';

import images from 'assets';

export type RestaurantMenuImageLike =
  | string
  | number
  | null
  | undefined
  | {
      uri?: string | null;
      base64?: string | null;
      type?: string | null;
      fileName?: string | null;
      itemId?: string | null;
      imageUrl?: string | null;
      imageUri?: string | null;
      image?: string | number | null;
      thumbnail?: string | number | null;
      photo?: string | number | null;
      localUri?: string | null;
    };

export type RestaurantMenuImagePersistInput = {
  uri?: string | null;
  base64?: string | null;
  itemId?: string | null;
  type?: string | null;
  fileName?: string | null;
};

export const RESTAURANT_MENU_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/restaurant-menu-images`;

const SUPPORTED_IMAGE_URI_RE = /^(https?:|file:|content:|data:image\/|asset:|ph:)/i;

const normalizeLocalFileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

const getImageExtension = (value?: RestaurantMenuImagePersistInput | string | null) => {
  const source = typeof value === 'string' ? {uri: value} : value || {};
  const mimeType = String(source.type || '').toLowerCase();
  const fileName = String(source.fileName || source.uri || '').toLowerCase().split('?')[0].split('#')[0];
  const match = fileName.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = match?.[1]?.toLowerCase();

  if (mimeType.includes('png') || ext === 'png') {
    return 'png';
  }
  if (mimeType.includes('webp') || ext === 'webp') {
    return 'webp';
  }
  if (mimeType.includes('gif') || ext === 'gif') {
    return 'gif';
  }
  if (mimeType.includes('heic') || ext === 'heic') {
    return 'heic';
  }

  return 'jpg';
};

const createSafeImageName = (itemIdHint?: string | null) => {
  const safeHint = String(itemIdHint || 'menu_item')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 72);

  return `${safeHint}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const normaliseMenuImageUri = (value?: string | null) => {
  const cleanValue = (value || '').trim();

  if (!cleanValue) {
    return '';
  }

  if (SUPPORTED_IMAGE_URI_RE.test(cleanValue)) {
    return cleanValue;
  }

  if (cleanValue.startsWith('/')) {
    return normalizeLocalFileUri(cleanValue);
  }

  return cleanValue;
};

export const normalizeMenuImageUri = normaliseMenuImageUri;

const getRawImageValue = (input?: RestaurantMenuImageLike): string | number => {
  if (typeof input === 'number') {
    return input;
  }

  if (typeof input === 'string') {
    return input;
  }

  const rawAsset =
    input?.imageUrl ??
    input?.imageUri ??
    input?.image ??
    input?.thumbnail ??
    input?.photo ??
    input?.localUri ??
    input?.uri ??
    '';

  return rawAsset || '';
};

export const getMenuItemImageValue = (input?: RestaurantMenuImageLike) => {
  const rawAsset = getRawImageValue(input);

  if (typeof rawAsset === 'number') {
    return '';
  }

  // imageUrl is the single source of truth. imageUri and other legacy fields
  // are only read as fallback so older local records keep rendering until saved.
  return normaliseMenuImageUri(rawAsset);
};

export const getRestaurantMenuImageSource = (
  input?: RestaurantMenuImageLike,
): ImageSourcePropType => {
  const rawAsset = getRawImageValue(input);

  if (typeof rawAsset === 'number') {
    return rawAsset;
  }

  const imageValue = normaliseMenuImageUri(rawAsset);

  if (!imageValue) {
    return images.logoSmall;
  }

  if (SUPPORTED_IMAGE_URI_RE.test(imageValue)) {
    return {uri: imageValue};
  }

  if (imageValue.startsWith('/')) {
    return {uri: normalizeLocalFileUri(imageValue)};
  }

  return images.logoSmall;
};

export const isManagedRestaurantMenuImageUri = (value?: string | null) => {
  const imageValue = normaliseMenuImageUri(value);
  return imageValue.startsWith('file://') && imageValue.includes('/restaurant-menu-images/');
};

const ensureImageDirectory = async () => {
  if (!(await RNFS.exists(RESTAURANT_MENU_IMAGE_DIR))) {
    await RNFS.mkdir(RESTAURANT_MENU_IMAGE_DIR);
  }
};

export const persistRestaurantMenuImage = async (
  input: RestaurantMenuImagePersistInput | null | undefined,
  itemIdHint?: string,
): Promise<string> => {
  const pickedUri = String(input?.uri || '').trim();
  const base64 = typeof input?.base64 === 'string' ? input.base64 : '';

  if (!pickedUri && !base64) {
    return '';
  }

  if (/^https?:\/\//i.test(pickedUri) || /^data:image\//i.test(pickedUri)) {
    return normaliseMenuImageUri(pickedUri);
  }

  if (isManagedRestaurantMenuImageUri(pickedUri)) {
    return normaliseMenuImageUri(pickedUri);
  }

  const extension = getImageExtension(input || pickedUri);
  const destinationPath = `${RESTAURANT_MENU_IMAGE_DIR}/${createSafeImageName(
    input?.itemId || itemIdHint,
  )}.${extension}`;

  try {
    await ensureImageDirectory();

    // Prefer base64 because Android photo-picker/content:// grants are often
    // temporary. A private app file gives both Admin and Customer Menu a stable URI.
    if (base64) {
      await RNFS.writeFile(destinationPath, base64, 'base64');
      return normalizeLocalFileUri(destinationPath);
    }

    const sourcePath = pickedUri.startsWith('file://')
      ? pickedUri.replace('file://', '')
      : pickedUri;

    await RNFS.copyFile(sourcePath, destinationPath);
    return normalizeLocalFileUri(destinationPath);
  } catch (error) {
    console.warn('[RestaurantMenuImageService] persist failed, keeping original uri', error);
    // Some Android pickers return content:// URIs that RNFS.copyFile cannot read
    // without base64. Keep the picker URI instead of blocking the admin form.
    return normaliseMenuImageUri(pickedUri);
  }
};

export const removeRestaurantMenuImage = async (value?: string | null) => {
  const imageValue = normaliseMenuImageUri(value);

  if (!isManagedRestaurantMenuImageUri(imageValue)) {
    return false;
  }

  const filePath = imageValue.replace('file://', '');

  try {
    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
      return true;
    }
  } catch (error) {
    console.warn('[RestaurantMenuImageService] remove failed', error);
  }

  return false;
};

export const cleanupRestaurantMenuImageIfUnused = async (
  value?: string | null,
  stillUsedValues: Array<string | undefined | null> = [],
) => {
  const imageValue = normaliseMenuImageUri(value);

  if (!isManagedRestaurantMenuImageUri(imageValue)) {
    return false;
  }

  const stillUsed = stillUsedValues.some(
    usedValue => normaliseMenuImageUri(usedValue) === imageValue,
  );

  if (stillUsed) {
    return false;
  }

  return removeRestaurantMenuImage(imageValue);
};
