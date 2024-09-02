import i18n from 'i18n';
import {useCallback, useMemo, useState} from 'react';
import {Player} from 'types/player';
import {GameSettings} from 'types/settings';
import {isPoolGame} from 'utils/game';
import Sound from 'utils/sound';

export interface Props {
  index: number;
  gameSettings: GameSettings;
  player: Player;
  isOnTurn: boolean;
  isStarted: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
  totalTurns: number;
  onEditPlayerName: (index: number, newName: string) => void;
  onChangePlayerPoint: (
    addedPoint: number,
    index: number,
    stepIndex: number,
  ) => void;
  onViolate: (playerIndex: number) => void;
  onEndTurn: (isPrevious?: boolean) => void;
}

const PlayerViewModel = (props: Props) => {
  const [nameEditable, setNameEditable] = useState(false);
  const [highestRate, setHighestRate] = useState(0);
  const [averagePoint, setAveragePoint] = useState(0);
  const [totalPointInTurn, setTotalPointInTurn] = useState(0);

  const onToggleEditName = useCallback(() => {
    setNameEditable(!nameEditable);
  }, [nameEditable]);

  const onChangeName = useCallback(
    (value: string) => {
      props.onEditPlayerName(props.index, value);
    },
    [props],
  );

  const onIncreasePoint = useCallback(() => {
    if (
      (!isPoolGame(props.gameSettings.category) &&
        !props.isOnTurn &&
        props.gameSettings.mode.mode !== 'fast') ||
      !props.isStarted ||
      props.isPaused
    ) {
      return;
    }

    setTotalPointInTurn(prev => prev + 1);
    props.onChangePlayerPoint(1, props.index, 0);
  }, [props]);

  const onDecreasePoint = useCallback(() => {
    if (
      (!isPoolGame(props.gameSettings.category) &&
        !props.isOnTurn &&
        props.gameSettings.mode.mode !== 'fast') ||
      !props.isStarted ||
      props.isPaused
    ) {
      return;
    }

    setTotalPointInTurn(prev => prev - 1);
    props.onChangePlayerPoint(-1, props.index, 0);
  }, [props]);

  const onPressPointStep = useCallback(
    (addedPoint: number) => {
      if (
        (!props.isOnTurn && props.gameSettings.mode.mode !== 'fast') ||
        !props.isStarted ||
        props.isPaused
      ) {
        return;
      }

      props.onChangePlayerPoint(addedPoint, props.index, 0);
    },
    [props],
  );

  const onViolate = useCallback(() => {
    props.onViolate(props.index);
  }, [props]);

  const onEndTurn = useCallback(
    (isPrevious?: boolean) => {
      if (totalPointInTurn > highestRate) {
        setHighestRate(totalPointInTurn);
      }

      setAveragePoint(Math.floor(props.player.totalPoint / props.totalTurns));
      setTotalPointInTurn(0);

      if (props.soundEnabled) {
        Sound.speak(
          i18n.t('msgYouScored', {
            player: props.player.name,
            points: totalPointInTurn,
          }),
        );
      }

      props.onEndTurn(isPrevious);
    },
    [props, highestRate, totalPointInTurn],
  );

  return useMemo(() => {
    return {
      highestRate,
      averagePoint,
      totalPointInTurn,
      nameEditable,
      onToggleEditName,
      onChangeName,
      onIncreasePoint,
      onDecreasePoint,
      onPressPointStep,
      onViolate,
      onEndTurn,
    };
  }, [
    highestRate,
    averagePoint,
    totalPointInTurn,
    nameEditable,
    onToggleEditName,
    onChangeName,
    onIncreasePoint,
    onDecreasePoint,
    onPressPointStep,
    onViolate,
    onEndTurn,
  ]);
};

export default PlayerViewModel;
