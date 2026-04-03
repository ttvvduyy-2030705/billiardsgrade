import RNFS from 'react-native-fs';

export const RECORDING_SEGMENT_DURATION_MS = 3 * 60 * 1000;
export const MAX_REPLAY_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

const APP_MEDIA_ROOT = `${RNFS.DownloadDirectoryPath}/Aplus Billiards`;
export const REPLAY_ROOT = `${APP_MEDIA_ROOT}/Replays`;
const LEGACY_REPLAY_ROOT = RNFS.DownloadDirectoryPath;
const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.ts'];

const MIN_VALID_VIDEO_BYTES = 1 * 1024 * 1024; // 1MB
const FILE_SETTLE_MS = 5000; // tránh đụng file vừa mới ghi xong

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

const isLikelyHealthyVideo = (item: RNFS.ReadDirItem) => {
  if (!item.isFile() || !isVideoFile(item.name)) {
    return false;
  }

  const size = Number(item.size || 0);
  if (size < MIN_VALID_VIDEO_BYTES) {
    return false;
  }

  const mtime = safeMtime(item);
  if (mtime > 0 && Date.now() - mtime < FILE_SETTLE_MS) {
    return false;
  }

  return true;
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

export const cleanupBrokenReplayFiles = async (webcamFolderName: string) => {
  const folderPath = await resolveReplayFolder(webcamFolderName);
  if (!folderPath) {
    return;
  }

  const items = await RNFS.readDir(folderPath);

  for (const item of items) {
    const lowerName = item.name.toLowerCase();

    const isBrokenVideo =
      item.isFile() &&
      isVideoFile(item.name) &&
      !isLikelyHealthyVideo(item);

    const isTmpLike =
      item.isFile() &&
      (lowerName.endsWith('.tmp') ||
        lowerName.endsWith('.part') ||
        lowerName.includes('temp'));

    if (!isBrokenVideo && !isTmpLike) {
      continue;
    }

    try {
      await RNFS.unlink(item.path);
      console.log('[Replay] removed broken file:', item.path);
    } catch (error) {
      console.log('[Replay] failed to remove broken file:', item.path, error);
    }
  }
};

export const listReplayFiles = async (webcamFolderName: string) => {
  const folderPath = await resolveReplayFolder(webcamFolderName);
  if (!folderPath) {
    return [] as RNFS.ReadDirItem[];
  }

  const items = await RNFS.readDir(folderPath);

  return items
    .filter(isLikelyHealthyVideo)
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
    const stat = await RNFS.stat(segmentPath);
    const size = Number(stat.size || 0);

    if (size < MIN_VALID_VIDEO_BYTES) {
      console.log('[Replay] reject tiny segment:', segmentPath, size);
      try {
        await RNFS.unlink(segmentPath);
      } catch {}
      return undefined;
    }

    await RNFS.scanFile(segmentPath);
  } catch (error) {
    console.log('[Replay] scan/stat failed:', error);
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