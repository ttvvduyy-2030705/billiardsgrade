import i18n from 'i18n';
import {useCallback, useMemo} from 'react';
import {screens} from 'scenes/screens';
import {Navigation} from 'types/navigation';
// import {BLEService} from 'utils/bluetooth';

export interface Props extends Navigation {}

const HomeViewModel = (props: Props) => {
  const onStartNewGame = useCallback(() => {
    props.navigate(screens.gameSettings);
  }, [props]);

  const onPressHistory = useCallback(() => {
    props.navigate(screens.history);
    // BLEService.scanAndConnect();
  }, [props]);

  const helloText = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();

    switch (true) {
      case hours >= 0 && hours <= 11:
        return i18n.t('txtGoodMorning');
      case hours > 11 && hours <= 17:
        return i18n.t('txtGoodAfternoon');
      case hours > 17 && hours <= 23:
        return i18n.t('txtGoodEvening');
    }
  }, []);

  return useMemo(() => {
    return {helloText, onStartNewGame, onPressHistory};
  }, [helloText, onStartNewGame, onPressHistory]);
};

export default HomeViewModel;
