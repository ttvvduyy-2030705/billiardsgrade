import React, {memo, useMemo, ReactElement} from 'react';
import {View, ViewStyle} from 'react-native';
import colors from 'configuration/colors';

import Loading from '../Loading';

import styles from './styles';

interface ContainerProps {
  children: ReactElement | ReactElement[];
  isLoading?: boolean;
  loadingBackgroundColor?: string;
  style?: ViewStyle | ViewStyle[];
  safeAreaDisabled?: boolean;
}

const Container = (props: ContainerProps) => {
  const {
    children,
    isLoading,
    loadingBackgroundColor = colors.black,
    style,
    safeAreaDisabled,
  } = props;

  const loadingStyle = useMemo(() => {
    return [styles.loadingWrapper, {backgroundColor: loadingBackgroundColor}];
  }, [loadingBackgroundColor]);

  const _style = useMemo(() => {
    if (safeAreaDisabled) {
      return [styles.container, style, {paddingTop: 0}];
    }

    return [styles.container, style];
  }, [style, safeAreaDisabled]);

  return (
    <View style={_style}>
      {children}
      {isLoading && (
        <View style={loadingStyle}>
          <Loading isLoading={true} />
        </View>
      )}
    </View>
  );
};

export default memo(Container);
