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
      return (
        <View key={index}>
          <View
            style={styles.item}
            marginHorizontal={'10'}
            marginVertical={'10'}>
            <Image source={{uri: image}} style={styles.image} />
            <Button
              style={styles.closeButton}
              onPress={viewModel.onDeleteImage.bind(PickerList, index)}>
              <Image
                source={images.close}
                style={styles.closeImage}
                resizeMode={'contain'}
              />
            </Button>
          </View>
        </View>
      );
    });
  }, [viewModel.images, viewModel.onDeleteImage]);

  return (
    <View style={styles.container} direction={'row'} alignItems={'center'}>
      {IMAGES}
      <Button style={styles.addButton} onPress={viewModel.onPickImage}>
        <Image source={images.plus} style={styles.addImage} />
      </Button>
    </View>
  );
};

export default memo(PickerList);
