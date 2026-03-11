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
            <View direction={'row'} alignItems={'center'}>
              <Text fontWeight={'bold'} fontSize={32} letterSpacing={3}>
                {viewModel.helloText}
              </Text>

              <Button
                onPress={viewModel.onPressConfigs}
                style={styles.buttonConfigs}>
                <Image source={images.settings} style={styles.icon} />
              </Button>
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

        <View
          flex={'1'}
          alignItems={'center'}
          justify={'center'}
          style={{paddingBottom: 40}}>
          
          <View alignItems={'center'} justify={'center'}>
  <Button
    style={styles.button}
    onPress={viewModel.onStartNewGame}>
    <View direction={'row'} alignItems={'center'}>
      <Image
        source={images.startGame}
        style={styles.image}
        resizeMode={'contain'}
      />
      <Text fontSize={32}>{i18n.t('txtStartNewGame')}</Text>
    </View>
  </Button>
</View>

          <View
            alignItems={'center'}
            justify={'center'}
            style={{marginTop: 35}}>
            <Image
              source={images.logoSmall}
              style={{width: 260, height: 110}}
              resizeMode={'contain'}
            />

            <View marginTop={'12'}>
              <Text fontSize={24} fontStyle={'italic'}>
                Billiards - Devices - Evolutions
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Container>
  );
};

export default memo(Home);