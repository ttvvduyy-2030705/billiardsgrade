import type {ImageSourcePropType} from 'react-native';
import RNFS from 'react-native-fs';

import images from 'assets';
import {getMenuItemImageValue} from './restaurantMenuStorage';

const RESTAURANT_MENU_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/restaurant-menu-images`;

const normalizeLocalFileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

const getImageExtension = (asset: any) => {
  const mimeType = String(asset?.type || '').toLowerCase();
  const fileName = String(asset?.fileName || asset?.uri || '').toLowerCase();

  if (mimeType.includes('png') || fileName.endsWith('.png')) {
    return 'png';
  }
  if (mimeType.includes('webp') || fileName.endsWith('.webp')) {
    return 'webp';
  }
  if (mimeType.includes('gif') || fileName.endsWith('.gif')) {
    return 'gif';
  }

  return 'jpg';
};

const createSafeImageName = (itemIdHint?: string) => {
  const safeHint = String(itemIdHint || 'new')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);

  return `${safeHint}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const persistRestaurantMenuImage = async (
  asset: any,
  itemIdHint?: string,
): Promise<string | undefined> => {
  if (!asset) {
    return undefined;
  }

  const pickedUri = String(asset.uri || '').trim();
  const extension = getImageExtension(asset);
  const destinationPath = `${RESTAURANT_MENU_IMAGE_DIR}/${createSafeImageName(
    itemIdHint,
  )}.${extension}`;

  const dirExists = await RNFS.exists(RESTAURANT_MENU_IMAGE_DIR);
  if (!dirExists) {
    await RNFS.mkdir(RESTAURANT_MENU_IMAGE_DIR);
  }

  // Prefer base64 because Android photo-picker/content:// grants are temporary.
  // Writing a private app file gives both Admin and Customer Menu a stable URI.
  if (typeof asset.base64 === 'string' && asset.base64.length > 0) {
    await RNFS.writeFile(destinationPath, asset.base64, 'base64');
    return normalizeLocalFileUri(destinationPath);
  }

  if (!pickedUri) {
    return undefined;
  }

  if (/^https?:\/\//i.test(pickedUri) || /^data:image\//i.test(pickedUri)) {
    return pickedUri;
  }

  const sourcePath = pickedUri.startsWith('file://')
    ? pickedUri.replace('file://', '')
    : pickedUri;

  await RNFS.copyFile(sourcePath, destinationPath);
  return normalizeLocalFileUri(destinationPath);
};

export const getRestaurantMenuImageSource = (
  item?: any,
): ImageSourcePropType => {
  const rawAsset =
    item?.imageUrl ??
    item?.imageUri ??
    item?.image ??
    item?.thumbnail ??
    item?.photo ??
    item?.localUri;

  if (typeof rawAsset === 'number') {
    return rawAsset;
  }

  const imageValue = getMenuItemImageValue(item);

  if (!imageValue) {
    return images.logoSmall;
  }

  if (
    /^https?:\/\//i.test(imageValue) ||
    /^file:\/\//i.test(imageValue) ||
    /^content:\/\//i.test(imageValue) ||
    /^data:image\//i.test(imageValue)
  ) {
    return {uri: imageValue};
  }

  if (imageValue.startsWith('/')) {
    return {uri: normalizeLocalFileUri(imageValue)};
  }

  return images.logoSmall;
};
