import React, {memo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';

const Home = () => {
  return (
    <Container>
      <View>
        <Text>{'Hello world'}</Text>
      </View>
    </Container>
  );
};

export default memo(Home);
