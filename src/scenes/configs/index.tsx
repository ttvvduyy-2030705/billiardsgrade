import React, {memo} from 'react';
import Container from 'components/Container';
import View from 'components/View';

import LanguageConfig from './language';
import WebcamConfig from './webcam';
import styles from './styles';

const Configs = () => {
  return (
    <Container>
      <View flex={'1'} padding={'20'}>
        <View flex={'1'} direction={'row'}>
          <View flex={'1'} marginBottom={'20'} marginRight={'20'}>
            <LanguageConfig />
          </View>
          <View flex={'1'} direction={'row'} style={styles.fullHeight}>
            <WebcamConfig />
          </View>

          <View flex={'1'} marginLeft={'20'} />
        </View>
      </View>
    </Container>
  );
};

export default memo(Configs);
