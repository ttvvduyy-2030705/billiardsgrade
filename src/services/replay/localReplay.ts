import RNFS from 'react-native-fs';

// Replay VAR trong trận:
// - chỉ giữ đúng 5 phút gần nhất
// - chia 5 phút / 1 clip
// - tối đa 1 clip trong thư mục replay
// - khi có clip mới thì xóa thẳng clip cũ để luôn giữ khoảnh khắc gần nhất
//
// Lưu trữ trên máy:
// - vẫn copy đầy đủ từng clip sang kho archive
// - khi tổng dung lượng vượt ngưỡng 50GB thì xóa dần thư mục cũ nhất
export const RECORDING_SEGMENT_DURATION_MS = 5 * 60 * 1000;
export const MAX_REPLAY_STORAGE_BYTES = 50 * 1024 * 1024 * 1024;

const APP_MEDIA_ROOT = `${RNFS.DownloadDirectoryPath}/Aplus Billiards`;
export const REPLAY_ROOT = `${APP_MEDIA_ROOT}/Replays`;
export const ARCHIVE_ROOT = `${APP_MEDIA_ROOT}/Saved Videos`;
const LEGACY_REPLAY_ROOT = RNFS.DownloadDirectoryPath;
const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.ts'];

const MIN_VALID_VIDEO_BYTES = 1 * 1024 * 1024; // 1MB
const FILE_SETTLE_MS = 1500;
const MAX_REPLAY_WINDOW_MINUTES = 5;
const REPLAY_SEGMENT_MINUTES = 5;
const MAX_REPLAY_SEGMENTS = Math.floor(MAX_REPLAY_WINDOW_MINUTES / REPLAY_SEGMENT_MINUTES); // 1 clip
const PRUNE_MIN_INTERVAL_MS = 15 * 60 * 1000;

let lastPruneRunAt = 0;

export const buildReplayFolderPath = (webcamFolderName: string) => {
  return `${REPLAY_ROOT}/${webcamFolderName}`;
};

export const buildArchiveFolderPath = (webcamFolderName: string) => {
  return `${ARCHIVE_ROOT}/${webcamFolderName}`;
};

export const buildLegacyReplayFolderPath = (webcamFolderName: string) => {
  return `${LEGACY_REPLAY_ROOT}/${webcamFolderName}`;
};

const basename = (filePath: string) => filePath.split('/').pop() || `segment_${Date.now()}.mp4`;

const isVideoFile = (name: string) => {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const safeMtime = (item: RNFS.ReadDirItem) => {
  return item.mtime ? new Date(item.mtime).getTime() : 0;
};

const hasValidVideoShape = (item: RNFS.ReadDirItem) => {
  if (!item.isFile() || !isVideoFile(item.name)) {
    return false;
  }

  const size = Number(item.size || 0);
  return size >= MIN_VALID_VIDEO_BYTES;
};

const isSettlingVideo = (item: RNFS.ReadDirItem) => {
  const mtime = safeMtime(item);
  return mtime > 0 && Date.now() - mtime < FILE_SETTLE_MS;
};

const sortByAge = (a: RNFS.ReadDirItem, b: RNFS.ReadDirItem) => {
  const mtimeDiff = safeMtime(a) - safeMtime(b);
  if (mtimeDiff !== 0) {
    return mtimeDiff;
  }
  return a.name.localeCompare(b.name, undefined, {numeric: true});
};

const readVideoFiles = async (folderPath: string) => {
  const items = await RNFS.readDir(folderPath);
  return items.filter(hasValidVideoShape).sort(sortByAge);
};

export const ensureReplayRoot = async () => {
  if (!(await RNFS.exists(APP_MEDIA_ROOT))) {
    await RNFS.mkdir(APP_MEDIA_ROOT);
  }
  if (!(await RNFS.exists(REPLAY_ROOT))) {
    await RNFS.mkdir(REPLAY_ROOT);
  }
  if (!(await RNFS.exists(ARCHIVE_ROOT))) {
    await RNFS.mkdir(ARCHIVE_ROOT);
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

export const ensureArchiveFolder = async (webcamFolderName: string) => {
  await ensureReplayRoot();
  const folderPath = buildArchiveFolderPath(webcamFolderName);
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

const cleanupFolderBrokenFiles = async (folderPath?: string) => {
  if (!folderPath || !(await RNFS.exists(folderPath))) {
    return;
  }

  const items = await RNFS.readDir(folderPath);

  for (const item of items) {
    const lowerName = item.name.toLowerCase();

    const isBrokenVideo =
      item.isFile() &&
      isVideoFile(item.name) &&
      !isSettlingVideo(item) &&
      !hasValidVideoShape(item);

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

export const cleanupBrokenReplayFiles = async (webcamFolderName: string) => {
  const replayFolderPath = await resolveReplayFolder(webcamFolderName);
  const archiveFolderPath = buildArchiveFolderPath(webcamFolderName);

  await cleanupFolderBrokenFiles(replayFolderPath);
  await cleanupFolderBrokenFiles(archiveFolderPath);
};

const enforceReplayWindow = async (webcamFolderName: string) => {
  const folderPath = await resolveReplayFolder(webcamFolderName);
  if (!folderPath) {
    return;
  }

  const files = await readVideoFiles(folderPath);
  const overflow = files.length - MAX_REPLAY_SEGMENTS;
  if (overflow <= 0) {
    return;
  }

  const staleFiles = files.slice(0, overflow);
  for (const file of staleFiles) {
    try {
      await RNFS.unlink(file.path);
      console.log('[Replay] dropped oldest replay clip:', file.path);
    } catch (error) {
      console.log('[Replay] failed to drop oldest replay clip:', file.path, error);
    }
  }
};

export const listReplayFiles = async (webcamFolderName: string) => {
  const folderPath = await resolveReplayFolder(webcamFolderName);
  if (!folderPath) {
    return [] as RNFS.ReadDirItem[];
  }

  const files = await readVideoFiles(folderPath);
  const settled = files.filter(item => !isSettlingVideo(item));
  const visible = settled.length > 0 ? settled : files;

  // Chỉ trả về clip mới nhất cho playback, đảm bảo VAR luôn bám sát khoảnh khắc vừa xảy ra.
  return visible.slice(-MAX_REPLAY_SEGMENTS);
};


export const waitForReplayFiles = async (
  webcamFolderName: string,
  minCount = 1,
  timeoutMs = 8000,
) => {
  const startedAt = Date.now();
  let files = await listReplayFiles(webcamFolderName);

  while (files.length < minCount && Date.now() - startedAt < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 400));
    files = await listReplayFiles(webcamFolderName);
  }

  return files;
};

export const registerReplaySegment = async (
  webcamFolderName: string,
  segmentPath: string,
) => {
  const replayFolderPath = await ensureReplayFolder(webcamFolderName);
  const archiveFolderPath = await ensureArchiveFolder(webcamFolderName);

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

    const fileName = basename(segmentPath);
    const archiveFileName = `${Date.now()}_${fileName}`;
    const archivePath = `${archiveFolderPath}/${archiveFileName}`;

    try {
      await RNFS.copyFile(segmentPath, archivePath);
    } catch (archiveError) {
      console.log('[Replay] archive copy failed:', archiveError);
    }

    if (!segmentPath.startsWith(replayFolderPath)) {
      const replayFileName = `${Date.now()}_${fileName}`;
      const replayPath = `${replayFolderPath}/${replayFileName}`;
      try {
        await RNFS.moveFile(segmentPath, replayPath);
        segmentPath = replayPath;
      } catch (moveError) {
        console.log('[Replay] move into replay folder failed:', moveError);
      }
    }

    // Giữ đúng 1 clip mới nhất trong thư mục replay.
    await enforceReplayWindow(webcamFolderName);
  } catch (error) {
    console.log('[Replay] stat/register failed:', error);
  }

  return segmentPath;
};

const getDirectorySize = async (directoryPath: string): Promise<number> => {
  if (!(await RNFS.exists(directoryPath))) {
    return 0;
  }

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

const listChildDirectories = async (rootPath: string) => {
  if (!(await RNFS.exists(rootPath))) {
    return [] as RNFS.ReadDirItem[];
  }

  const items = await RNFS.readDir(rootPath);
  return items.filter(item => item.isDirectory()).sort(sortByAge);
};

export const pruneReplayStorage = async (
  maxBytes = MAX_REPLAY_STORAGE_BYTES,
  protectedFolderNames: string[] = [],
) => {
  await ensureReplayRoot();

  const now = Date.now();
  if (now - lastPruneRunAt < PRUNE_MIN_INTERVAL_MS) {
    return {throttled: true, totalBytes: await getDirectorySize(APP_MEDIA_ROOT), deleted: [] as string[]};
  }
  lastPruneRunAt = now;

  let total = await getDirectorySize(APP_MEDIA_ROOT);
  const deleted: string[] = [];

  // Ưu tiên dọn archive cũ trước để không ảnh hưởng replay hiện tại.
  const archiveDirs = await listChildDirectories(ARCHIVE_ROOT);
  for (const dir of archiveDirs) {
    if (total <= maxBytes) {
      break;
    }
    if (protectedFolderNames.includes(dir.name)) {
      continue;
    }

    try {
      const dirSize = await getDirectorySize(dir.path);
      await RNFS.unlink(dir.path);
      total -= dirSize;
      deleted.push(`archive:${dir.name}`);
    } catch (error) {
      console.log('[Replay] failed to prune archive folder:', dir.path, error);
    }
  }

  const replayDirs = await listChildDirectories(REPLAY_ROOT);
  for (const dir of replayDirs) {
    if (total <= maxBytes) {
      break;
    }
    if (protectedFolderNames.includes(dir.name)) {
      continue;
    }

    try {
      const dirSize = await getDirectorySize(dir.path);
      await RNFS.unlink(dir.path);
      total -= dirSize;
      deleted.push(`replay:${dir.name}`);
    } catch (error) {
      console.log('[Replay] failed to prune replay folder:', dir.path, error);
    }
  }

  return {totalBytes: total, deleted};
};

export const deleteReplayFolder = async (webcamFolderName?: string) => {
  if (!webcamFolderName) {
    return;
  }

  const replayPath = buildReplayFolderPath(webcamFolderName);
  const archivePath = buildArchiveFolderPath(webcamFolderName);
  const legacyPath = buildLegacyReplayFolderPath(webcamFolderName);

  if (await RNFS.exists(replayPath)) {
    await RNFS.unlink(replayPath);
  }

  if (await RNFS.exists(archivePath)) {
    await RNFS.unlink(archivePath);
  }

  if (await RNFS.exists(legacyPath)) {
    await RNFS.unlink(legacyPath);
  }
};
