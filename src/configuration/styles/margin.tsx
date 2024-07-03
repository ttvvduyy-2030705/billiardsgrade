import {StyleSheet} from 'react-native';

type KeySignature = {
  [key: string]: {
    [subKey: string]: number;
  };
};

const margin: KeySignature = StyleSheet.create({
  margin5: {
    margin: 5,
  },
  margin10: {
    margin: 10,
  },
  margin15: {
    margin: 15,
  },
  margin20: {
    margin: 20,
  },

  marginHorizontal5: {
    marginHorizontal: 5,
  },
  marginHorizontal10: {
    marginHorizontal: 10,
  },
  marginHorizontal15: {
    marginHorizontal: 15,
  },
  marginHorizontal20: {
    marginHorizontal: 20,
  },

  marginVertical5: {
    marginVertical: 5,
  },
  marginVertical10: {
    marginVertical: 10,
  },
  marginVertical15: {
    marginVertical: 15,
  },
  marginVertical20: {
    marginVertical: 20,
  },

  marginTop5: {
    marginTop: 5,
  },
  marginTop10: {
    marginTop: 10,
  },
  marginTop15: {
    marginTop: 15,
  },
  marginTop20: {
    marginTop: 20,
  },

  marginLeft5: {
    marginLeft: 5,
  },
  marginLeft10: {
    marginLeft: 10,
  },
  marginLeft15: {
    marginLeft: 15,
  },
  marginLeft20: {
    marginLeft: 20,
  },

  marginBottom5: {
    marginBottom: 5,
  },
  marginBottom10: {
    marginBottom: 10,
  },
  marginBottom15: {
    marginBottom: 15,
  },
  marginBottom20: {
    marginBottom: 20,
  },

  marginRight5: {
    marginRight: 5,
  },
  marginRight10: {
    marginRight: 10,
  },
  marginRight15: {
    marginRight: 15,
  },
  marginRight20: {
    marginRight: 20,
  },
});

export default margin;
