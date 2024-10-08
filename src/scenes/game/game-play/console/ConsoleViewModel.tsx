import colors from 'configuration/colors';
import {BALLS_10, BALLS_15, BALLS_9} from 'constants/balls';
import {RootState} from 'data/redux/reducers';
import i18n from 'i18n';
import {ReactNode, useCallback, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {BallType, PoolBallType} from 'types/ball';
import {Player} from 'types/player';
import {GameSettings, GameSettingsMode} from 'types/settings';
import {formatTotalTime} from 'utils/date';
import {isPool10Game, isPool15Game, isPool15OnlyGame} from 'utils/game';

export interface Props {
  gameSettings: GameSettings;
  currentMode: GameSettingsMode;
  winner?: Player;
  warmUpCount?: number;
  totalPlayers: number;
  totalTurns: number;
  totalTime: number;
  goal: number;
  isStarted: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
  poolBreakEnabled: boolean;
  proModeEnabled: boolean;
  webcamFolderName?: string;
  onGameBreak: () => void;
  onPoolBreak: () => void;
  onPressGiveMoreTime: () => void;
  onWarmUp: () => void;
  onSwitchTurn: () => void;
  onSwapPlayers: () => void;
  onToggleSound: () => void;
  onToggleProMode: () => void;
  onPoolScore: (ball: PoolBallType) => void;
  onSelectWinner: () => void;
  onClearWinner: () => void;
  renderLastPlayer: () => ReactNode;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onResetTurn: () => void;
  updateWebcamFolderName: (name: string) => void;
}

const ConsoleViewModel = (props: Props) => {
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [remoteEnabled, setRemoteEnabled] = useState(false);

  //Pool 15-only
  const [balls, setBalls] = useState(
    isPool15Game(gameSettings?.category)
      ? BALLS_15
      : isPool10Game(gameSettings?.category)
      ? BALLS_10
      : BALLS_9,
  );
  const [ballLeft, setBallLeft] = useState(BALLS_15[0]);
  const [ballRight, setBallRight] = useState(BALLS_15[9]);
  const [pool15OnlyPointLeft, setPool15OnlyPointLeft] = useState(0);
  const [pool15OnlyPointRight, setPool15OnlyPointRight] = useState(0);
  const [colorLeft, setColorLeft] = useState(colors.white);
  const [colorRight, setColorRight] = useState(colors.yellow2);
  const [arrowColorLeft, setArrowColorLeft] = useState(colors.gray2);
  const [arrowColorRight, setArrowColorRight] = useState(colors.white);

  const onToggleValue = useCallback(
    (setValue: React.Dispatch<React.SetStateAction<boolean>>) => () => {
      setValue(prev => !prev);
    },
    [],
  );

  const buildGameModeTitle = useCallback(() => {
    return `${i18n.t(`${gameSettings?.category}`).toUpperCase()} - ${i18n
      .t(`${gameSettings?.mode?.mode}`)
      .toUpperCase()}`;
  }, [gameSettings]);

  const displayTotalTime = useCallback(() => {
    const {hours, minutes, seconds} = formatTotalTime(props.totalTime);
    const _hours = hours < 10 ? `0${hours}` : hours;
    const _minutes = minutes < 10 ? `0${minutes}` : minutes;
    const _seconds = seconds < 10 ? `0${seconds}` : seconds;

    return `${_hours}:${_minutes}:${_seconds}`;
  }, [props]);

  const onPressGiveMoreTime = useCallback(() => {
    if (props.isPaused) {
      return;
    }

    props.onPressGiveMoreTime();
  }, [props]);

  const onSwitchTurn = useCallback(() => {
    if (props.totalPlayers > 2 || props.isPaused) {
      return;
    }

    if (isPool15OnlyGame(props.gameSettings?.category)) {
      setBallLeft(ballRight);
      setBallRight(ballLeft);
      setPool15OnlyPointLeft(pool15OnlyPointRight);
      setPool15OnlyPointRight(pool15OnlyPointLeft);
      setColorLeft(colorRight);
      setColorRight(colorLeft);
      setArrowColorLeft(arrowColorRight);
      setArrowColorRight(arrowColorLeft);
    }

    props.onSwitchTurn();
  }, [
    props,
    ballLeft,
    ballRight,
    pool15OnlyPointLeft,
    pool15OnlyPointRight,
    colorLeft,
    colorRight,
    arrowColorLeft,
    arrowColorRight,
  ]);

  const onSwapPlayers = useCallback(() => {
    if (props.totalPlayers > 2) {
      return;
    }

    props.onSwapPlayers();
  }, [props]);

  const selectPool15OnlyWinner = useCallback(() => {
    props.onSelectWinner();
  }, [props]);

  const onSelectBall = useCallback(
    (selectedBall: PoolBallType) => {
      if (isPool15OnlyGame(props.gameSettings?.category)) {
        switch (selectedBall.number) {
          case ballLeft.number:
            if (pool15OnlyPointLeft + 1 === 8) {
              selectPool15OnlyWinner();
            }

            setPool15OnlyPointLeft(prev => (prev < 8 ? prev + 1 : prev));
            break;
          case ballRight.number:
            if (pool15OnlyPointRight + 1 === 8) {
              selectPool15OnlyWinner();
            }

            setPool15OnlyPointRight(prev => (prev < 8 ? prev + 1 : prev));
            break;
          case BallType.B8:
            selectPool15OnlyWinner();
            break;
          default:
            break;
        }
        return;
      }

      const newBalls = balls.filter(
        ball => ball.number !== selectedBall.number,
      );

      setBalls(newBalls);
      props.onPoolScore(selectedBall);
    },
    [
      props,
      balls,
      ballLeft,
      ballRight,
      pool15OnlyPointLeft,
      pool15OnlyPointRight,
      selectPool15OnlyWinner,
    ],
  );

  const onWarmUp = useCallback(() => {
    props.onWarmUp();
  }, [props]);

  const onRestart = useCallback(() => {
    setPool15OnlyPointLeft(0);
    setPool15OnlyPointRight(0);
    setBalls(
      isPool15Game(gameSettings?.category)
        ? BALLS_15
        : isPool10Game(gameSettings?.category)
        ? BALLS_10
        : BALLS_9,
    );
    props.onClearWinner();
    props.onReset();
  }, [props, gameSettings]);

  const onStart = useCallback(() => {
    props.onStart();
  }, [props]);

  const onPause = useCallback(() => {
    props.onPause();
  }, [props]);

  const onStop = useCallback(() => {
    props.onStop();
  }, [props]);

  return useMemo(() => {
    return {
      balls,
      ballLeft,
      ballRight,
      pool15OnlyPointLeft,
      pool15OnlyPointRight,
      colorLeft,
      colorRight,
      arrowColorLeft,
      arrowColorRight,
      remoteEnabled,
      gameSettings,
      buildGameModeTitle,
      displayTotalTime,
      onToggleRemote: onToggleValue(setRemoteEnabled),
      onPressGiveMoreTime,
      onSwitchTurn,
      onSwapPlayers,
      onSelectBall,
      onWarmUp,
      onRestart,
      onStart,
      onPause,
      onStop,
    };
  }, [
    balls,
    ballLeft,
    ballRight,
    pool15OnlyPointLeft,
    pool15OnlyPointRight,
    colorLeft,
    colorRight,
    arrowColorLeft,
    arrowColorRight,
    remoteEnabled,
    gameSettings,
    buildGameModeTitle,
    displayTotalTime,
    onToggleValue,
    onPressGiveMoreTime,
    onSwitchTurn,
    onSwapPlayers,
    onSelectBall,
    onWarmUp,
    onRestart,
    onStart,
    onPause,
    onStop,
  ]);
};

export default ConsoleViewModel;
