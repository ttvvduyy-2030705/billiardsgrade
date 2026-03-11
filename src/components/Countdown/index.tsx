import React, {memo, useEffect, useMemo, useState} from 'react';
import View from 'components/View';
import styles from './styles';

interface Props {
  originalCountdownTime: number;
  currentCountdownTime: number;
  countdownWidth: number;
  heightItem?: number;
  marginHorizontal?: number;
}

const COLOR_GREEN = '#20D95C';
const COLOR_YELLOW = '#F2B705';
const COLOR_RED = '#E53935';
const COLOR_EMPTY = '#101010';

const Countdown = (props: Props) => {
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    setItemWidth(
      Number((props.countdownWidth / props.originalCountdownTime).toFixed(2)) -
        (props.marginHorizontal ? props.marginHorizontal * 2 : 10),
    );
  }, [
    props.countdownWidth,
    props.marginHorizontal,
    props.originalCountdownTime,
  ]);

  const ITEM_HEIGHT = useMemo(
    () => (props.heightItem ? props.heightItem : '100%'),
    [props.heightItem],
  );

  const MARGIN_HORIZONTAL = useMemo(
    () => (props.marginHorizontal ? props.marginHorizontal : 5),
    [props.marginHorizontal],
  );

  const activeColor = useMemo(() => {
    if (props.currentCountdownTime <= 5) return COLOR_RED;
    if (props.currentCountdownTime <= 10) return COLOR_YELLOW;
    return COLOR_GREEN;
  }, [props.currentCountdownTime]);

  const COUNTDOWN = useMemo(() => {
    return Array.from({length: props.originalCountdownTime}, (_, index) => {
      const isPassed = props.currentCountdownTime <= index;

      return (
        <View
          key={`countdown-item-${index}`}
          style={[
            styles.countdownItem,
            {
              height: ITEM_HEIGHT,
              marginHorizontal: MARGIN_HORIZONTAL,
              width: itemWidth,
              backgroundColor: isPassed ? COLOR_EMPTY : activeColor,
              borderRadius: 3,
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
    activeColor,
  ]);

  return (
    <View flex={'1'} direction={'row'} justify={'end'}>
      {COUNTDOWN}
    </View>
  );
};

export default memo(Countdown);