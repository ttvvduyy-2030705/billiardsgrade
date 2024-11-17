import React, {memo, useCallback} from 'react';
// import {KeyboardTypeOptions} from 'react-native';
import View from 'components/View';
import Text from 'components/Text';
// import TextInput from 'components/TextInput';
import Button from 'components/Button';
import i18n from 'i18n';

import {Bitrate, Fps, OutputType, Resolution} from 'types/webcam';

import Google from './google';
import LiveStreamViewModel from './LiveStreamViewModel';
import styles from './styles';

const LiveStream = () => {
  const viewModel = LiveStreamViewModel();

  // const renderInput = useCallback(
  //   (
  //     title: string,
  //     value: string,
  //     placeholder: string,
  //     keyboardType: KeyboardTypeOptions,
  //     returnKeyType: 'next' | 'default',
  //     onChangeText: (value: string) => void,
  //     {
  //       secureTextEntry,
  //       secureTextView,
  //     }: {
  //       secureTextEntry?: boolean;
  //       secureTextView?: boolean;
  //     },
  //   ) => {
  //     return (
  //       <View direction={'row'} marginTop={'15'}>
  //         <View flex={'1'}>
  //           <View marginLeft={'10'} marginBottom={'5'}>
  //             <Text fontSize={12}>{title}</Text>
  //           </View>
  //           <View direction={'row'}>
  //             <TextInput
  //               inputStyle={styles.input}
  //               value={value}
  //               placeholder={placeholder}
  //               onChange={onChangeText}
  //               secureTextEntry={secureTextEntry}
  //               keyboardType={keyboardType}
  //               returnKeyType={returnKeyType}
  //               secureTextView={secureTextView}
  //             />
  //           </View>
  //         </View>
  //       </View>
  //     );
  //   },
  //   [],
  // );

  const renderOutput = useCallback(() => {
    return (
      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'10'}
        marginVertical={'15'}>
        <View marginRight={'10'}>
          <Text fontSize={12}>{i18n.t('txtChooseOutputType')}</Text>
        </View>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button
            style={
              viewModel.liveStreamData.outputType === OutputType.local
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectOutputTypeLocal.bind(
              LiveStream,
              'local',
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{i18n.t('local')}</Text>
            </View>
          </Button>
          <View marginHorizontal={'10'} />
          <Button
            style={
              viewModel.liveStreamData.outputType === OutputType.livestream
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectOutputTypeLocal.bind(
              LiveStream,
              'livestream',
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{i18n.t('livestream')}</Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }, [viewModel.liveStreamData.outputType, viewModel.onSelectOutputTypeLocal]);

  const renderResolution = useCallback(() => {
    return (
      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'10'}
        marginVertical={'15'}>
        <View marginRight={'10'}>
          <Text fontSize={12}>{i18n.t('resolution')}</Text>
        </View>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button
            style={
              viewModel.liveStreamData.resolution === Resolution.HD
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectResolution.bind(
              LiveStream,
              Resolution.HD.toString(),
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'720p'}</Text>
            </View>
          </Button>
          <View marginHorizontal={'10'} />
          <Button
            style={
              viewModel.liveStreamData.resolution === Resolution.FullHD
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectResolution.bind(
              LiveStream,
              Resolution.FullHD.toString(),
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'FullHD'}</Text>
            </View>
          </Button>
          <View marginHorizontal={'10'} />
          <Button
            style={
              viewModel.liveStreamData.resolution === Resolution.QHD
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectResolution.bind(
              LiveStream,
              Resolution.QHD.toString(),
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'2K'}</Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }, [viewModel.liveStreamData.resolution, viewModel.onSelectResolution]);

  const renderFps = useCallback(() => {
    return (
      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'10'}
        marginVertical={'15'}>
        <View marginRight={'10'}>
          <Text fontSize={12}>{i18n.t('frame')}</Text>
        </View>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button
            style={
              viewModel.liveStreamData.fps === Fps.F30
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectFpsLiveStream.bind(
              LiveStream,
              Fps.F30.toString(),
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'30'}</Text>
            </View>
          </Button>
          <View marginHorizontal={'10'} />
          <Button
            style={
              viewModel.liveStreamData.fps === Fps.F60
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectFpsLiveStream.bind(
              LiveStream,
              Fps.F60.toString(),
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'60'}</Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }, [viewModel.liveStreamData.fps, viewModel.onSelectFpsLiveStream]);

  const renderBitrate = useCallback(() => {
    return (
      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'10'}
        marginVertical={'15'}>
        <View marginRight={'10'}>
          <Text fontSize={12}>{i18n.t('bitrate')}</Text>
        </View>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button
            style={
              viewModel.liveStreamData.bitrate === Bitrate.B5000
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectBitrateLiveStream.bind(
              LiveStream,
              Bitrate.B5000,
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'5000 kbps'}</Text>
            </View>
          </Button>
          <View marginHorizontal={'10'} />
          <Button
            style={
              viewModel.liveStreamData.bitrate === Bitrate.B9000
                ? styles.selectedButton
                : styles.button
            }
            onPress={viewModel.onSelectBitrateLiveStream.bind(
              LiveStream,
              Bitrate.B9000,
            )}>
            <View paddingHorizontal={'15'} paddingVertical={'10'}>
              <Text>{'9000 kbps'}</Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }, [viewModel.liveStreamData.bitrate, viewModel.onSelectBitrateLiveStream]);

  return (
    <View padding={'20'}>
      <View marginHorizontal={'10'}>
        <Text fontWeight={'bold'}>{i18n.t('cameraConfig')}</Text>
      </View>

      {renderOutput()}

      {viewModel.liveStreamData.outputType === OutputType.livestream ? (
        // <>
        //   {renderInput(
        //     i18n.t('rtmpUrl'),
        //     viewModel.liveStreamData.rtmpUrl,
        //     i18n.t('txtEnterRTMPUrl'),
        //     'url',
        //     'next',
        //     viewModel.onChangeRTMPUrl,
        //     {},
        //   )}
        //   {renderInput(
        //     i18n.t('streamKey'),
        //     viewModel.liveStreamData.streamKey,
        //     i18n.t('txtEnterStreamKey'),
        //     'default',
        //     'next',
        //     viewModel.onChangeStreamKey,
        //     {secureTextEntry: true, secureTextView: true},
        //   )}
        // </>
        <View style={styles.liveStreamConfigWrapper} padding={'10'}>
          <View direction={'row'} alignItems={'center'} marginVertical={'10'}>
            <View marginHorizontal={'10'}>
              <Text fontSize={12}>{i18n.t('platform')}</Text>
            </View>
            <View flex={'1'} marginRight={'10'}>
              <Google />
            </View>
          </View>

          {renderResolution()}
          {renderFps()}
          {renderBitrate()}
        </View>
      ) : (
        <View />
      )}

      <View direction={'row'} marginTop={'20'} marginHorizontal={'20'}>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button
            disable={!viewModel.allowToSave}
            onPress={viewModel.onSaveConfig}
            style={styles.buttonSaveConfig}>
            <Text>{i18n.t('saveConfig')}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
};

export default memo(LiveStream);
