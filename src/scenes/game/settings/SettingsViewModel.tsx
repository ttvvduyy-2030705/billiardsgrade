import {PLAYER_COLOR} from 'constants/player';
import {gameActions} from 'data/redux/actions/game';
import i18n from 'i18n';
import {useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {screens} from 'scenes/screens';
import {BilliardCategory} from 'types/category';
import {Navigation} from 'types/navigation';
import {PlayerNumber, PlayerSettings} from 'types/player';
import {
  GameCountDownTime,
  GameExtraTimeBonus,
  GameExtraTimeTurns,
  GameMode,
  GameSettingsMode,
  GameWarmUpTime,
} from 'types/settings';
import {isCarom3CGame, isPoolGame} from 'utils/game';
import {DEFAULT_PLAYERS, GAME_SETTINGS, PLAYER_SETTINGS} from './constants';
import {GAME_EXTRA_TIME_BONUS} from 'constants/game-settings';

export interface Props extends Navigation {}

const GameSettingsViewModel = (props: Props) => {
  const dispatch = useDispatch();

  const [category, setCategory] = useState<BilliardCategory>('9-ball');
  const [gameSettingsMode, setGameSettingsMode] =
    useState<GameSettingsMode>(GAME_SETTINGS);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(
    PLAYER_SETTINGS(),
  );

  const _resetData = useCallback(() => {
    const timeout = setTimeout(() => {
      setCategory('9-ball');
      setGameSettingsMode(GAME_SETTINGS);
      setPlayerSettings(PLAYER_SETTINGS());
      clearTimeout(timeout);
    }, 100);
  }, []);

  const onCancel = useCallback(() => {
    props.goBack();
  }, [props]);

  const onStart = useCallback(() => {
    const _playingPlayers = playerSettings.playingPlayers.map(player => {
      return {...player, proMode: gameSettingsMode};
    });

    dispatch(
      gameActions.updateGameSettings({
        category,
        mode: gameSettingsMode,
        players: {...playerSettings, playingPlayers: _playingPlayers},
      }),
    );
    props.navigate(screens.gamePlay);

    _resetData();
  }, [dispatch, _resetData, props, category, gameSettingsMode, playerSettings]);

  const onSelectCategory = useCallback(
    (selectedCategory: BilliardCategory) => {
      setCategory(selectedCategory);
      setPlayerSettings({
        playerNumber: 2,
        playingPlayers: DEFAULT_PLAYERS().map((item, index) => ({
          ...item,
          color: isPoolGame(selectedCategory)
            ? PLAYER_COLOR[1]
            : (PLAYER_COLOR as any)[index],
        })),
        goal: {
          ...playerSettings.goal,
          goal: isPoolGame(selectedCategory)
            ? 9
            : isCarom3CGame(selectedCategory)
            ? 30
            : 40,
        },
      });

      if (isCarom3CGame(selectedCategory)) {
        setGameSettingsMode({
          mode: 'pro',
          extraTimeTurns: isCarom3CGame(selectedCategory) ? 2 : 1,
          countdownTime: isCarom3CGame(selectedCategory) ? 40 : 35,
          warmUpTime: 300,
        });
      } else {
        setGameSettingsMode({
          mode: 'fast',
        });
      }
    },
    [playerSettings],
  );

  const onSelectGameMode = useCallback(
    (selectedGameMode: GameMode) => {
      switch (selectedGameMode) {
        case 'fast':
          setGameSettingsMode({mode: selectedGameMode});
          break;
        case 'time':
          setGameSettingsMode({
            mode: selectedGameMode,
            extraTimeTurns: 1,
            countdownTime: 35,
          });
          break;
        case 'eliminate':
          setGameSettingsMode({
            mode: selectedGameMode,
            countdownTime: 35,
          });
          break;
        case 'pro':
          setGameSettingsMode({
            mode: selectedGameMode,
            extraTimeTurns: isCarom3CGame(category) ? 2 : 1,
            countdownTime: isCarom3CGame(category) ? 40 : 35,
            warmUpTime: 300,
            extraTimeBonus: isPoolGame(category)
              ? GAME_EXTRA_TIME_BONUS.s0
              : undefined,
          });
          break;
        default:
          break;
      }
    },
    [category],
  );

  const onSelectExtraTimeBonus = useCallback(
    (extraTimeBonus: GameExtraTimeBonus) => {
      setGameSettingsMode({
        ...gameSettingsMode,
        extraTimeBonus,
      } as GameSettingsMode);
    },
    [gameSettingsMode],
  );

  const onSelectExtraTimeTurns = useCallback(
    (extraTimeTurns: GameExtraTimeTurns) => {
      setGameSettingsMode({
        ...gameSettingsMode,
        extraTimeTurns,
      } as GameSettingsMode);
    },
    [gameSettingsMode],
  );

  const onSelectCountdown = useCallback(
    (countdownTime: GameCountDownTime) => {
      setGameSettingsMode({
        ...gameSettingsMode,
        countdownTime,
      } as GameSettingsMode);
    },
    [gameSettingsMode],
  );

  const onSelectWarmUp = useCallback(
    (warmUpTime: GameWarmUpTime) => {
      setGameSettingsMode({
        ...gameSettingsMode,
        warmUpTime,
      } as GameSettingsMode);
    },
    [gameSettingsMode],
  );

  const onSelectPlayerNumber = useCallback(
    (playerNumber: PlayerNumber) => {
      setPlayerSettings({
        ...playerSettings,
        playerNumber,
        playingPlayers: Array.from(Array(playerNumber).keys()).map(number => {
          return {
            name: i18n.t(`player${number + 1}`),
            color: isPoolGame(category)
              ? PLAYER_COLOR[1]
              : (PLAYER_COLOR as any)[number],
            totalPoint: 0,
          };
        }),
      } as PlayerSettings);
    },
    [playerSettings, category],
  );

  const onChangePlayerPoint = useCallback(
    (addedPoint: number, index: number, stepIndex: number) => {
      if (stepIndex === 4) {
        return;
      }

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev.playingPlayers.map((player, playerIndex) => {
              if (index === playerIndex) {
                return {...player, totalPoint: player.totalPoint + addedPoint};
              }

              return player;
            }),
          } as PlayerSettings),
      );
    },
    [],
  );

  const onChangePlayerName = useCallback((newName: string, index: number) => {
    setPlayerSettings(
      prev =>
        ({
          ...prev,
          playingPlayers: prev.playingPlayers.map((player, playerIndex) => {
            if (index === playerIndex) {
              return {...player, name: newName};
            }

            return player;
          }),
        } as PlayerSettings),
    );
  }, []);

  const onSelectPlayerGoal = useCallback(
    (addedPoint: number, index: number) => {
      if (index === 2) {
        return;
      }

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            goal: {
              ...prev.goal,
              goal: prev.goal.goal + addedPoint,
            },
          } as PlayerSettings),
      );
    },
    [],
  );

  return useMemo(() => {
    const gameMode = gameSettingsMode.mode;
    return {
      category,
      gameMode,
      gameSettingsMode,
      playerSettings,
      extraTimeTurnsEnabled: gameMode === 'time' || gameMode === 'pro',
      countdownEnabled: gameMode !== 'fast',
      warmUpEnabled: gameMode === 'pro',
      extraTimeBonusEnabled: gameMode === 'pro' && isPoolGame(category),
      onSelectExtraTimeBonus,
      onSelectCategory,
      onSelectGameMode,
      onSelectExtraTimeTurns,
      onSelectCountdown,
      onSelectWarmUp,
      onSelectPlayerNumber,
      onSelectPlayerGoal,
      onChangePlayerName,
      onChangePlayerPoint,
      onStart,
      onCancel,
    };
  }, [
    category,
    gameSettingsMode,
    playerSettings,
    onSelectCategory,
    onSelectGameMode,
    onSelectExtraTimeBonus,
    onSelectExtraTimeTurns,
    onSelectCountdown,
    onSelectWarmUp,
    onSelectPlayerNumber,
    onSelectPlayerGoal,
    onChangePlayerName,
    onChangePlayerPoint,
    onStart,
    onCancel,
  ]);
};

export default GameSettingsViewModel;
