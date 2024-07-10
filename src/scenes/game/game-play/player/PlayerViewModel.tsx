import {useCallback, useMemo, useState} from 'react';
import {Player} from 'types/player';
import {GameSettings} from 'types/settings';

export interface Props {
  index: number;
  gameSettings: GameSettings;
  player: Player;
  isOnTurn: boolean;
  onEditPlayerName: (index: number, newName: string) => void;
  onChangePlayerPoint: (
    addedPoint: number,
    index: number,
    stepIndex: number,
  ) => void;
}

const PlayerViewModel = (props: Props) => {
  const [nameEditable, setNameEditable] = useState(false);

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
    props.onChangePlayerPoint(1, props.index, 0);
  }, [props]);

  const onDecreasePoint = useCallback(() => {
    props.onChangePlayerPoint(-1, props.index, 0);
  }, [props]);

  const onPressPointStep = useCallback(
    (addedPoint: number) => {
      props.onChangePlayerPoint(addedPoint, props.index, 0);
    },
    [props],
  );

  const onPressExtraTimeTurns = useCallback(() => {}, []);

  return useMemo(() => {
    return {
      nameEditable,
      onToggleEditName,
      onChangeName,
      onIncreasePoint,
      onDecreasePoint,
      onPressPointStep,
      onPressExtraTimeTurns,
    };
  }, [
    nameEditable,
    onToggleEditName,
    onChangeName,
    onIncreasePoint,
    onDecreasePoint,
    onPressPointStep,
    onPressExtraTimeTurns,
  ]);
};

export default PlayerViewModel;
