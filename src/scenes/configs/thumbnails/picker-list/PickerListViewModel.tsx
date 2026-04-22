import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Image as RNImage} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import {useAplusPro} from 'features/subscription';

export interface Props {
  saveKey: string;
  fixedImageSource?: number;
  locked?: boolean;
  premiumLocked?: boolean;
}

const THUMBNAIL_STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/thumbnail-overlays`;

const getImageExtension = (mimeType?: string | null) => {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized.includes('png')) {
    return 'png';
  }
  if (normalized.includes('webp')) {
    return 'webp';
  }
  return 'jpg';
};

const normalizeLocalFileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

const persistPickedImage = async (saveKey: string, asset: any) => {
  const mimeType =
    typeof asset.type === 'string' && asset.type.length > 0
      ? asset.type
      : 'image/jpeg';
  const extension = getImageExtension(mimeType);
  const safeKey = saveKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const destinationPath = `${THUMBNAIL_STORAGE_DIR}/${safeKey}-${Date.now()}.${extension}`;

  const dirExists = await RNFS.exists(THUMBNAIL_STORAGE_DIR);
  if (!dirExists) {
    await RNFS.mkdir(THUMBNAIL_STORAGE_DIR);
  }

  if (asset.base64 && asset.base64.length > 0) {
    await RNFS.writeFile(destinationPath, asset.base64, 'base64');
    return normalizeLocalFileUri(destinationPath);
  }

  if (asset.uri) {
    const sourcePath = asset.uri.startsWith('file://')
      ? asset.uri.replace('file://', '')
      : asset.uri;
    await RNFS.copyFile(sourcePath, destinationPath);
    return normalizeLocalFileUri(destinationPath);
  }

  return undefined;
};

const removePersistedImage = async (imageUri?: string) => {
  if (!imageUri || !imageUri.startsWith('file://')) {
    return;
  }

  const imagePath = imageUri.replace('file://', '');
  if (!imagePath.includes('/thumbnail-overlays/')) {
    return;
  }

  try {
    const exists = await RNFS.exists(imagePath);
    if (exists) {
      await RNFS.unlink(imagePath);
    }
  } catch (error) {
    console.log('[Thumbnails] Failed to remove persisted thumbnail', error);
  }
};

const PickerListViewModel = (props: Props) => {
  const {isAplusProActive, showPaywall} = useAplusPro();
  const [images, setImages] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const fixedImageUri =
    typeof props.fixedImageSource === 'number'
      ? RNImage.resolveAssetSource(props.fixedImageSource)?.uri
      : undefined;

  const permanentLocked = !!props.locked;
  const premiumBlocked = !!props.premiumLocked && !isAplusProActive;
  const locked = permanentLocked || premiumBlocked;

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(props.saveKey, async (error, result) => {
      if (!mounted) {
        return;
      }

      if (error) {
        console.log('[Thumbnails] Failed to get thumbnails', error);
        if (permanentLocked && fixedImageUri) {
          setImages([fixedImageUri]);
          await AsyncStorage.setItem(props.saveKey, JSON.stringify([fixedImageUri]));
        }
        setIsReady(true);
        return;
      }

      try {
        if (permanentLocked && fixedImageUri) {
          const lockedImages = [fixedImageUri];
          setImages(lockedImages);
          await AsyncStorage.setItem(props.saveKey, JSON.stringify(lockedImages));
        } else {
          const loadedImages = JSON.parse(result || '[]');
          const normalized = Array.isArray(loadedImages)
            ? loadedImages.filter(Boolean).slice(0, 1)
            : [];
          setImages(normalized);
        }
      } catch (e) {
        console.log('[Thumbnails] Failed to parse thumbnails', e);
        setImages(permanentLocked && fixedImageUri ? [fixedImageUri] : []);
      } finally {
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fixedImageUri, permanentLocked, props.saveKey]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const nextImages = permanentLocked && fixedImageUri ? [fixedImageUri] : images;
    AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
  }, [props.saveKey, images, isReady, permanentLocked, fixedImageUri]);

  const showLogoPaywall = useCallback(() => {
    if (premiumBlocked) {
      showPaywall('change_logo');
    }
  }, [premiumBlocked, showPaywall]);

  const onPickImage = useCallback(async () => {
    if (premiumBlocked) {
      showLogoPaywall();
      return;
    }

    if (permanentLocked) {
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      maxWidth: 960,
      maxHeight: 960,
      quality: 0.9,
    });

    const asset = result.assets?.[0];
    if (!asset) {
      return;
    }

    try {
      const normalizedImage = await persistPickedImage(props.saveKey, asset);

      if (!normalizedImage) {
        console.log('[Thumbnails] Pick image failed: no base64 and no uri');
        return;
      }

      await Promise.all(images.map(removePersistedImage));

      const nextImages = [normalizedImage];
      setImages(nextImages);
      await AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
    } catch (error) {
      console.log('[Thumbnails] Pick image failed:', error);
    }
  }, [images, permanentLocked, premiumBlocked, props.saveKey, showLogoPaywall]);

  const onDeleteImage = useCallback(
    async (deleteIndex: number) => {
      if (premiumBlocked) {
        showLogoPaywall();
        return;
      }

      if (permanentLocked) {
        return;
      }

      await removePersistedImage(images[deleteIndex]);
      const nextImages = images.filter((_image, index) => index !== deleteIndex);
      setImages(nextImages);
      await AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
    },
    [images, permanentLocked, premiumBlocked, props.saveKey, showLogoPaywall],
  );

  return useMemo(() => {
    return {
      images,
      onPickImage,
      onDeleteImage,
      onLockedPress: showLogoPaywall,
      locked,
      premiumBlocked,
      fixedImageSource: props.fixedImageSource,
    };
  }, [
    images,
    onPickImage,
    onDeleteImage,
    showLogoPaywall,
    locked,
    premiumBlocked,
    props.fixedImageSource,
  ]);
};

export default PickerListViewModel;
