import {useCallback, useMemo, useState} from 'react';
import {Player} from 'types/player';
import {GameSettings} from 'types/settings';

export interface Props {
  index: number;
  gameSettings: GameSettings;
  player: Player;
  isOnTurn: boolean;
  totalTurns: number;
  onEditPlayerName: (index: number, newName: string) => void;
  onChangePlayerPoint: (
    addedPoint: number,
    index: number,
    stepIndex: number,
  ) => void;
  onEndTurn: () => void;
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
    if (!props.isOnTurn && props.gameSettings.mode.mode !== 'fast') {
      return;
    }

    setTotalPointInTurn(prev => prev + 1);
    props.onChangePlayerPoint(1, props.index, 0);
  }, [props]);

  const onDecreasePoint = useCallback(() => {
    if (!props.isOnTurn && props.gameSettings.mode.mode !== 'fast') {
      return;
    }

    setTotalPointInTurn(prev => prev - 1);
    props.onChangePlayerPoint(-1, props.index, 0);
  }, [props]);

  const onPressPointStep = useCallback(
    (addedPoint: number) => {
      if (!props.isOnTurn && props.gameSettings.mode.mode !== 'fast') {
        return;
      }

      props.onChangePlayerPoint(addedPoint, props.index, 0);
    },
    [props],
  );

  const onEndTurn = useCallback(() => {
    if (totalPointInTurn > highestRate) {
      setHighestRate(totalPointInTurn);
    }

    setAveragePoint(props.player.totalPoint / props.totalTurns);
    setTotalPointInTurn(0);

    props.onEndTurn();
  }, [props, highestRate, totalPointInTurn]);

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
    onEndTurn,
  ]);
};

export default PlayerViewModel;
