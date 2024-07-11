import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from 'data/redux/reducers';
import {Player, PlayerSettings} from 'types/player';
import {goBack} from 'utils/navigation';

const GamePlayViewModel = () => {
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();

  useEffect(() => {
    setPlayerSettings(gameSettings?.players);
  }, [gameSettings]);

  const onEditPlayerName = useCallback((index: number, newName: string) => {
    setPlayerSettings(
      prev =>
        ({
          ...prev,
          playingPlayers: prev?.playingPlayers.map((player, playerIndex) => {
            if (index === playerIndex) {
              return {...player, name: newName};
            }

            return player;
          }),
        } as PlayerSettings),
    );
  }, []);

  const onChangePlayerPoint = useCallback(
    (addedPoint: number, index: number, stepIndex: number) => {
      if (stepIndex === 4) {
        return;
      }

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev?.playingPlayers.map((player, playerIndex) => {
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

  const onPressGiveMoreTime = useCallback(() => {
    if (!playerSettings) {
      return;
    }

    const newPlayingPlayers = playerSettings.playingPlayers.map(
      (player, index) => {
        if (
          currentPlayerIndex === index &&
          player.proMode &&
          typeof player.proMode.extraTimeTurns === 'number'
        ) {
          return {
            ...player,
            proMode: {
              ...player.proMode,
              extraTimeTurns:
                player.proMode.extraTimeTurns - 1 > 0
                  ? player.proMode.extraTimeTurns - 1
                  : 0,
            },
          } as Player;
        }

        return player;
      },
    );

    setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
  }, [playerSettings, currentPlayerIndex]);

  const onSwitchTurn = useCallback(() => {
    setCurrentPlayerIndex(prev => (prev === 0 ? 1 : 0));
  }, []);

  const onEndTurn = useCallback(() => {
    if (!gameSettings) {
      return;
    }

    if (currentPlayerIndex + 1 > gameSettings.players.playerNumber - 1) {
      setCurrentPlayerIndex(0);
      setTotalTurns(totalTurns + 1);
      return;
    }

    setCurrentPlayerIndex(currentPlayerIndex + 1);
  }, [currentPlayerIndex, totalTurns, gameSettings]);

  const onSwapPlayers = useCallback(() => {
    const player1: Player = {...playerSettings?.playingPlayers[0]} as Player;
    const player0: Player = {...playerSettings?.playingPlayers[1]} as Player;

    setPlayerSettings({
      ...playerSettings,
      playingPlayers: [player0, player1],
    } as PlayerSettings);
  }, [playerSettings]);

  const onPause = useCallback(() => {}, []);

  const onStop = useCallback(() => {
    goBack();
  }, []);

  return useMemo(() => {
    return {
      currentPlayerIndex,
      totalTurns,
      playerSettings,
      gameSettings,
      updateGameSettings,
      onEditPlayerName,
      onChangePlayerPoint,
      onPressGiveMoreTime,
      onSwitchTurn,
      onSwapPlayers,
      onEndTurn,
      onPause,
      onStop,
    };
  }, [
    currentPlayerIndex,
    totalTurns,
    playerSettings,
    gameSettings,
    updateGameSettings,
    onEditPlayerName,
    onChangePlayerPoint,
    onPressGiveMoreTime,
    onSwitchTurn,
    onSwapPlayers,
    onEndTurn,
    onPause,
    onStop,
  ]);
};

export default GamePlayViewModel;
