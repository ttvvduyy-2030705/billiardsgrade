import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  ImageResizeMode,
} from 'react-native';

import images from 'assets';

import styles from './styles';

interface Props {
  style?: ImageStyle | ImageStyle[];
  source: ImageSourcePropType;
  resizeMode?: ImageResizeMode;
  blurRadius?: number;
}

const CustomImage = (props: Props) => {
  const {source, resizeMode, style, blurRadius} = props;

  const [internalSource, setInternalSource] = useState<
    ImageSourcePropType | number
  >(images.default);

  useEffect(() => {
    if (source) {
      setInternalSource(source);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onError = useCallback((e: any) => {
    console.log('Image error', e);
    setInternalSource(images.default);
  }, []);

  const internalStyle = useMemo(() => {
    if (style) {
      return style;
    }

    return styles.defaultImage;
  }, [style]);

  return (
    <Image
      source={internalSource}
      style={internalStyle}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
      onError={onError}
    />
  );
};

export default memo(CustomImage);
