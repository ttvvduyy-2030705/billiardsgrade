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
  GameExtraTimeTurns,
  GameMode,
  GameSettingsMode,
  GameWarmUpTime,
} from 'types/settings';
import {isPoolGame} from 'utils/game';

export interface Props extends Navigation {}

const GameSettingsViewModel = (props: Props) => {
  const dispatch = useDispatch();

  const [category, setCategory] = useState<BilliardCategory>('three-cusion');
  const [gameSettingsMode, setGameSettingsMode] = useState<GameSettingsMode>({
    mode: 'fast',
  });
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>({
    playerNumber: 2,
    playingPlayers: [
      {
        name: i18n.t('player1'),
        totalPoint: 0,
      },
      {
        name: i18n.t('player2'),
        totalPoint: 0,
      },
    ],
    goal: {
      goal: 40,
      pointSteps: [-5, -1, 1, 5],
    },
  });

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
  }, [dispatch, props, category, gameSettingsMode, playerSettings]);

  const onSelectCategory = useCallback(
    (selectedCategory: BilliardCategory) => {
      setCategory(selectedCategory);
      setPlayerSettings({
        ...playerSettings,
        goal: {
          ...playerSettings.goal,
          goal: isPoolGame(selectedCategory) ? 10 : 40,
        },
      });
    },
    [playerSettings],
  );

  const onSelectGameMode = useCallback((selectedGameMode: GameMode) => {
    switch (selectedGameMode) {
      case 'fast':
        setGameSettingsMode({mode: selectedGameMode});
        break;
      case 'time':
        setGameSettingsMode({
          mode: selectedGameMode,
          extraTimeTurns: 3,
          countdownTime: 40,
        });
        break;
      case 'eliminate':
        setGameSettingsMode({
          mode: selectedGameMode,
          countdownTime: 40,
        });
        break;
      case 'pro':
        setGameSettingsMode({
          mode: selectedGameMode,
          extraTimeTurns: 3,
          countdownTime: 40,
          warmUpTime: 120,
        });
        break;
      default:
        break;
    }
  }, []);

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
            totalPoint: 0,
          };
        }),
      } as PlayerSettings);
    },
    [playerSettings],
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
