import React, {memo, useEffect, useMemo, useState} from 'react';
import {Alert, NativeModules, ScrollView} from 'react-native';
import Video from 'react-native-video';
import Container from 'components/Container';
import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Loading from 'components/Loading';
import Image from 'components/Image';
import images from 'assets';
import i18n from 'i18n';
import {goBack} from 'utils/navigation';
import RNFS from "react-native-fs";

const { HttpServer } = NativeModules;

import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import PlayBackWebcamViewModel, {PlayBackWebcamViewModelProps} from './PlayBackViewModel';
import {DURATION_LIST} from './constants';
import styles from './styles';
import Slider from '@react-native-community/slider';
import VideoListItem from './videoListItem';
import QRCode from 'react-native-qrcode-svg';
import { NetworkInfo } from 'react-native-network-info';


const PlayBackWebcam = (props: PlayBackWebcamViewModelProps) => {
  const viewModel = PlayBackWebcamViewModel(props);
 
  const [playbackRate, setPlaybackRate] = useState(1.0); // Default speed is 1.0 (normal)

  const [ip, setIp] = useState("");
  const [fileUrl, setFileUrl] = useState<string>();


  useEffect(() => {
    NetworkInfo.getIPAddress().then(ipAddress => {
      console.log("IP Address:", ipAddress);

      if(ipAddress){
        setIp(ipAddress);
      }
    });
  }, []);

  const startServer = async (filePath: string) => {
    try {
         stopServer()

          const url = await HttpServer.startServer(filePath);

          console.log(url);

          setFileUrl(`http://${ip}:8000`+ filePath);
    
    } catch (error: any) {
      //Alert.alert("Error", error);
    }
  };

  const stopServer = async () => {
    try {
      await HttpServer.stopServer();
      setFileUrl("");
    } catch (error: any) {
      //Alert.alert("Error", error);
    }
  };

  // useEffect( () => {
  //   if(viewModel.videoFiles.length > 0)
  //   {
  //     console.log()
  //      startServer();

  //   }else{
  //     stopServer();
  //   }
  // }, [viewModel.currentIndex]);

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, []);

 
  // const FILE_LIST = useMemo(() => {
  //   return DURATION_LIST.map((item, index) => {
  //     return (
  //       <Button
  //         key={index}
  //         style={[
  //           styles.button,
  //           index === viewModel.selectedDurationIndex
  //             ? styles.buttonSelected
  //             : {},
  //         ]}
  //         onPress={viewModel.onSelectMinuteForWebcam.bind(
  //           PlayBackWebcam,
  //           index,
  //           item.value,
  //         )}>
  //         <Text>{item.title()}</Text>
  //       </Button>
  //     );
  //   });
  // }, [viewModel.selectedDurationIndex, viewModel.onSelectMinuteForWebcam]);

  const onPress = async (index: number, path: string) => {
    viewModel.setCurrentIndex(index);
    await startServer(path)

  };

  return (
    <Container>
      <View direction={'row'}>
        <View margin={'20'}>
          <View direction={'row'} marginBottom={'20'}>
            <View flex={'1'} justify={'center'} alignItems={'center'}>
              <Text fontSize={16} fontWeight={'bold'}>
                {i18n.t('reWatch')}
              </Text>
            </View>
          </View>
          <View flex={'1'} style={{alignItems: 'center'}}>
            <ScrollView showsVerticalScrollIndicator={false} style={{height: 300}}>
            {viewModel.videoFiles.map((item, index) => (
              <VideoListItem
                key={index}
                time={item.mtime?.toLocaleTimeString()}
                path={item.path}
                onPress={() => onPress(index, item.path)}
                index={index} 
                />
            ))}
          </ScrollView>

          {/* <ScrollView showsVerticalScrollIndicator={false}>
              {FILE_LIST}
            </ScrollView> */}

            {fileUrl ? <QRCode value={fileUrl} size={200} /> : <Text>Starting server...</Text>}

            <Text style={styles.label}>{i18n.t('txtTocDoXem')}: {playbackRate.toFixed(2)}x</Text>

          <Slider
              style={styles.slider}
              minimumValue={0.25} // Slowest: 0.25x
              maximumValue={2.0}  // Fastest: 2x
              step={0.25}
              value={playbackRate}
              onValueChange={(value: React.SetStateAction<number>) => setPlaybackRate(value)}
            />
          </View>

          <Button style={styles.buttonBack} onPress={goBack}>
            <View direction={'row'} alignItems={'center'}>
              <Image source={images.back} style={styles.iconBack} />
              <Text lineHeight={15}>{i18n.t('txtBack')}</Text>
            </View>
          </Button>
        </View>

        <View flex={'1'} style={styles.webcamContainer}>
          {viewModel.isLoading ? (
            <View style={styles.webcam}>{WEBCAM_LOADER}</View>
          ) : viewModel.videoFiles ? (
            <>
             
              <Video
                id={'webcam-billiards-playback'}
                ref={viewModel.videoRef}
                style={styles.webcam}
                controls={true}
                source={{ uri: viewModel.videoFiles.length > 0 ?  viewModel.videoFiles[viewModel.currentIndex].path : "null"}}
                selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
                onError={viewModel.onWebcamError}
                renderLoader={WEBCAM_LOADER}
                rate={playbackRate} // Slow motion effect
                //paused={false}
                onLoad={viewModel.handleLoad}
                onProgress={viewModel.handleProgress}
                onEnd={viewModel.handleNext}   
                controlsStyles={{hideNext:true, hidePrevious: true, hideForward:true, hideRewind:true}}
                //onControlsVisibilityChange={}
              /> 
            {/* <Button
              style={styles.buttonShare}
              onPress={viewModel.onShareVideo}>
              <Image source={images.share} style={styles.iconShare} />
            </Button> */}
            </>
            ) : (
              <View style={styles.webcam} />
            )}

       
        </View>
      </View>
    </Container>
  );
};

export default memo(PlayBackWebcam);
