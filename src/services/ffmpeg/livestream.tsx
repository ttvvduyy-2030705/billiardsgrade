import AsyncStorage from '@react-native-community/async-storage';
import {keys} from 'configuration/keys';
import {
  LIVESTREAM_IMAGE_BOTTOM_LEFT,
  LIVESTREAM_IMAGE_BOTTOM_RIGHT,
  LIVESTREAM_IMAGE_TOP_LEFT,
  LIVESTREAM_IMAGE_TOP_RIGHT,
  MATCH_COUNTDOWN,
  MATCH_IMAGE,
  WEBCAM_BASE_CAMERA_FOLDER,
} from 'constants/webcam';
import {FFmpegKit} from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import {LiveStreamCamera, WebcamType} from 'types/webcam';

const _mapThumbnailItem = (
  imagePath: string,
  currentFilterIndex: number,
  top: string,
  left: string,
) => {
  return {
    inputPrompt: `-r 15 -i ${imagePath}`,
    filterPrompt: `[${currentFilterIndex}]overlay=${top}:${left}`,
  };
};

const _buildThumbnailUrls = () => {
  const imageTopLeftPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${LIVESTREAM_IMAGE_TOP_LEFT}`;
  const imageTopRightPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${LIVESTREAM_IMAGE_TOP_RIGHT}`;
  const imageBottomLeftPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${LIVESTREAM_IMAGE_BOTTOM_LEFT}`;
  const imageBottomRightPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${LIVESTREAM_IMAGE_BOTTOM_RIGHT}`;

  const topLeft = _mapThumbnailItem(imageTopLeftPath, 3, '0', '0');
  const topRight = _mapThumbnailItem(imageTopRightPath, 4, '(W-w)-0', '0');
  const bottomLeft = _mapThumbnailItem(imageBottomLeftPath, 5, '0', '(H-h)-0');
  const bottomRight = _mapThumbnailItem(
    imageBottomRightPath,
    6,
    '(W-w)-0',
    '(H-h)-0',
  );

  return {
    inputUrl: `${topLeft.inputPrompt} ${topRight.inputPrompt} ${bottomLeft.inputPrompt} ${bottomRight.inputPrompt}`,
    filterUrl: `[overlay];[overlay]${topLeft.filterPrompt}[topLeft];[topLeft]${topRight.filterPrompt}[topRight];[topRight]${bottomLeft.filterPrompt}[bottomLeft];[bottomLeft]${bottomRight.filterPrompt}`,
  };
};

const liveStreamFromCamera = async (
  liveStream?: LiveStreamCamera,
  webcamUrl?: string,
  webcamType?: WebcamType,
  countdownEnabled?: boolean,
) => {
  const folderPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}`;
  const matchImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${MATCH_IMAGE}`;
  const matchCountdownImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${MATCH_COUNTDOWN}`;

  const isFolderExist = await RNFS.exists(folderPath);

  if (!isFolderExist) {
    await RNFS.mkdir(folderPath);
  }

  const showThumbnailsOnLiveStream =
    (await AsyncStorage.getItem(keys.SHOW_THUMBNAILS_ON_LIVESTREAM)) === '1';
  const videoAndMatchInfo = `-y -video_size 1920x1080 -f android_camera -i 0 -f image2 -stream_loop -1 -r 15 -i ${matchImagePath}`;
  const audioAndOutput = `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
      -f flv -drop_pkts_on_overflow 1 -attempt_recovery 1 -recover_any_error 1 -preset medium -b:v 5000k -maxrate 6000k -bufsize 12000k ${liveStream?.rtmpUrl}/${liveStream?.streamKey}`;

  let overlayInput = `-i ${matchCountdownImagePath}`;
  let overlayFilter =
    '-filter_complex "hflip[flipped];[flipped][1]overlay=(W-w)/2:(H-h)-60[img1];[2:v]scale=640:35[img2];[img1][img2]overlay=(W-w)/2:(H-h)-25';
  let filterComplex = '-f image2 -stream_loop -1 -r 15';

  if (showThumbnailsOnLiveStream) {
    const result = _buildThumbnailUrls();
    overlayInput = `${overlayInput} ${result.inputUrl}`;
    overlayFilter = `${overlayFilter}${result.filterUrl}"`;
  } else {
    overlayFilter = `${overlayFilter}"`;
  }

  filterComplex = `${filterComplex} ${overlayInput} ${overlayFilter}`;

  if (webcamType === WebcamType.camera) {
    FFmpegKit.executeAsync(
      `${videoAndMatchInfo} \
      ${countdownEnabled ? filterComplex : ''} \
      ${audioAndOutput}`,
    );
    return;
  }

  const webcamAndMatchInfo = `-y -i ${webcamUrl} -f image2 -stream_loop -1 -i ${matchImagePath}`;

  FFmpegKit.executeAsync(
    `${webcamAndMatchInfo} \
    ${countdownEnabled ? filterComplex : ''} \
    ${audioAndOutput}`,
  );
};

// -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
// -f image2 -stream_loop -1 -i ${matchImagePath} -stream_loop -1 -i ${matchCountdownImagePath} -filter_complex "overlay=25:25,overlay=25:180"
//-input_queue_size 2048
//-f flv ${liveStream?.rtmpUrl}/${liveStream?.streamKey} \
//-f mpegts -movflags faststart ${outputFile}
//-movflags faststart

export {liveStreamFromCamera};
