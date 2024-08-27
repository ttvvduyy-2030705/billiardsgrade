import React, {memo} from 'react';
import Container from 'components/Container';
import Text from 'components/Text';
import LinearGradient from 'react-native-linear-gradient';
import colors from 'configuration/colors';
import {END, START} from './constants';
import Button from 'components/Button';
import i18n from 'i18n';
import HomeViewModel, {Props} from './HomeViewModel';
import globalStyles from 'configuration/styles';
import View from 'components/View';
import styles from './styles';
import Image from 'components/Image';
import images from 'assets';

const Home = (props: Props) => {
  const viewModel = HomeViewModel(props);

  return (
    <Container>
      <LinearGradient
        style={[
          globalStyles.flex.flex1,
          globalStyles.padding.padding20,
          globalStyles.justify.justify_between,
        ]}
        colors={[colors.lightPrimary2, colors.lightPrimary1]}
        start={START}
        end={END}>
        <View direction={'row'} justify={'between'}>
          <View>
            <Text fontSize={32} letterSpacing={2}>
              {i18n.t('msgAppName')}
            </Text>
          </View>
          <View alignItems={'end'}>
            <View>
              <Text fontWeight={'bold'} fontSize={32} letterSpacing={3}>
                {viewModel.helloText}
              </Text>
            </View>
            <View marginTop={'10'}>
              <Button
                style={styles.buttonHistory}
                onPress={viewModel.onPressHistory}>
                <View direction={'row'} alignItems={'center'}>
                  <Image
                    source={images.history}
                    style={styles.image}
                    resizeMode={'contain'}
                  />
                  <Text fontSize={24}>{i18n.t('txtHistory')}</Text>
                </View>
              </Button>
            </View>
          </View>
        </View>

        <View flex={'1'} alignItems={'center'} justify={'center'}>
          <View flex={'1'} />
          <Button style={styles.button} onPress={viewModel.onStartNewGame}>
            <View direction={'row'} alignItems={'center'}>
              <Image
                source={images.startGame}
                style={styles.image}
                resizeMode={'contain'}
              />
              <Text fontSize={32}>{i18n.t('txtStartNewGame')}</Text>
            </View>
          </Button>

          <View flex={'1'} />
        </View>

        <View alignItems={'center'} justify={'between'}>
          <Image
            source={images.logo}
            style={styles.logo}
            resizeMode={'contain'}
          />
          <View marginTop={'15'}>
            <Text fontSize={24} fontStyle={'italic'}>
              {i18n.t('msgIntroDescription')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Container>
  );
};

export default memo(Home);
