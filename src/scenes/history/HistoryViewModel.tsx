import {ReadGames} from 'data/realm/RQL/game';
import i18n from 'i18n';
import {useCallback, useMemo} from 'react';
import {GameSettings} from 'types/settings';

const HistoryViewModel = () => {
  const games = ReadGames();

  const buildCategoryTitle = useCallback((game: GameSettings) => {
    return i18n.t(`${game?.category}`).toUpperCase();
  }, []);

  const buildModeTitle = useCallback((game: GameSettings) => {
    return i18n.t(`${game?.mode?.mode}`).toUpperCase();
  }, []);

  return useMemo(() => {
    return {games, buildModeTitle, buildCategoryTitle};
  }, [games, buildModeTitle, buildCategoryTitle]);
};

export default HistoryViewModel;
