import {FFmpegKit, SessionState} from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import {WEBCAM_BASE_FILE_NAME, WEBCAM_FILE_EXTENSION} from 'constants/webcam';

let interval: NodeJS.Timeout;

const _saveVideoInRange = async (
  folderPath: string,
  duration: number,
): Promise<{mergeFilesTemp: string; noneVideosExist: boolean}> => {
  const now = new Date();
  const mergeFilesTemp = `${folderPath}/mergeFiles.txt`;
  const isMergeFilesTempExist = await RNFS.exists(mergeFilesTemp);

  if (isMergeFilesTempExist) {
    await RNFS.unlink(mergeFilesTemp);
  }
  await RNFS.touch(mergeFilesTemp, now, now);

  let noneVideosExist = true;
  for (let i = 0; i < duration; i++) {
    const _fileName = i < 10 ? `0${i}` : i;
    const _filePath = `${folderPath}/${WEBCAM_BASE_FILE_NAME}${_fileName}${WEBCAM_FILE_EXTENSION}`;
    const isFilePathExists = await RNFS.exists(_filePath);

    if (!isFilePathExists) {
      continue;
    }

    noneVideosExist = false;
    await RNFS.write(mergeFilesTemp, `file '${_filePath}'\r\n`);
  }

  return {noneVideosExist, mergeFilesTemp};
};

const streamWebcamToFile = async (
  url: string,
  folderName: string,
  segmentTime: number,
) => {
  const folderPath = `${RNFS.DownloadDirectoryPath}/${folderName}`;

  await RNFS.mkdir(folderPath);
  FFmpegKit.executeAsync(
    `-i ${url} -acodec copy -vcodec copy -f segment -segment_time ${segmentTime} ${folderPath}/${WEBCAM_BASE_FILE_NAME}%02d${WEBCAM_FILE_EXTENSION}`,
  );
};

const mergeVideos = async (
  folderName: string,
  duration: number,
  options?: {
    cache?: boolean;
  },
): Promise<string | undefined> => {
  const folderPath = `${RNFS.DownloadDirectoryPath}/${folderName}`;
  const finalFile = `${folderPath}/${WEBCAM_BASE_FILE_NAME}duration_${duration}${WEBCAM_FILE_EXTENSION}`;
  const isFinalFileExists = await RNFS.exists(finalFile);

  if (isFinalFileExists) {
    //Use existing merged video
    if (options?.cache) {
      return finalFile;
    }

    await RNFS.unlink(finalFile);
  }

  const saveData = await _saveVideoInRange(folderPath, duration);

  if (saveData.noneVideosExist) {
    return undefined;
  }

  const cmdMergeVideos = `-f concat -safe 0 -fflags +discardcorrupt -i ${saveData.mergeFilesTemp} -c copy ${finalFile}`;
  const session = await FFmpegKit.executeAsync(cmdMergeVideos);

  let state = SessionState.RUNNING;
  do {
    state = await session.getState();
  } while (state === SessionState.RUNNING);

  return finalFile;
};

const cancelStreamWebcamToFile = () => {
  FFmpegKit.cancel();
  clearInterval(interval);
};

export {streamWebcamToFile, mergeVideos, cancelStreamWebcamToFile};
