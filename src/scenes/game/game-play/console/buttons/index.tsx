import Button from 'components/Button';
import Text from 'components/Text';
import i18n from 'i18n';
import React, {memo, useMemo} from 'react';
import styles from './styles';
import View from 'components/View';

interface Props {
  isStarted: boolean;
  isPaused: boolean;
  warmUpCount?: number;
  poolBreakEnabled: boolean;
  onPoolBreak: () => void;
  onWarmUp: () => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

const ButtonsConsole = (props: Props) => {
  const INITIAL_BUTTONS = useMemo(() => {
    if (typeof props.warmUpCount === 'number' && props.warmUpCount > 0) {
      return (
        <Button
          style={[styles.button, styles.pauseButton]}
          onPress={props.onWarmUp}>
          <Text fontWeight={'bold'} letterSpacing={1.2}>
            {i18n.t('warmUp')} {`(${props.warmUpCount})`}
          </Text>
        </Button>
      );
    }

    if (!props.isStarted) {
      return (
        <Button
          style={[styles.button, styles.pauseButton]}
          onPress={props.onStart}>
          <Text fontWeight={'bold'} letterSpacing={1.2}>
            {i18n.t('start')}
          </Text>
        </Button>
      );
    }

    return (
      <Button
        style={[styles.button, styles.pauseButton]}
        onPress={props.onPause}>
        <Text fontWeight={'bold'} letterSpacing={1.2}>
          {i18n.t(props.isPaused ? 'resume' : 'pause')}
        </Text>
      </Button>
    );
  }, [props]);

  return (
    <View
      direction={'row'}
      alignItems={'center'}
      marginTop={'20'}
      marginHorizontal={'15'}>
      <View
        flex={'1'}
        direction={'row'}
        justify={'center'}
        alignItems={'center'}>
        {INITIAL_BUTTONS}
      </View>
      <View marginHorizontal={'10'} />
      <View
        flex={'1'}
        direction={'row'}
        justify={'center'}
        alignItems={'center'}>
        <Button
          style={[styles.button, styles.stopButton]}
          onPress={props.onStop}>
          <Text fontWeight={'bold'} letterSpacing={1.2}>
            {i18n.t('stop')}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default memo(ButtonsConsole);
