import React, {memo, useMemo, forwardRef} from 'react';
import RNVideo, {VideoRef} from 'react-native-video';
import {GestureDetector} from 'react-native-gesture-handler';
import RNAnimated from 'react-native-reanimated';
import Loading from 'components/Loading';
import View from 'components/View';
import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import VideoViewModel, {Props} from './VideoViewModel';
import styles from './styles';

const Video = (props: Props, ref: React.LegacyRef<VideoRef>) => {
  const viewModel = VideoViewModel(props);

  const WEBCAM_LOADER = useMemo(() => {
    if (props.loadingDisabled) {
      return undefined;
    }

    return (
      <View
        flex={'1'}
        style={styles.loading}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, [props]);

  return (
    <GestureDetector gesture={viewModel.gestureComposed}>
      <RNAnimated.View style={[styles.container, viewModel.animatedStyles]}>
        <RNVideo
          id={'webcam-billiards'}
          ref={ref}
          style={styles.webcam}
          source={props.source}
          selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
          bufferConfig={WEBCAM_BUFFER_CONFIG}
          onFullscreenPlayerDidPresent={viewModel.onFullscreenPlayerDidPresent}
          onBuffer={viewModel.onBuffer}
          onSeek={viewModel.onSeek}
          onLoad={viewModel.onLoad}
          onVideoTracks={viewModel.onVideoTracks}
          onEnd={viewModel.onEnd}
          onError={viewModel.onError}
          paused={false}
          renderLoader={WEBCAM_LOADER}
        />
      </RNAnimated.View>
    </GestureDetector>
  );
};

export default memo(forwardRef(Video));
