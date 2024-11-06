import {
  MATCH_COUNTDOWN,
  MATCH_IMAGE,
  WEBCAM_BASE_CAMERA_FOLDER,
} from 'constants/webcam';
import {FFmpegKit} from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import {LiveStreamCamera} from 'types/webcam';

const liveStreamFromCamera = async (liveStream?: LiveStreamCamera) => {
  const folderPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}`;
  const matchImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${MATCH_IMAGE}`;
  const matchCountdownImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${MATCH_COUNTDOWN}`;

  const isFolderExist = await RNFS.exists(folderPath);

  if (!isFolderExist) {
    await RNFS.mkdir(folderPath);
  }

  FFmpegKit.executeAsync(
    `-y -video_size hd720 -f android_camera -r 30 -i 0 \
    -f image2 -r 30 -stream_loop -1 -i ${matchImagePath} \
    -f image2 -r 30 -stream_loop -1 -i ${matchCountdownImagePath} -filter_complex "[0][1]overlay=25:25[img1];[2:v]scale=640:35[img2];[img1][img2]overlay=25:100" \
    -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
    -f flv -drop_pkts_on_overflow 1 -attempt_recovery 1 -recover_any_error 1 -r 30 ${liveStream?.rtmpUrl}/${liveStream?.streamKey}`,
  );
};

//
// -f image2 -stream_loop -1 -i ${matchImagePath} -stream_loop -1 -i ${matchCountdownImagePath} -filter_complex "overlay=25:25,overlay=25:180"
//-input_queue_size 2048
//-f flv ${liveStream?.rtmpUrl}/${liveStream?.streamKey} \
//-f mpegts -movflags faststart ${outputFile}
//-movflags faststart

export {liveStreamFromCamera};
