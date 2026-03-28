import React, {memo, useCallback, useMemo} from 'react';
import Text from 'components/Text';
import View from 'components/View';
import {PoolBallType} from 'types/ball';
import {ViewStyle} from 'react-native';
import styles from './styles';
import Button from 'components/Button';

interface Props {
  data: PoolBallType;
  onPress?: (ball: PoolBallType) => void;
  size?: 'large' | 'small';
}

const Ball = (props: Props) => {
  const isSmall = props.size === 'small';

  const _onPress = useCallback(() => {
    if (!props.onPress) {
      return;
    }

    props.onPress(props.data);
  }, [props]);

  const style: ViewStyle = useMemo(() => {
    return {
      backgroundColor: props.data.color,
    };
  }, [props]);

  return (
    <Button
      style={[isSmall ? styles.smallContainer : styles.container, style]}
      onPress={_onPress}>
      {props.data.cut ? (
        <View style={isSmall ? styles.smallCutWrapper : styles.cutWrapper} />
      ) : (
        <View />
      )}
      <View
        style={isSmall ? styles.smallBall : styles.ball}
        alignItems={'center'}
        justify={'center'}>
        <Text fontWeight={'bold'} fontSize={isSmall ? 12 : 24}>
          {props.data.number}
        </Text>
      </View>
      {props.data.cut ? (
        <View style={isSmall ? styles.smallCutWrapper : styles.cutWrapper} />
      ) : (
        <View />
      )}
    </Button>
  );
};

export default memo(Ball);
