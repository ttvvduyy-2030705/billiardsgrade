import React, {memo, useEffect, useMemo, useState} from 'react';
import {Alert, NativeEventEmitter, NativeModules, ScrollView} from 'react-native';
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
import { showEditor, listFiles, deleteFile } from 'react-native-video-trim';
import RNFS from 'react-native-fs';


const { HttpServer } = NativeModules;

import {
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import PlayBackWebcamViewModel, {PlayBackWebcamViewModelProps} from './PlayBackViewModel';
import styles from './styles';
import Slider from '@react-native-community/slider';
import VideoListItem from './videoListItem';
import QRCode from 'react-native-qrcode-svg';
import { NetworkInfo } from 'react-native-network-info';


const PlayBackWebcam = (props: PlayBackWebcamViewModelProps) => {
  const viewModel = PlayBackWebcamViewModel(props);

  const folder = `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}`;

  const [playbackRate, setPlaybackRate] = useState(1.0); // Default speed is 1.0 (normal)

  const [ip, setIp] = useState("");
  const [fileUrl, setFileUrl] = useState<string>();

  useEffect(() => {
    NetworkInfo.getIPAddress().then(ipAddress => {
      if(ipAddress){
        setIp(ipAddress);
      }
    });
  }, []);

  useEffect(() => {
   if(viewModel.videoFiles.length > 0)
   {
    startServer(viewModel.videoFiles[0].path);
   }
  }, [viewModel.videoFiles]);

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

  const onPress = async (index: number, path: string) => {
    viewModel.setCurrentIndex(index);
    await startServer(path)
  };

  const saveTrimmedVideo = async (trimmedVideoPath: string) => {
    const destinationPath = `${RNFS.DocumentDirectoryPath}/trimmed-video.mp4`;
  
    try {
      await RNFS.moveFile(trimmedVideoPath, destinationPath);
      console.log('Video saved to:', destinationPath);
    } catch (error) {
      console.error('Error saving video:', error);
    }
  };
  const getFileName = (filePath: string) => {
    return filePath.split('/').pop(); 
  };
  
  const filePath = "/storage/emulated/0/DCIM/Camera/video.mp4";
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VideoTrim);
    const subscription = eventEmitter.addListener('VideoTrim', async (event) => {
      switch (event.name) {
        case 'onLoad': {
          // on media loaded successfully
          console.log('onLoadListener', event);
          break;
        }
        case 'onShow': {
          console.log('onShowListener', event);
          break;
        }
        case 'onHide': {
          console.log('onHide', event);
          break;
        }
        case 'onStartTrimming': {
          console.log('onStartTrimming', event);
          break;
        }
        case 'onFinishTrimming': {
          console.log('onFinishTrimming', event);

          var files  = await listFiles();
          for (let index = 0; index < files.length; index++) {
            
              try {
              
                const fileName =  getFileName(files[index]);

                await RNFS.moveFile(files[index], folder+ "/"+ fileName);
                console.log('Video saved to:', files[index]);

                await deleteFile(files[index]);

              } catch (error) {
                console.error('Error saving video:', error);
              }
          }
          console.log(files);
          
          break;
        }
        case 'onCancelTrimming': {
          console.log('onCancelTrimming', event);
          break;
        }
        case 'onCancel': {
          console.log('onCancel', event);
          break;
        }
        case 'onError': {
          console.log('onError', event);
          break;
        }
        case 'onLog': {
          console.log('onLog', event);
          break;
        }
        case 'onStatistics': {
          console.log('onStatistics', event);
          break;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
                currentIndex={viewModel.currentIndex}
                />
            ))}
          </ScrollView>

          {fileUrl ? <QRCode  value={fileUrl} size={100} /> : <Text>Starting server...</Text>}

          <Text style={styles.label}>{i18n.t('txtTocDoXem')}: {playbackRate.toFixed(2)}x</Text>

          <Slider
              style={styles.slider}
              minimumValue={0.25}
              maximumValue={2.0}
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
                source={{ uri: viewModel.videoFiles.length > 0 ?  viewModel.videoFiles[viewModel.currentIndex].path : ""}}
                selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
                onError={viewModel.onWebcamError}
                renderLoader={WEBCAM_LOADER}
                rate={playbackRate}
                onLoad={viewModel.handleLoad}
                onProgress={viewModel.handleProgress}
                onEnd={viewModel.handleNext}   
                controlsStyles={{hideNext:true, hidePrevious: true, hideForward:true, hideRewind:true}}
              /> 

            {viewModel.videoFiles.length ?  (<Button
                style={styles.buttonShare}
                onPress={ () => {
                  showEditor(viewModel.videoFiles[viewModel.currentIndex].path, {
                    //maxDuration: viewModel.videoDurations,
                    type:'video',
                    trimmingText: "Đang cắt video...",
                    cancelTrimmingDialogMessage: "Dừng cắt video",
                    cancelTrimmingButtonText: "Huỷ",
                    saveDialogConfirmText: "Lưu",
                    saveDialogTitle:"Bạn có muốn lưu video mới cắt?",
                    saveButtonText: "Lưu",
                    saveDialogMessage: "Lưu",
                    cancelDialogConfirmText: "Huỷ",
                    openDocumentsOnFinish: false
                  })
                }}>
                <Image source={images.share} style={styles.iconShare} />
              </Button>) : <View></View>
              
            }
          
               
            


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
