import React from 'react';
import {StyleSheet, View} from 'react-native';
import {requireNativeComponent} from 'react-native';

type Props = {
  style?: any;
  children?: React.ReactNode;
};

const NativeUvcCameraView = requireNativeComponent<any>('UvcCameraView');

const UvcCameraView = (props: Props) => {
  return (
    <View style={[styles.wrapper, props.style]}>
      <NativeUvcCameraView style={styles.nativeView} />
      <View
        pointerEvents="none"
        renderToHardwareTextureAndroid
        style={styles.overlay}>
        {props.children}
      </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default UvcCameraView;
