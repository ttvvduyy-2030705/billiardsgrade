import {BufferConfig, SelectedVideoTrackType} from 'react-native-video';

const WEBCAM_HOST = 'rtsp://';
const WEBCAM_PORT = '554';
// const WEBCAM_PATH = '/cam/realmonitor?channel=1&subtype=1';
const WEBCAM_PATH = '/cam/realmonitor?channel=1&subtype=0';

const WEBCAM_SELECTED_VIDEO_TRACK = {
  type: SelectedVideoTrackType.INDEX,
  value: 0,
};

const WEBCAM_BUFFER_CONFIG: BufferConfig = {
  minBufferMs: 15000,
  maxBufferMs: 50000,
  bufferForPlaybackMs: 2500,
  bufferForPlaybackAfterRebufferMs: 5000,
  backBufferDurationMs: 120000,
  cacheSizeMB: 0,
  live: {
    targetOffsetMs: 500,
  },
};

const WEBCAM_BASE_FILE_NAME = 'webcam_';
const WEBCAM_FILE_EXTENSION = '.mov';

const WEBCAM_BASE_CAMERA_FOLDER = 'camera';
const WEBCAM_OUTPUT_FILE_NAME = 'match_combined';
const CAMERA_FILE_EXTENSION = '.mkv';

const MATCH_IMAGE = 'match_info.png';
const MATCH_COUNTDOWN = 'match_countdown.png';

export {
  WEBCAM_HOST,
  WEBCAM_PORT,
  WEBCAM_PATH,
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
  WEBCAM_BASE_FILE_NAME,
  WEBCAM_BASE_CAMERA_FOLDER,
  WEBCAM_OUTPUT_FILE_NAME,
  WEBCAM_FILE_EXTENSION,
  CAMERA_FILE_EXTENSION,
  MATCH_IMAGE,
  MATCH_COUNTDOWN,
};
