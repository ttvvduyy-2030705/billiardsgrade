import React, {memo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import {goBack} from 'utils/navigation';

const Configs = () => {
  return (
    <Container>
      <View flex="1" justify="center" alignItems="center" padding="20">
        <Text fontSize={20} fontWeight="bold" marginBottom="12">
          Configs tạm thời đã tắt
        </Text>

        <Text textAlign="center" marginBottom="20">
          Màn cấu hình webcam/camera đang được bỏ qua để app chạy ổn trước.
        </Text>

        <Button onPress={goBack}>
          <Text>Quay lại</Text>
        </Button>
      </View>
    </Container>
  );
};

export default memo(Configs);