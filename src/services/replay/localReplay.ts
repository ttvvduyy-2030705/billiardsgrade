import RNFS from 'react-native-fs';

export const RECORDING_SEGMENT_DURATION_MS = 5 * 60 * 1000;
export const MAX_REPLAY_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

const APP_MEDIA_ROOT = `${RNFS.DownloadDirectoryPath}/Aplus Billiards`;
export const REPLAY_ROOT = `${APP_MEDIA_ROOT}/Replays`;
const LEGACY_REPLAY_ROOT = RNFS.DownloadDirectoryPath;
const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.ts'];

export const buildReplayFolderPath = (webcamFolderName: string) => {
  return `${REPLAY_ROOT}/${webcamFolderName}`;
};

export const buildLegacyReplayFolderPath = (webcamFolderName: string) => {
  return `${LEGACY_REPLAY_ROOT}/${webcamFolderName}`;
};

const isVideoFile = (name: string) => {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const safeMtime = (item: RNFS.ReadDirItem) => {
  return item.mtime ? new Date(item.mtime).getTime() : 0;
};

export const ensureReplayRoot = async () => {
  if (!(await RNFS.exists(APP_MEDIA_ROOT))) {
    await RNFS.mkdir(APP_MEDIA_ROOT);
  }

  if (!(await RNFS.exists(REPLAY_ROOT))) {
    await RNFS.mkdir(REPLAY_ROOT);
  }
};

export const ensureReplayFolder = async (webcamFolderName: string) => {
  await ensureReplayRoot();
  const folderPath = buildReplayFolderPath(webcamFolderName);

  if (!(await RNFS.exists(folderPath))) {
    await RNFS.mkdir(folderPath);
  }

  return folderPath;
};

export const resolveReplayFolder = async (webcamFolderName: string) => {
  const currentPath = buildReplayFolderPath(webcamFolderName);
  if (await RNFS.exists(currentPath)) {
    return currentPath;
  }

  const legacyPath = buildLegacyReplayFolderPath(webcamFolderName);
  if (await RNFS.exists(legacyPath)) {
    return legacyPath;
  }

  return undefined;
};

export const listReplayFiles = async (webcamFolderName: string) => {
  const folderPath = await resolveReplayFolder(webcamFolderName);

  if (!folderPath) {
    return [] as RNFS.ReadDirItem[];
  }

  const items = await RNFS.readDir(folderPath);
  return items
    .filter(item => item.isFile() && isVideoFile(item.name))
    .sort((a, b) => {
      const mtimeDiff = safeMtime(a) - safeMtime(b);
      if (mtimeDiff !== 0) {
        return mtimeDiff;
      }
      return a.name.localeCompare(b.name, undefined, {numeric: true});
    });
};

export const registerReplaySegment = async (
  webcamFolderName: string,
  segmentPath: string,
) => {
  await ensureReplayFolder(webcamFolderName);

  try {
    await RNFS.scanFile(segmentPath);
  } catch (error) {
    console.log('[Replay] scanFile failed:', error);
  }

  return segmentPath;
};

const getDirectorySize = async (directoryPath: string): Promise<number> => {
  const items = await RNFS.readDir(directoryPath);
  let total = 0;

  for (const item of items) {
    if (item.isFile()) {
      total += Number(item.size || 0);
      continue;
    }

    if (item.isDirectory()) {
      total += await getDirectorySize(item.path);
    }
  }

  return total;
};

const listReplayDirectories = async () => {
  await ensureReplayRoot();
  const items = await RNFS.readDir(REPLAY_ROOT);

  const directories = await Promise.all(
    items
      .filter(item => item.isDirectory())
      .map(async item => ({
        item,
        size: await getDirectorySize(item.path),
      })),
  );

  return directories.sort((a, b) => {
    const mtimeDiff = safeMtime(a.item) - safeMtime(b.item);
    if (mtimeDiff !== 0) {
      return mtimeDiff;
    }
    return a.item.name.localeCompare(b.item.name);
  });
};

export const pruneReplayStorage = async (
  maxBytes = MAX_REPLAY_STORAGE_BYTES,
  protectedFolderNames: string[] = [],
) => {
  await ensureReplayRoot();

  const directories = await listReplayDirectories();
  let total = directories.reduce((sum, entry) => sum + entry.size, 0);
  const deleted: string[] = [];

  for (const entry of directories) {
    if (total <= maxBytes) {
      break;
    }

    if (protectedFolderNames.includes(entry.item.name)) {
      continue;
    }

    try {
      await RNFS.unlink(entry.item.path);
      total -= entry.size;
      deleted.push(entry.item.name);
    } catch (error) {
      console.log('[Replay] failed to prune folder:', entry.item.path, error);
    }
  }

  return {totalBytes: total, deleted};
};

export const deleteReplayFolder = async (webcamFolderName?: string) => {
  if (!webcamFolderName) {
    return;
  }

  const currentPath = buildReplayFolderPath(webcamFolderName);
  const legacyPath = buildLegacyReplayFolderPath(webcamFolderName);

  if (await RNFS.exists(currentPath)) {
    await RNFS.unlink(currentPath);
  }

  if (await RNFS.exists(legacyPath)) {
    await RNFS.unlink(legacyPath);
  }
};
