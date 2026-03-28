import React from 'react';
import {requireNativeComponent, StyleSheet, View} from 'react-native';

type Props = {
  style?: any;
};

const NativeUvcCameraView = requireNativeComponent<Props>('UvcCameraView');

const UvcCameraView = (props: Props) => {
  return (
    <View style={[styles.wrapper, props.style]}>
      <NativeUvcCameraView style={styles.nativeView} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  nativeView: {
    flex: 1,
    width: '100%',
  },
});

export default UvcCameraView;