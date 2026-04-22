import React, {memo, useMemo} from 'react';
import View from 'components/View';
import PickerListViewModel, {Props} from './PickerListViewModel';
import Button from 'components/Button';
import Image from 'components/Image';
import styles from './styles';
import images from 'assets';

const PickerList = (props: Props) => {
  const viewModel = PickerListViewModel(props);

  const IMAGES = useMemo(() => {
    return viewModel.images.map((image, index) => {
      const imageSource = viewModel.locked
        ? viewModel.fixedImageSource || {uri: image}
        : {uri: image};

      return (
        <View key={`${image}-${index}`} marginHorizontal={'10'} marginVertical={'10'}>
          <Button
            style={styles.item}
            onPress={viewModel.locked ? viewModel.onLockedPress : () => {}}>
            <>
              <Image source={imageSource as any} style={styles.image} resizeMode={'contain'} />
              <Button
                disable={viewModel.locked && !viewModel.premiumBlocked}
                style={[styles.closeButton, viewModel.locked && {opacity: 0.45}]}
                onPress={viewModel.onDeleteImage.bind(PickerList, index)}>
                <Image
                  source={images.close}
                  style={styles.closeImage}
                  resizeMode={'contain'}
                />
              </Button>
            </>
          </Button>
        </View>
      );
    });
  }, [
    viewModel.images,
    viewModel.onDeleteImage,
    viewModel.onLockedPress,
    viewModel.locked,
    viewModel.premiumBlocked,
    viewModel.fixedImageSource,
  ]);

  return (
    <View style={styles.container} direction={'row'} alignItems={'center'}>
      {IMAGES}
      {!viewModel.locked || viewModel.premiumBlocked ? (
        <Button
          style={[styles.addButton, viewModel.locked && {opacity: 0.55}]}
          onPress={viewModel.locked ? viewModel.onLockedPress : viewModel.onPickImage}>
          <Image source={images.plus} style={styles.addImage} />
        </Button>
      ) : null}
    </View>
  );
};

export default memo(PickerList);
