import React, {memo, useCallback} from 'react';
import {Image as RNImage, TextStyle, useWindowDimensions} from 'react-native';
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
import {getGameplayScreenProfile, clamp} from '../../screenProfile';


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
  const {width, height, fontScale} = useWindowDimensions();
  const profile = getGameplayScreenProfile(width, height, fontScale);
  const {isLandscape, isLargeDisplay, isHandheldLandscape} = profile;
  const useCondensed =
    isLandscape && !isLargeDisplay && (profile.scale <= 0.9 || height <= 940);
  const useUltraCondensed =
    isLandscape && !isLargeDisplay && (profile.scale <= 0.74 || height <= 820);
  const scale = isHandheldLandscape
    ? clamp(profile.consoleScale * 0.68, 0.42, 0.56)
    : useUltraCondensed
    ? 0.7
    : useCondensed
    ? 0.82
    : 1;
  const isLibre = props.gameSettings?.category === 'libre';
  const nameFontSize = Math.round(22 * scale);
  const turnFontSize = Math.round(56 * scale);
  const turnLineHeight = Math.round(70 * scale);
  const currentPointFontSize = Math.round(32 * scale);
  const currentPointLineHeight = Math.round(38 * scale);
  const countdownFontSize = Math.round(20 * scale);
  const flagBadgeSize = {
    width: Math.round(34 * scale),
    height: Math.round(24 * scale),
    marginRight: Math.round(8 * scale),
    borderRadius: Math.max(3, Math.round(4 * scale)),
  };
  const turnIndicatorStyle = {
    width: Math.round(36 * scale),
    height: Math.round(36 * scale),
    marginLeft: Math.round(10 * scale),
    marginRight: Math.round(-5 * scale),
  };
  const emptyTurnIndicatorStyle = {
    width: Math.round(36 * scale),
    height: Math.round(36 * scale),
    marginLeft: Math.round(10 * scale),
  };
  const totalPointFontBase = isHandheldLandscape ? 20 : useUltraCondensed ? 24 : useCondensed ? 30 : 40;
  const totalPointLineBase = isHandheldLandscape ? 24 : useUltraCondensed ? 28 : useCondensed ? 34 : 46;
  const getTotalPointFont = useCallback(
    (point: number) => {
      const value = Number(point || 0);

      if (!isLibre) {
        return {
          fontSize: totalPointFontBase,
          lineHeight: totalPointLineBase,
        };
      }

      if (value >= 1000) {
        return {
          fontSize: useUltraCondensed ? 14 : useCondensed ? 18 : 22,
          lineHeight: useUltraCondensed ? 16 : useCondensed ? 21 : 26,
        };
      }

      if (value >= 100) {
        return {
          fontSize: useUltraCondensed ? 18 : useCondensed ? 24 : 30,
          lineHeight: useUltraCondensed ? 22 : useCondensed ? 28 : 34,
        };
      }

      return {
        fontSize: totalPointFontBase,
        lineHeight: totalPointLineBase,
      };
    },
    [isLibre, totalPointFontBase, totalPointLineBase, useCondensed, useUltraCondensed],
  );

  const renderPlayer = useCallback(
    (player: Player, index: number, totalPointStyle: TextStyle) => {
      const totalPointValue = Number(player.totalPoint || 0);
      const totalPointFont = getTotalPointFont(totalPointValue);

      const playerFlag = getPlayerFlagText(player as any);
      const playerFlagImage = getPlayerFlagImageUri(player as any);

      return (
        <View
          style={{backgroundColor: player.color}}
          direction={'row'}
          alignItems={'center'}>
          <View
            direction={'row'}
            alignItems={'center'}
            paddingLeft={isHandheldLandscape ? '4' : useCondensed ? '6' : '10'}>
            {playerFlagImage || playerFlag ? (
              <View style={[styles.flagBadge, flagBadgeSize]}>
                {playerFlagImage ? (
                  <RNImage
                    source={{uri: playerFlagImage}}
                    resizeMode="cover"
                    fadeDuration={0}
                    style={{width: '100%', height: '100%', backgroundColor: '#FFFFFF'}}
                  />
                ) : (
                  <Text style={[styles.flagText, {fontSize: Math.round(16 * scale), lineHeight: Math.round(18 * scale)}]}>{playerFlag}</Text>
                )}
              </View>
            ) : null}

            <View flex={'1'} style={playerFlag ? styles.nameWithFlag : undefined}>
              <Text fontSize={nameFontSize} fontWeight={'900'} numberOfLines={1}>
                {player.name.toUpperCase()}
              </Text>
            </View>

            {props.currentPlayerIndex === index ? (
              <Image source={images.game.turn} style={[styles.turnImage, turnIndicatorStyle]} />
            ) : (
              <View style={[styles.empty, emptyTurnIndicatorStyle]} />
            )}

            <View direction={'row'} alignItems={'end'}>
              <View style={styles.totalPointWrapper} paddingHorizontal={isHandheldLandscape ? '4' : useCondensed ? '6' : '10'}>
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

              <View style={styles.currentTotalPoint} paddingHorizontal={isHandheldLandscape ? '4' : useCondensed ? '6' : '10'}>
                <Text
                  style={styles.currentPointText}
                  fontSize={currentPointFontSize}
                  lineHeight={currentPointLineHeight}
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
    <View style={styles.container} direction={'row'} marginTop={isHandheldLandscape ? '2' : useCondensed ? '4' : '10'}>
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
              paddingHorizontal={isHandheldLandscape ? '8' : useCondensed ? '12' : '20'}>
              <Text color={colors.white} fontSize={turnFontSize} lineHeight={turnLineHeight}>
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
            paddingHorizontal={isHandheldLandscape ? '8' : useCondensed ? '12' : '20'}
            marginLeft={isHandheldLandscape ? '0' : useCondensed ? '2' : '5'}>
            <Text fontSize={countdownFontSize} color={colors.white}>
              {props.countdownTime}
            </Text>
          </View>

          <View flex={'1'} direction={'row'}>
            <Countdown
              originalCountdownTime={props.gameSettings.mode?.countdownTime}
              currentCountdownTime={props.countdownTime}
              countdownWidth={Math.min(dims.screenWidth * (isHandheldLandscape ? 0.11 : useUltraCondensed ? 0.2 : useCondensed ? 0.23 : 0.28), isHandheldLandscape ? 118 : useUltraCondensed ? 240 : useCondensed ? 280 : 360)}
              heightItem={isHandheldLandscape ? 8 : useUltraCondensed ? 16 : useCondensed ? 20 : 27}
              marginHorizontal={isHandheldLandscape ? 0.4 : useUltraCondensed ? 1 : 2}
              direction="right-to-left"
              colorMode="threshold"
              yellowThreshold={10}
              redThreshold={5}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(CaromInfo);