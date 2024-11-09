import React, {memo, useCallback} from 'react';
import Image from 'components/Image';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import images from 'assets';

import {isPoolGame} from 'utils/game';

import LiveStreamImagesViewModel, {Props} from './LiveStreamImagesViewModel';
import colors from 'configuration/colors';
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
      <View
        ref={viewModel.matchRef}
        style={styles.matchInfo}
        collapsable={false}
        alignItems={'center'}>
        <View style={styles.matchLogoWrapper} paddingHorizontal={'10'}>
          <Image
            source={images.logoSmall}
            style={styles.matchLogo}
            resizeMode={'contain'}
          />
        </View>
        <View
          style={styles.matchBackground}
          flex={'1'}
          direction={'row'}
          alignItems={'center'}>
          <View flex={'1'} direction={'row'} alignItems={'center'}>
            <View flex={'1'} justify={'center'} paddingHorizontal={'15'}>
              <Text fontWeight={'bold'}>{viewModel.player0?.name}</Text>
            </View>
            <View
              justify={'center'}
              paddingHorizontal={'15'}
              marginRight={'15'}>
              <Text
                style={styles.matchPointText}
                fontWeight={'bold'}
                fontSize={32}
                color={colors.error}>
                {viewModel.player0?.totalPoint}
              </Text>
            </View>
          </View>
          {isPoolGame(props.gameSettings?.category) ? (
            <View paddingHorizontal={'20'} style={styles.matchRace}>
              <Text color={colors.white}>
                {i18n.t('raceTo', {
                  goal: props.gameSettings?.players.goal.goal,
                })}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View flex={'1'} direction={'row'} alignItems={'center'}>
            <View justify={'center'} paddingHorizontal={'15'} marginLeft={'15'}>
              <Text
                style={styles.matchPointText}
                fontWeight={'bold'}
                fontSize={32}
                color={colors.error}>
                {viewModel.player1?.totalPoint}
              </Text>
            </View>
            <View
              flex={'1'}
              alignItems={'end'}
              justify={'center'}
              paddingHorizontal={'15'}>
              <Text fontWeight={'bold'}>{viewModel.player1?.name}</Text>
            </View>
          </View>
        </View>
      </View>

      {renderTopLeftImages()}
      {renderTopRightImages()}
      {renderBottomLeftImages()}
      {renderBottomRightImages()}
    </>
  );
};

export default memo(LiveStreamImages);
