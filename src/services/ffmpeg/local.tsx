import {FFmpegKit, SessionState} from 'ffmpeg-kit-react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import {WEBCAM_BASE_FILE_NAME, WEBCAM_FILE_EXTENSION} from 'constants/webcam';
import {WebcamType} from 'types/webcam';

let interval: NodeJS.Timeout, tempInterval: NodeJS.Timeout;

const _saveVideoInRange = async (
  folderPath: string,
  duration: number,
): Promise<{mergeFilesTemp: string; noneVideosExist: boolean}> => {

  console.log("merging file")

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

    console.log("merging file name " + _fileName)

    const _filePath = `${folderPath}/${WEBCAM_BASE_FILE_NAME}${_fileName}${WEBCAM_FILE_EXTENSION}`;
    const isFilePathExists = await RNFS.exists(_filePath);

    if (!isFilePathExists) {
      continue;
    }

    noneVideosExist = false;
    await RNFS.write(mergeFilesTemp, `file '${_filePath}'\r\n`);

    console.log("merged file end " + _filePath)

  }

  return {noneVideosExist, mergeFilesTemp};
};

const streamWebcamToFile = async (
  folderName: string,
  segmentTime: number,
  webcamType?: WebcamType,
  url?: string,
) => {
  // const folderPath = `${RNFS.DownloadDirectoryPath}/${folderName}`;

  // await RNFS.mkdir(folderPath);

  // if (webcamType === WebcamType.webcam) {
  //   FFmpegKit.executeAsync(
  //     `-i ${url} -acodec copy -vcodec copy -f segment -segment_time ${segmentTime} -preset veryslow -b:v 9000k -maxrate 18000k -bufsize 12000k ${folderPath}/${WEBCAM_BASE_FILE_NAME}%02d${WEBCAM_FILE_EXTENSION}`,
  //   );
  //   return;
  // }

  // FFmpegKit.executeAsync(
  //   `-f android_camera -i 0 -f segment -segment_time ${segmentTime} -preset veryslow -b:v 9000k -maxrate 18000k -bufsize 12000k ${folderPath}/${WEBCAM_BASE_FILE_NAME}%02d${WEBCAM_FILE_EXTENSION}`,
  // );
};

const mergeVideoFiles = async (folderPath: string) : Promise<string | undefined> => {
try {
     const fullPath = `${RNFS.DownloadDirectoryPath}/${folderPath}`;
     const files = await RNFS.readDir(fullPath) as ReadDirItem[];
      const videoFiles = files.filter((file) => file.name.endsWith('.mov'));
  
      if (videoFiles.length < 2) {
        throw new Error('At least two video files are required for merging.');
      }
  
      // Create a file list for FFmpeg
      const fileListPath = `${RNFS.CachesDirectoryPath}/file_list.txt`;
      const fileListContent = videoFiles
        .map((file) => `file '${file.path}'`)
        .join('\n');
  
  
      await RNFS.writeFile(fileListPath, fileListContent, 'utf8');
  
      const now = Date.now().toString();
  
      // Output file path
      const outputPath = `${fullPath}/${now}.mov`;
  
    //   // Run FFmpeg command to merge videos
    const command = `-f concat -safe 0 -i ${fileListPath} -c copy ${outputPath}`;
    //   const result = await RNFFmpeg.execute(command);
  
    //   if (result === 0) {
    //     console.log(`Videos merged successfully at: ${outputPath}`);
    //     return outputPath;
    //   } else {
    //     throw new Error('FFmpeg merging failed.');
    //   }
    // } catch (error) {
    //   console.error('Error merging video files:', error);
    //   throw error;
    // }
  
    const session = await FFmpegKit.executeAsync(command);
  
    let state = SessionState.RUNNING;
    do {
      state = await session.getState();
    } while (state === SessionState.RUNNING);
  
     if (state === SessionState.COMPLETED) {
      console.log(`Videos merged successfully at: ${outputPath}`);

      // Clean up the temporary file list
      await RNFS.unlink(fileListPath);

      for (const file of videoFiles) {
        try {
          await RNFS.unlink(file.path);
          console.log(`Old video file removed: ${file.path}`);
        } catch (removeOldFileError) {
          console.warn(`Failed to remove old video file: ${file.path}`, removeOldFileError);
        }
      }

      return outputPath;
    } else {
      throw new Error('FFmpeg merging failed.');
    }
} catch (error) {
  console.error(error)
}
};

const getFiles = async (folderPath: string) : Promise<RNFS.ReadDirItem[] | undefined> => {
  try {
       const fullPath = `${RNFS.DownloadDirectoryPath}/${folderPath}`;
       const files = await RNFS.readDir(fullPath) as ReadDirItem[];
       const videoFiles = files.filter((file) => file.name.endsWith('.mov'))
       .sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0)); // Newest first

      return videoFiles;
      
  } catch (error) {
    console.error(error)
  }
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
  clearInterval(tempInterval);
};

export {streamWebcamToFile, mergeVideos, cancelStreamWebcamToFile, mergeVideoFiles, getFiles};
