import React, {memo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import TextInput from 'components/TextInput';
import i18n from 'i18n';
import TableNumberViewModel from './TableNumberViewModel';
import styles from './styles';

const TableNumber = () => {
  const viewModel = TableNumberViewModel();

  return (
    <View style={styles.container} padding={'20'}>
      <View>
        <Text fontWeight={'bold'}>{i18n.t('tableNumberConfig')}</Text>
      </View>
      <View direction={'row'} marginTop={'15'}>
        <View flex={'1'} direction={'row'} alignItems={'center'}>
          <View marginLeft={'10'} marginBottom={'5'}>
            <Text fontSize={12}>{i18n.t('tableNumber')}</Text>
          </View>
          <View flex={'1'} direction={'row'}>
            <TextInput
              inputStyle={styles.input}
              value={viewModel.tableNumber}
              onChange={viewModel.onChangeText}
              keyboardType={'numeric'}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(TableNumber);
