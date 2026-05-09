import type { ImageSourcePropType } from "react-native";
import RNFS from "react-native-fs";

import images from "assets";
import { devWarn } from "utils/devLogger";

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

export type RestaurantMenuImageResolution = {
  value: string;
  source: ImageSourcePropType;
  hasImage: boolean;
  isFallback: boolean;
  cacheKey: string;
};

export const RESTAURANT_MENU_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/restaurant-menu-images`;
export const RESTAURANT_MENU_IMAGE_FALLBACK_SOURCE = images.logoSmall;

const SUPPORTED_IMAGE_URI_RE =
  /^(https?:|file:|content:|data:image\/|asset:|ph:)/i;
const REMOTE_IMAGE_URI_RE = /^https?:\/\//i;
const INLINE_IMAGE_URI_RE = /^data:image\//i;

const normalizeLocalFileUri = (path: string) =>
  path.startsWith("file://") ? path : `file://${path}`;

const getImageExtension = (
  value?: RestaurantMenuImagePersistInput | string | null,
) => {
  const source = typeof value === "string" ? { uri: value } : value || {};
  const mimeType = String(source.type || "").toLowerCase();
  const fileName = String(source.fileName || source.uri || "")
    .toLowerCase()
    .split("?")[0]
    .split("#")[0];
  const match = fileName.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = match?.[1]?.toLowerCase();

  if (mimeType.includes("png") || ext === "png") {
    return "png";
  }
  if (mimeType.includes("webp") || ext === "webp") {
    return "webp";
  }
  if (mimeType.includes("gif") || ext === "gif") {
    return "gif";
  }
  if (mimeType.includes("heic") || ext === "heic") {
    return "heic";
  }

  return "jpg";
};

const createSafeImageName = (itemIdHint?: string | null) => {
  const safeHint = String(itemIdHint || "menu_item")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 72);

  return `${safeHint}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const normaliseMenuImageUri = (value?: string | null) => {
  const cleanValue = (value || "").trim();

  if (!cleanValue) {
    return "";
  }

  if (SUPPORTED_IMAGE_URI_RE.test(cleanValue)) {
    return cleanValue;
  }

  if (cleanValue.startsWith("/")) {
    return normalizeLocalFileUri(cleanValue);
  }

  return cleanValue;
};

export const normalizeMenuImageUri = normaliseMenuImageUri;

const normaliseCandidateImageValue = (
  value?: string | number | null,
): string | number => {
  if (typeof value === "number") {
    return value;
  }

  return normaliseMenuImageUri(value || "");
};

const getRawImageValue = (input?: RestaurantMenuImageLike): string | number => {
  if (typeof input === "number") {
    return input;
  }

  if (typeof input === "string") {
    return input;
  }

  const candidates = [
    input?.imageUrl,
    input?.imageUri,
    input?.image,
    input?.thumbnail,
    input?.photo,
    input?.localUri,
    input?.uri,
  ];

  for (const candidate of candidates) {
    const normalised = normaliseCandidateImageValue(candidate);

    if (typeof normalised === "number" || normalised) {
      return normalised;
    }
  }

  return "";
};

export const getMenuItemImageValue = (input?: RestaurantMenuImageLike) => {
  const rawAsset = getRawImageValue(input);

  if (typeof rawAsset === "number") {
    return "";
  }

  // imageUrl is the single source of truth for new records. Legacy fields such
  // as imageUri are still read as fallback so old local data keeps rendering
  // until it is saved again through the new model.
  return normaliseMenuImageUri(rawAsset);
};

export const getRestaurantMenuImageSource = (
  input?: RestaurantMenuImageLike,
): ImageSourcePropType => {
  const rawAsset = getRawImageValue(input);

  if (typeof rawAsset === "number") {
    return rawAsset;
  }

  const imageValue = normaliseMenuImageUri(rawAsset);

  if (!imageValue) {
    return RESTAURANT_MENU_IMAGE_FALLBACK_SOURCE;
  }

  if (SUPPORTED_IMAGE_URI_RE.test(imageValue)) {
    return { uri: imageValue };
  }

  if (imageValue.startsWith("/")) {
    return { uri: normalizeLocalFileUri(imageValue) };
  }

  return RESTAURANT_MENU_IMAGE_FALLBACK_SOURCE;
};

export const resolveRestaurantMenuImage = (
  input?: RestaurantMenuImageLike,
  options: { forceFallback?: boolean; cacheKey?: string } = {},
): RestaurantMenuImageResolution => {
  const value = getMenuItemImageValue(input);
  const hasImage = !!value;
  const source = options.forceFallback
    ? RESTAURANT_MENU_IMAGE_FALLBACK_SOURCE
    : getRestaurantMenuImageSource(input);
  const cacheKey = [
    options.cacheKey || "restaurant-menu-image",
    options.forceFallback ? "fallback" : value || "empty",
  ].join(":");

  return {
    value,
    source,
    hasImage,
    isFallback: options.forceFallback || !hasImage,
    cacheKey,
  };
};

export const createRestaurantMenuImagePreviewUri = (asset: {
  uri?: string | null;
  base64?: string | null;
  type?: string | null;
}) => {
  const base64 = String(asset.base64 || "").trim();

  if (base64) {
    const mimeType = String(asset.type || "image/jpeg").trim() || "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  }

  return normaliseMenuImageUri(asset.uri || "");
};

export const isManagedRestaurantMenuImageUri = (value?: string | null) => {
  const imageValue = normaliseMenuImageUri(value);
  return (
    imageValue.startsWith("file://") &&
    imageValue.includes("/restaurant-menu-images/")
  );
};

export const shouldPersistRestaurantMenuImage = (value?: string | null) => {
  const imageValue = normaliseMenuImageUri(value);

  if (!imageValue) {
    return false;
  }

  if (
    REMOTE_IMAGE_URI_RE.test(imageValue) ||
    INLINE_IMAGE_URI_RE.test(imageValue) ||
    isManagedRestaurantMenuImageUri(imageValue)
  ) {
    return false;
  }

  return (
    /^(file:|content:|ph:|asset:)/i.test(imageValue) ||
    imageValue.startsWith("/")
  );
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
  const pickedUri = normaliseMenuImageUri(input?.uri || "");
  const base64 = typeof input?.base64 === "string" ? input.base64.trim() : "";

  if (!pickedUri && !base64) {
    return "";
  }

  if (
    REMOTE_IMAGE_URI_RE.test(pickedUri) ||
    INLINE_IMAGE_URI_RE.test(pickedUri)
  ) {
    return pickedUri;
  }

  if (isManagedRestaurantMenuImageUri(pickedUri)) {
    return pickedUri;
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
      await RNFS.writeFile(destinationPath, base64, "base64");
      return normalizeLocalFileUri(destinationPath);
    }

    const sourcePath = pickedUri.startsWith("file://")
      ? pickedUri.replace("file://", "")
      : pickedUri;

    await RNFS.copyFile(sourcePath, destinationPath);
    return normalizeLocalFileUri(destinationPath);
  } catch (error) {
    devWarn(
      "[RestaurantMenuImageService] persist failed, keeping original uri",
      error,
    );
    // Some Android pickers return content:// URIs that RNFS.copyFile cannot read
    // without base64. Keep the picker URI instead of blocking the admin form.
    return pickedUri;
  }
};

export const removeRestaurantMenuImage = async (value?: string | null) => {
  const imageValue = normaliseMenuImageUri(value);

  if (!isManagedRestaurantMenuImageUri(imageValue)) {
    return false;
  }

  const filePath = imageValue.replace("file://", "");

  try {
    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
      return true;
    }
  } catch (error) {
    devWarn("[RestaurantMenuImageService] remove failed", error);
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
    (usedValue) => normaliseMenuImageUri(usedValue) === imageValue,
  );

  if (stillUsed) {
    return false;
  }

  return removeRestaurantMenuImage(imageValue);
};

export const RestaurantMenuImageService = {
  fallbackSource: RESTAURANT_MENU_IMAGE_FALLBACK_SOURCE,
  normaliseUri: normaliseMenuImageUri,
  normalizeUri: normalizeMenuImageUri,
  getValue: getMenuItemImageValue,
  getSource: getRestaurantMenuImageSource,
  resolve: resolveRestaurantMenuImage,
  createPreviewUri: createRestaurantMenuImagePreviewUri,
  persist: persistRestaurantMenuImage,
  remove: removeRestaurantMenuImage,
  cleanupIfUnused: cleanupRestaurantMenuImageIfUnused,
  isManagedUri: isManagedRestaurantMenuImageUri,
  shouldPersist: shouldPersistRestaurantMenuImage,
};
