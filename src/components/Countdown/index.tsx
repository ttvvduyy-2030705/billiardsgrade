import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import View from 'components/View';
import colors from 'configuration/colors';

import styles from './styles';

interface Props {
  originalCountdownTime: number;
  currentCountdownTime: number;
  countdownWidth: number;
  heightItem?: number;
  marginHorizontal?: number;
}

const Countdown = (props: Props) => {
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    setItemWidth(
      Number((props.countdownWidth / props.originalCountdownTime!).toFixed(2)) -
        (props.marginHorizontal ? props.marginHorizontal * 2 : 10),
    );
  }, [
    props.countdownWidth,
    props.marginHorizontal,
    props.originalCountdownTime,
  ]);

  const getCountdownColor = useCallback(
    (index: number) => {
      if (!props.originalCountdownTime) {
        return;
      }

      const _time = props.originalCountdownTime;
      const section = _time / 4;

      switch (true) {
        case index > section * 3:
          return colors.green;
        case index > section * 2:
          return colors.primary;
        case index > section * 1:
          return colors.yellow;
        case index >= 0:
          return colors.red;
        default:
          return colors.primary;
      }
    },
    [props.originalCountdownTime],
  );

  const ITEM_HEIGHT = useMemo(
    () => (props.heightItem ? props.heightItem : '100%'),
    [props.heightItem],
  );

  const MARGIN_HORIZONTAL = useMemo(
    () => (props.marginHorizontal ? props.marginHorizontal : 5),
    [props.marginHorizontal],
  );

  const COUNTDOWN = useMemo(() => {
    return Array.from({length: props.originalCountdownTime}, (_, index) => {
      if (props.currentCountdownTime <= index) {
        return (
          <View
            key={`countdown-item-hide-${index}`}
            style={[styles.countdownItem, {width: itemWidth}]}
          />
        );
      }

      return (
        <View
          key={`countdown-item-${index}`}
          style={[
            styles.countdownItem,
            {
              height: ITEM_HEIGHT,
              marginHorizontal: MARGIN_HORIZONTAL,
              width: itemWidth,
              backgroundColor: getCountdownColor(index),
            },
          ]}
        />
      );
    }).reverse();
  }, [
    props.originalCountdownTime,
    props.currentCountdownTime,
    ITEM_HEIGHT,
    MARGIN_HORIZONTAL,
    itemWidth,
    getCountdownColor,
  ]);

  return (
    <View flex={'1'} direction={'row'} justify={'end'}>
      {COUNTDOWN}
    </View>
  );
};

export default memo(Countdown);
