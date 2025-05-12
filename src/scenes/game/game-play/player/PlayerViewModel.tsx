import {useCallback, useEffect, useMemo, useState} from 'react';
import { RemoteControlKeys } from 'types/bluetooth';
import {Player} from 'types/player';
import {GameSettings} from 'types/settings';
import {isPoolGame} from 'utils/game';
import RemoteControl from 'utils/remote';

export interface Props {
  index: number;
  gameSettings: GameSettings;
  totalPlayers?: number;
  player: Player;
  isOnTurn: boolean;
  isOnPoolBreak: boolean;
  isStarted: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
  proModeEnabled: boolean;
  totalTurns: number;
  onSwitchPoolBreakPlayerIndex: (
    index: number,
    callback?: (playerIndex: number) => void,
  ) => void;
  onEditPlayerName: (index: number, newName: string) => void;
  onChangePlayerPoint: (
    addedPoint: number,
    index: number,
    stepIndex: number,
  ) => void;
  onViolate: (playerIndex: number, reset?: boolean) => void;
  onEndTurn: (isPrevious?: boolean) => void;
}

const PlayerViewModel = (props: Props) => {
  const [nameEditable, setNameEditable] = useState(false);
  const [highestRate, setHighestRate] = useState(0);
  const [averagePoint, setAveragePoint] = useState<string>('0');
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

  useEffect(() => {
    if(props.isOnTurn){
      RemoteControl.instance.registerKeyEvents(
        RemoteControlKeys.UP,
        onIncreasePoint,
      );
      RemoteControl.instance.registerKeyEvents(
        RemoteControlKeys.DOWN,
        onDecreasePoint
      );
      RemoteControl.instance.registerKeyEvents(
        RemoteControlKeys.LEFT,
        onEndTurn.bind(PlayerViewModel, undefined),
      );
      RemoteControl.instance.registerKeyEvents(
        RemoteControlKeys.RIGHT,
        onEndTurn,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.isStarted,
    props.isPaused,
    props.totalTurns,
    props.gameSettings,
    props.player,
  ]);


  const onIncreasePoint = useCallback(() => {
    if (
      (!isPoolGame(props.gameSettings.category) &&
        !props.isOnTurn &&
        props.gameSettings.mode?.mode !== 'fast') ||
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
        props.gameSettings?.mode?.mode !== 'fast') ||
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
        (!props.isOnTurn && props.gameSettings?.mode?.mode !== 'fast') ||
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

  const onResetViolate = useCallback(() => {
    props.onViolate(props.index, true);
  }, [props]);

  const onEndTurn = useCallback(
    (isPrevious?: boolean) => {
      if (totalPointInTurn > highestRate) {
        setHighestRate(totalPointInTurn);
      }

      setAveragePoint((props.player.totalPoint / props.totalTurns).toFixed(2));
      setTotalPointInTurn(0);

      props.onEndTurn(isPrevious);
    },
    [props, highestRate, totalPointInTurn],
  );

  const showProMode = useMemo(() => {
    return props.proModeEnabled && !isPoolGame(props.gameSettings?.category);
  }, [props]);

  return useMemo(() => {
    return {
      showProMode,
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
      onResetViolate,
      onEndTurn,
    };
  }, [
    showProMode,
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
    onResetViolate,
    onEndTurn,
  ]);
};

export default PlayerViewModel;
