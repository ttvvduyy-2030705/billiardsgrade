import React, {memo, useCallback} from 'react';
import {Image as RNImage, TextStyle} from 'react-native';
import View from 'components/View';
import Text from 'components/Text';
import Image from 'components/Image';
import Countdown from 'components/Countdown';
import colors from 'configuration/colors';
import {Player} from 'types/player';

import {dims} from 'configuration';
import images from 'assets';
import CaromInfoViewModel, {Props} from './CaromInfoViewModel';
import styles from './styles';
import {getCountryFlagImageUri} from '../../../settings/player/countries';


const isRemoteUri = (value?: string) => /^https?:\/\//i.test(String(value || '').trim());

const getPlayerFlagImageUri = (player?: {countryCode?: string; flag?: string}) => {
  const fromCode = getCountryFlagImageUri(player?.countryCode, 80);
  if (fromCode) {
    return fromCode;
  }

  const rawFlag = String(player?.flag || '').trim();
  return isRemoteUri(rawFlag) ? rawFlag : '';
};

const getPlayerFlagText = (player?: {flag?: string}) => {
  const rawFlag = String(player?.flag || '').trim();
  return isRemoteUri(rawFlag) ? '' : rawFlag;
};

const CaromInfo = (props: Props) => {
  const viewModel = CaromInfoViewModel(props);
  const isLibre = props.gameSettings?.category === 'libre';

  const getTotalPointFont = useCallback(
    (point: number) => {
      const value = Number(point || 0);

      if (!isLibre) {
        return {
          fontSize: 40,
          lineHeight: 46,
        };
      }

      if (value >= 1000) {
        return {
          fontSize: 22,
          lineHeight: 26,
        };
      }

      if (value >= 100) {
        return {
          fontSize: 30,
          lineHeight: 34,
        };
      }

      return {
        fontSize: 40,
        lineHeight: 46,
      };
    },
    [isLibre],
  );

  const renderPlayer = useCallback(
    (player: Player, index: number, totalPointStyle: TextStyle) => {
      const totalPointValue = Number(player.totalPoint || 0);
      const totalPointFont = getTotalPointFont(totalPointValue);

      const playerFlag = getPlayerFlagText(player as any);
      const playerFlagImage = getPlayerFlagImageUri(player as any);

      return (
        <View
  style={{
    backgroundColor: player.color,
    borderTopLeftRadius: index === 0 ? 10 : 0,
    borderTopRightRadius: index === 0 ? 10 : 0,
    borderBottomLeftRadius: index === 1 ? 10 : 0,
    borderBottomRightRadius: index === 1 ? 10 : 0,
    overflow: 'hidden',
  }}
  direction={'row'}
  alignItems={'center'}>
          <View direction={'row'} alignItems={'center'} paddingLeft={'10'}>
            {playerFlagImage || playerFlag ? (
              <View style={styles.flagBadge}>
                {playerFlagImage ? (
                  <RNImage
                    source={{uri: playerFlagImage}}
                    resizeMode="cover"
                    fadeDuration={0}
                    style={{width: '100%', height: '100%', backgroundColor: '#FFFFFF'}}
                  />
                ) : (
                  <Text style={styles.flagText}>{playerFlag}</Text>
                )}
              </View>
            ) : null}

            <View flex={'1'} style={playerFlag ? styles.nameWithFlag : undefined}>
              <Text fontSize={22} fontWeight={'900'} numberOfLines={1}>
                {player.name.toUpperCase()}
              </Text>
            </View>

            {props.currentPlayerIndex === index ? (
              <Image source={images.game.turn} style={styles.turnImage} />
            ) : (
              <View style={styles.empty} />
            )}

            <View direction={'row'} alignItems={'end'}>
              <View style={styles.totalPointWrapper} paddingHorizontal={'10'}>
                <Text
                  style={totalPointStyle}
                  fontSize={totalPointFont.fontSize}
                  lineHeight={totalPointFont.lineHeight}
                  fontWeight={'bold'}
                  color={colors.white}
                  numberOfLines={1}>
                  {totalPointValue}
                </Text>
              </View>

              <View style={styles.currentTotalPoint} paddingHorizontal={'10'}>
                <Text
                  style={styles.currentPointText}
                  fontSize={32}
                  lineHeight={38}
                  fontWeight={'bold'}>
                  {player.proMode?.currentPoint || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [props.currentPlayerIndex, getTotalPointFont],
  );

  if (!props.gameSettings.mode?.countdownTime) {
    return <View />;
  }

  return (
    <View style={styles.container} direction={'row'} marginTop={'10'}>
      <View flex={'1'}>
        <View
          collapsable={false}
          style={styles.countdownContainer}
          direction={'row'}>
          <View>
            <View
              flex={'1'}
              justify={'center'}
              style={styles.totalTurnWrapper}
              paddingHorizontal={'20'}>
              <Text color={colors.white} fontSize={56} lineHeight={70}>
                {Math.max(1, Number(props.totalTurns || 1))}
              </Text>
            </View>
          </View>

          <View flex={'1'}>
            {renderPlayer(viewModel.player0, 0, styles.totalPointText0)}
            {renderPlayer(viewModel.player1, 1, styles.totalPointText1)}
          </View>
        </View>

        <View
          collapsable={false}
          style={styles.countdownContainer}
          direction={'row'}
          alignItems={'center'}>
          <View
            style={styles.countdownWrapper}
            paddingHorizontal={'20'}
            marginLeft={'5'}>
            <Text fontSize={20} color={colors.white}>
              {props.countdownTime}
            </Text>
          </View>

          <View
  flex={'1'}
  direction={'row'}
  alignItems={'center'}
  justify={'center'}>
  <View
    style={{width: '100%'}}
    paddingLeft={'10'}
    paddingRight={'10'}
    alignItems={'center'}>
    <Countdown
      originalCountdownTime={props.gameSettings.mode?.countdownTime}
      currentCountdownTime={props.countdownTime}
      countdownWidth={dims.screenWidth * 0.225}
      heightItem={27}
      marginHorizontal={2}
      direction="right-to-left"
      colorMode="threshold"
      yellowThreshold={10}
      redThreshold={5}
    />
  </View>
</View>
        </View>
      </View>
    </View>
  );
};

export default memo(CaromInfo);