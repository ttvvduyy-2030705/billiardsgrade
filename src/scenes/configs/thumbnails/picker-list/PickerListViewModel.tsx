import AsyncStorage from '@react-native-community/async-storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {launchImageLibrary} from 'react-native-image-picker';

export interface Props {
  saveKey: string;
}

const PickerListViewModel = (props: Props) => {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(props.saveKey, (error, result) => {
      if (error) {
        console.log('Failed to get thumbnails', error);
        return;
      }

      const _images = JSON.parse(result || '[]');

      setImages(_images);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(props.saveKey, JSON.stringify(images));
  }, [props, images]);

  const onPickImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 720,
      maxHeight: 1280,
    });

    if (!result.assets || result.assets.length === 0 || !result.assets[0].uri) {
      return;
    }

    const imageUri = result.assets[0].uri;

    setImages(prev => [...prev, imageUri]);
  }, []);

  const onDeleteImage = useCallback(
    (deleteIndex: number) => {
      const newImages = images.filter((_image, index) => index !== deleteIndex);

      setImages(newImages);
    },
    [images],
  );

  return useMemo(() => {
    return {images, onPickImage, onDeleteImage};
  }, [images, onPickImage, onDeleteImage]);
};

export default PickerListViewModel;
