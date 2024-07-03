import {StyleSheet} from 'react-native';

type KeySignature = {
  [key: string]: {
    [subKey: string]: string;
  };
};

const justify: KeySignature = StyleSheet.create({
  justify_start: {
    justifyContent: 'flex-start',
  },
  justify_end: {
    justifyContent: 'flex-end',
  },
  justify_center: {
    justifyContent: 'center',
  },
  justify_between: {
    justifyContent: 'space-between',
  },
  justify_around: {
    justifyContent: 'space-around',
  },
});

export default justify;
