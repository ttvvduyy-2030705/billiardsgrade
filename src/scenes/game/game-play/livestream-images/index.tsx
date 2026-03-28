import React, {lazy, memo, Suspense, useCallback} from 'react';
import Image from 'components/Image';
import View from 'components/View';

import {isPoolGame} from 'utils/game';

import LiveStreamImagesViewModel, {Props} from './LiveStreamImagesViewModel';
const PoolBoard = lazy(() => import('./pool-board'));
import styles from './styles';

const LiveStreamImages = (props: Props) => {
  const viewModel = LiveStreamImagesViewModel(props);

  const renderImages = useCallback((imageList: string[]) => {
    if (imageList.length === 0) {
      return <View style={styles.emptyView} />;
    }

    return (
      <View direction={'row'}>
        {imageList.map((image, index) => {
          return (
            <Image
              key={index}
              source={{uri: image}}
              style={styles.image}
              resizeMode={'contain'}
            />
          );
        })}
      </View>
    );
  }, []);

  const renderTopLeftImages = useCallback(() => {
    return (
      <View
        ref={viewModel.topLeftRef}
        collapsable={false}
        style={styles.absolute}>
        {renderImages(viewModel.topLeftImages)}
      </View>
    );
  }, [viewModel.topLeftRef, viewModel.topLeftImages, renderImages]);

  const renderTopRightImages = useCallback(() => {
    return (
      <View
        ref={viewModel.topRightRef}
        collapsable={false}
        style={styles.absolute}>
        {renderImages(viewModel.topRightImages)}
      </View>
    );
  }, [viewModel.topRightRef, viewModel.topRightImages, renderImages]);

  const renderBottomLeftImages = useCallback(() => {
    return (
      <View
        ref={viewModel.bottomLeftRef}
        collapsable={false}
        style={styles.absolute}>
        {renderImages(viewModel.bottomLeftImages)}
      </View>
    );
  }, [viewModel.bottomLeftRef, viewModel.bottomLeftImages, renderImages]);

  const renderBottomRightImages = useCallback(() => {
    return (
      <View
        ref={viewModel.bottomRightRef}
        collapsable={false}
        style={styles.absolute}>
        {renderImages(viewModel.bottomRightImages)}
      </View>
    );
  }, [viewModel.bottomRightRef, viewModel.bottomRightImages, renderImages]);

  if (!props.playerSettings || props.playerSettings.playingPlayers.length > 2) {
    return <View />;
  }

  return (
    <>
      {isPoolGame(props.gameSettings?.category) ? (
        <Suspense>
          <PoolBoard
            currentPlayerIndex={props.currentPlayerIndex}
            gameSettings={props.gameSettings}
            playerSettings={props.playerSettings}
          />
        </Suspense>
      ) : (
        <View />
      )}
      {renderTopLeftImages()}
      {renderTopRightImages()}
      {renderBottomLeftImages()}
      {renderBottomRightImages()}
    </>
  );
};

export default memo(LiveStreamImages);
