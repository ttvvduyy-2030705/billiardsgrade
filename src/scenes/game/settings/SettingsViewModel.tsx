import i18n from 'i18n';
import {useCallback, useMemo, useState} from 'react';
import {Alert} from 'react-native';
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

export interface Props extends Navigation {}

const GameSettingsViewModel = (props: Props) => {
  const [category, setCategory] = useState<BilliardCategory>('one-cushion');
  const [gameMode, setGameMode] = useState<GameMode>('fast');
  const [gameSettingsMode, setGameSettingsMode] = useState<GameSettingsMode>();
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
    props.navigate(screens.gamePlay);
  }, [props]);

  const onSelectCategory = useCallback((selectedCategory: BilliardCategory) => {
    setCategory(selectedCategory);
  }, []);

  const onSelectGameMode = useCallback((selectedGameMode: GameMode) => {
    setGameMode(selectedGameMode);
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
    gameMode,
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
