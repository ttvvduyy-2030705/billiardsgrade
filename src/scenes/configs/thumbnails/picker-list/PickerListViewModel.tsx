import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Image as RNImage} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

export interface Props {
  saveKey: string;
  fixedImageSource?: number;
  locked?: boolean;
}

const PickerListViewModel = (props: Props) => {
  const [images, setImages] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const fixedImageUri =
    typeof props.fixedImageSource === 'number'
      ? RNImage.resolveAssetSource(props.fixedImageSource)?.uri
      : undefined;

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(props.saveKey, async (error, result) => {
      if (!mounted) {
        return;
      }

      if (error) {
        console.log('[Thumbnails] Failed to get thumbnails', error);
        if (props.locked && fixedImageUri) {
          setImages([fixedImageUri]);
          await AsyncStorage.setItem(props.saveKey, JSON.stringify([fixedImageUri]));
        }
        setIsReady(true);
        return;
      }

      try {
        if (props.locked && fixedImageUri) {
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
        setImages(props.locked && fixedImageUri ? [fixedImageUri] : []);
      } finally {
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fixedImageUri, props.locked, props.saveKey]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const nextImages = props.locked && fixedImageUri ? [fixedImageUri] : images;
    AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
  }, [props.saveKey, images, isReady, props.locked, fixedImageUri]);

  const onPickImage = useCallback(async () => {
    if (props.locked) {
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      maxWidth: 720,
      maxHeight: 1280,
      quality: 0.9,
    });

    const asset = result.assets?.[0];
    if (!asset) {
      return;
    }

    const mimeType =
      typeof asset.type === 'string' && asset.type.length > 0
        ? asset.type
        : 'image/jpeg';

    const normalizedImage =
      asset.base64 && asset.base64.length > 0
        ? `data:${mimeType};base64,${asset.base64}`
        : asset.uri;

    if (!normalizedImage) {
      console.log('[Thumbnails] Pick image failed: no base64 and no uri');
      return;
    }

    const nextImages = [normalizedImage];
    setImages(nextImages);
    await AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
  }, [fixedImageUri, props.locked, props.saveKey]);

  const onDeleteImage = useCallback(
    async (deleteIndex: number) => {
      if (props.locked) {
        return;
      }

      const nextImages = images.filter((_image, index) => index !== deleteIndex);
      setImages(nextImages);
      await AsyncStorage.setItem(props.saveKey, JSON.stringify(nextImages));
    },
    [images, props.locked, props.saveKey],
  );

  return useMemo(() => {
    return {
      images,
      onPickImage,
      onDeleteImage,
      locked: !!props.locked,
      fixedImageSource: props.fixedImageSource,
    };
  }, [images, onPickImage, onDeleteImage, props.fixedImageSource, props.locked]);
};

export default PickerListViewModel;
