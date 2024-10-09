import {useRealm} from '@realm/react';
import {ReadGames} from 'data/realm/RQL/game';
import {historyActions} from 'data/redux/actions/history';
import i18n from 'i18n';
import {useCallback, useMemo} from 'react';
import {Alert} from 'react-native';
import {useDispatch} from 'react-redux';
import {screens} from 'scenes/screens';
import {GameSettings} from 'types/settings';
import {navigate} from 'utils/navigation';

const HistoryViewModel = () => {
  const realm = useRealm();
  const games = ReadGames();

  const dispatch = useDispatch();

  const buildCategoryTitle = useCallback((game: GameSettings) => {
    return i18n.t(`${game?.category}`).toUpperCase();
  }, []);

  const buildModeTitle = useCallback((game: GameSettings) => {
    return i18n.t(`${game?.mode?.mode}`).toUpperCase();
  }, []);

  const onReWatchGame = useCallback((webcamFolderName?: string) => {
    if (!webcamFolderName) {
      Alert.alert(i18n.t('txtError'), i18n.t('msgEmptyWebcamUrl'));
      return;
    }

    navigate(screens.playback, {webcamFolderName});
  }, []);

  const onDeleteGame = useCallback(
    (item: GameSettings) => {
      Alert.alert(
        i18n.t('stop'),
        i18n.t('msgConfirmAction', {
          action: i18n.t('txtRemove'),
          name: i18n.t('txtHistory'),
        }),
        [
          {
            text: i18n.t('txtCancel'),
            style: 'cancel',
          },
          {
            text: i18n.t('txtRemove'),
            onPress: () => {
              dispatch(historyActions.deleteHistory({realm, item}));
            },
          },
        ],
      );
    },
    [realm, dispatch],
  );

  return useMemo(() => {
    return {
      games,
      buildModeTitle,
      buildCategoryTitle,
      onReWatchGame,
      onDeleteGame,
    };
  }, [games, buildModeTitle, buildCategoryTitle, onReWatchGame, onDeleteGame]);
};

export default HistoryViewModel;
