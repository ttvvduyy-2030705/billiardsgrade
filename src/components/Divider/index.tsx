import React, {memo, useMemo} from 'react';
import {ViewStyle} from 'react-native';
import View from 'components/View';

import styles from './styles';

interface Props {
  size: 'large' | 'medium' | 'small';
  style?: ViewStyle;
}

const Divider = (props: Props) => {
  const {size = 'small', style} = props;

  const _style = useMemo(() => {
    if (!style) {
      return styles[size];
    }

    return [styles[size], style];
  }, [style, size]);

  return <View style={_style} />;
};

export default memo(Divider);
