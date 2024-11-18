import React, {memo, useCallback} from 'react';
import {TextStyle} from 'react-native';
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

const CaromInfo = (props: Props) => {
  const viewModel = CaromInfoViewModel(props);

  const renderPlayer = useCallback(
    (player: Player, index: number, totalPointStyle: TextStyle) => {
      return (
        <View
          style={{backgroundColor: player.color}}
          direction={'row'}
          alignItems={'center'}>
          <View direction={'row'} alignItems={'center'} paddingLeft={'10'}>
            <View flex={'1'}>
              <Text fontSize={20} fontWeight={'bold'} numberOfLines={1}>
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
                  fontSize={40}
                  lineHeight={46}
                  fontWeight={'bold'}
                  color={colors.white}>
                  {player.totalPoint || 0}
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
    [props.currentPlayerIndex],
  );

  if (!props.gameSettings.mode?.countdownTime) {
    return <View />;
  }

  return (
    <View style={styles.container} direction={'row'} marginTop={'10'}>
      <View flex={'1'}>
        <View
          ref={viewModel.matchRef}
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
                {props.totalTurns}
              </Text>
            </View>
          </View>
          <View flex={'1'}>
            {renderPlayer(viewModel.player0, 0, styles.totalPointText0)}
            {renderPlayer(viewModel.player1, 1, styles.totalPointText1)}
          </View>
        </View>

        <View
          ref={viewModel.matchCountdownRef}
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
          <View flex={'1'} direction={'row'}>
            <Countdown
              originalCountdownTime={props.gameSettings.mode?.countdownTime}
              currentCountdownTime={props.countdownTime}
              countdownWidth={dims.screenWidth * 0.28}
              heightItem={27}
              marginHorizontal={2}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(CaromInfo);
