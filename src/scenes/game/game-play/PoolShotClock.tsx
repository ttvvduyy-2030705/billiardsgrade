import React, {memo, useMemo} from 'react';
import {useWindowDimensions} from 'react-native';

import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import {getGameplayScreenProfile} from './screenProfile';

interface Props {
  originalCountdownTime?: number;
  currentCountdownTime: number;
  onPress?: () => void;
}

const SEGMENTS = 34;

const PoolShotClock = ({
  originalCountdownTime = 40,
  currentCountdownTime,
  onPress,
}: Props) => {
  const {width, height, fontScale} = useWindowDimensions();
  const profile = getGameplayScreenProfile(width, height, fontScale);

  const baseScale = profile.isHandheldLandscape
    ? profile.shotClockScale
    : profile.isMediumDisplay
    ? 0.84
    : 1;

  const segmentHeight = Math.round(22 * baseScale);
  const segmentWrapMinHeight = Math.round(26 * baseScale);
  const secondsFontSize = Math.round(18 * baseScale);

  const safeOriginal = Math.max(1, originalCountdownTime || 40);
  const safeCurrent = Math.max(0, currentCountdownTime);
  const progressMax = Math.max(safeOriginal, safeCurrent);

  const activeColor =
    safeCurrent <= 5 ? '#FF2D22' : safeCurrent <= 10 ? '#FFBE2F' : '#20E247';

  const litCount = useMemo(() => {
    return Math.max(0, Math.ceil((safeCurrent / progressMax) * SEGMENTS));
  }, [safeCurrent, progressMax]);

  return (
    <Button onPress={onPress} style={{width: '100%', paddingTop: 0, paddingBottom: 0}}>
      <View
        style={{width: '100%'}}
        direction={'row'}
        alignItems={'center'}
        justify={'between'}>
        <View
          flex={'1'}
          direction={'row'}
          justify={'between'}
          alignItems={'center'}
          style={{minHeight: segmentWrapMinHeight}}>
          {Array.from({length: SEGMENTS}, (_, index) => {
            const isLit = index < litCount;
            return (
              <View
                key={`clock-segment-${index}`}
                style={{
                  flex: 1,
                  height: segmentHeight,
                  marginHorizontal: profile.isHandheldLandscape ? 0.8 : 1.5,
                  borderRadius: profile.isHandheldLandscape ? 2 : 4,
                  backgroundColor: isLit ? activeColor : '#2A2B31',
                  opacity: isLit ? 1 : 0.98,
                }}
              />
            );
          })}
        </View>

        <Text
          color={activeColor}
          fontSize={secondsFontSize}
          fontWeight={'bold'}
          marginLeft={profile.isHandheldLandscape ? '2' : '4'}>
          {`${safeCurrent}s`}
        </Text>
      </View>
    </Button>
  );
};

export default memo(PoolShotClock);
