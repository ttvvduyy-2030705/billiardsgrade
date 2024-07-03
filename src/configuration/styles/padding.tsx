import {StyleSheet} from 'react-native';

type KeySignature = {
  [key: string]: {
    [subKey: string]: number;
  };
};

const padding: KeySignature = StyleSheet.create({
  padding5: {
    padding: 5,
  },
  padding10: {
    padding: 10,
  },
  padding15: {
    padding: 15,
  },
  padding20: {
    padding: 20,
  },

  paddingHorizontal5: {
    paddingHorizontal: 5,
  },
  paddingHorizontal10: {
    paddingHorizontal: 10,
  },
  paddingHorizontal15: {
    paddingHorizontal: 15,
  },
  paddingHorizontal20: {
    paddingHorizontal: 20,
  },

  paddingVertical5: {
    paddingVertical: 5,
  },
  paddingVertical10: {
    paddingVertical: 10,
  },
  paddingVertical15: {
    paddingVertical: 15,
  },
  paddingVertical20: {
    paddingVertical: 20,
  },

  paddingTop5: {
    paddingTop: 5,
  },
  paddingTop10: {
    paddingTop: 10,
  },
  paddingTop15: {
    paddingTop: 15,
  },
  paddingTop20: {
    paddingTop: 20,
  },

  paddingLeft5: {
    paddingLeft: 5,
  },
  paddingLeft10: {
    paddingLeft: 10,
  },
  paddingLeft15: {
    paddingLeft: 15,
  },
  paddingLeft20: {
    paddingLeft: 20,
  },

  paddingBottom5: {
    paddingBottom: 5,
  },
  paddingBottom10: {
    paddingBottom: 10,
  },
  paddingBottom15: {
    paddingBottom: 15,
  },
  paddingBottom20: {
    paddingBottom: 20,
  },

  paddingRight5: {
    paddingRight: 5,
  },
  paddingRight10: {
    paddingRight: 10,
  },
  paddingRight15: {
    paddingRight: 15,
  },
  paddingRight20: {
    paddingRight: 20,
  },
});

export default padding;
