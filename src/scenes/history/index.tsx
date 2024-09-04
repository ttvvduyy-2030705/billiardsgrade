import React, {memo, useCallback} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import HistoryViewModel from './HistoryViewModel';
import {FlatList} from 'react-native';
import {GameSettings} from 'types/settings';
import Text from 'components/Text';
import i18n from 'i18n';
import {Player} from 'types/player';
import styles from './styles';
import colors from 'configuration/colors';
import dayjs from 'dayjs';
import {DAY_FORMAT, TIME_FORMAT} from 'utils/date';

const History = () => {
  const viewModel = HistoryViewModel();

  const renderPlayer = useCallback((player: Player, index: number) => {
    return (
      <View
        key={`player-${index}`}
        style={[styles.player, {backgroundColor: player.color}]}
        paddingHorizontal={'20'}
        paddingVertical={'10'}
        marginHorizontal={'10'}
        alignItems={'center'}>
        <Text>{player.name}</Text>
        <Text fontSize={48}>{player.totalPoint}</Text>
      </View>
    );
  }, []);

  const renderItem = useCallback(
    ({item, index}: {item: GameSettings; index: number}) => {
      return (
        <View
          key={`history-${index}`}
          style={styles.item}
          direction={'row'}
          alignItems={'center'}
          marginVertical={'10'}
          marginHorizontal={'15'}
          padding={'15'}
          linearColors={[colors.lightPrimary2, colors.lightPrimary1]}>
          <View flex={'1'}>
            <Text fontSize={12}>
              <Text fontSize={12} color={colors.deepGray}>
                {i18n.t('category')}:
              </Text>{' '}
              {viewModel.buildCategoryTitle(item)}
            </Text>
            <Text fontSize={12}>
              <Text fontSize={12} color={colors.deepGray}>
                {i18n.t('mode')}:
              </Text>{' '}
              {viewModel.buildModeTitle(item)}
            </Text>
            <Text fontSize={12}>
              <Text fontSize={12} color={colors.deepGray}>
                {i18n.t('time')}:
              </Text>{' '}
              {dayjs(item.updatedAt).format(TIME_FORMAT)}
            </Text>
            <Text fontSize={12}>
              <Text fontSize={12} color={colors.deepGray}>
                {i18n.t('txtDate')}:
              </Text>{' '}
              {dayjs(item.updatedAt).format(DAY_FORMAT)}
            </Text>
            <Text fontSize={12}>
              <Text fontSize={12} color={colors.deepGray}>
                {i18n.t('playingTime')}:
              </Text>{' '}
              {item.totalTime} {i18n.t('txtSecond')}
            </Text>
          </View>
          <View flex={'1'} direction={'row'} justify={'center'}>
            {item.players.playingPlayers.map(renderPlayer)}
          </View>
          <View flex={'1'} alignItems={'center'}>
            <Text>{i18n.t('reWatch')}</Text>
          </View>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const keyExtractor = useCallback(
    (item: GameSettings, index: number) => `history-${index}`,
    [],
  );

  return (
    <Container>
      <FlatList
        data={viewModel.games}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </Container>
  );
};

export default memo(History);
