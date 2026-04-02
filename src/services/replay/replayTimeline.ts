import RNFS from 'react-native-fs';

import {
  ensureReplayFolder,
  resolveReplayFolder,
} from 'services/replay/localReplay';

export type ReplayScoreboardTimelineEntry = {
  segmentIndex: number;
  segmentTime: number;
  currentPlayerIndex: number;
  countdownTime: number;
  baseCountdown?: number;
  category?: any;
  goal?: number;
  playerSettings?: any;
  totalTurns?: number;
  savedAt?: number;
};

export type ReplayScoreboardTimelineFile = {
  version: 1;
  webcamFolderName: string;
  updatedAt: number;
  entries: ReplayScoreboardTimelineEntry[];
};

const TIMELINE_FILE_NAME = 'scoreboard_timeline.json';
const timelineCache = new Map<string, ReplayScoreboardTimelineFile>();
const writeQueue = new Map<string, Promise<void>>();

const clone = <T,>(value: T): T => {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
};

const getTimelinePath = async (webcamFolderName: string) => {
  const folderPath =
    (await resolveReplayFolder(webcamFolderName)) ||
    (await ensureReplayFolder(webcamFolderName));

  return `${folderPath}/${TIMELINE_FILE_NAME}`;
};

const normalizeTimeline = (
  webcamFolderName: string,
  payload?: Partial<ReplayScoreboardTimelineFile> | null,
): ReplayScoreboardTimelineFile => {
  const entries = Array.isArray(payload?.entries)
    ? payload!.entries
        .filter(Boolean)
        .map(item => ({
          segmentIndex: Number(item.segmentIndex || 0),
          segmentTime: Number(item.segmentTime || 0),
          currentPlayerIndex: Number(item.currentPlayerIndex || 0),
          countdownTime: Number(item.countdownTime || 0),
          baseCountdown:
            item.baseCountdown == null ? undefined : Number(item.baseCountdown),
          category: item.category,
          goal: item.goal == null ? undefined : Number(item.goal),
          playerSettings: clone(item.playerSettings),
          totalTurns: item.totalTurns == null ? undefined : Number(item.totalTurns),
          savedAt: item.savedAt == null ? undefined : Number(item.savedAt),
        }))
        .sort((a, b) => {
          if (a.segmentIndex !== b.segmentIndex) {
            return a.segmentIndex - b.segmentIndex;
          }

          return a.segmentTime - b.segmentTime;
        })
    : [];

  return {
    version: 1,
    webcamFolderName,
    updatedAt: Date.now(),
    entries,
  };
};

export const loadReplayScoreboardTimeline = async (
  webcamFolderName?: string,
): Promise<ReplayScoreboardTimelineFile | null> => {
  if (!webcamFolderName) {
    return null;
  }

  const cached = timelineCache.get(webcamFolderName);
  if (cached) {
    return clone(cached);
  }

  try {
    const timelinePath = await getTimelinePath(webcamFolderName);

    if (!(await RNFS.exists(timelinePath))) {
      const emptyTimeline = normalizeTimeline(webcamFolderName, null);
      timelineCache.set(webcamFolderName, emptyTimeline);
      return clone(emptyTimeline);
    }

    const raw = await RNFS.readFile(timelinePath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeTimeline(webcamFolderName, parsed);
    timelineCache.set(webcamFolderName, normalized);
    return clone(normalized);
  } catch (error) {
    console.log('[ReplayTimeline] load failed:', error);
    return normalizeTimeline(webcamFolderName, null);
  }
};

const persistReplayScoreboardTimeline = async (
  webcamFolderName: string,
  timeline: ReplayScoreboardTimelineFile,
) => {
  const timelinePath = await getTimelinePath(webcamFolderName);
  await RNFS.writeFile(timelinePath, JSON.stringify(timeline), 'utf8');
};

export const appendReplayScoreboardTimelineEntry = async (
  webcamFolderName?: string,
  entry?: ReplayScoreboardTimelineEntry | null,
) => {
  if (!webcamFolderName || !entry) {
    return;
  }

  const queued = writeQueue.get(webcamFolderName) || Promise.resolve();
  const nextTask = queued.then(async () => {
    const existingTimeline =
      (await loadReplayScoreboardTimeline(webcamFolderName)) ||
      normalizeTimeline(webcamFolderName, null);

    const normalizedEntry: ReplayScoreboardTimelineEntry = {
      segmentIndex: Number(entry.segmentIndex || 0),
      segmentTime: Number(entry.segmentTime || 0),
      currentPlayerIndex: Number(entry.currentPlayerIndex || 0),
      countdownTime: Number(entry.countdownTime || 0),
      baseCountdown:
        entry.baseCountdown == null ? undefined : Number(entry.baseCountdown),
      category: entry.category,
      goal: entry.goal == null ? undefined : Number(entry.goal),
      playerSettings: clone(entry.playerSettings),
      totalTurns: entry.totalTurns == null ? undefined : Number(entry.totalTurns),
      savedAt: entry.savedAt == null ? Date.now() : Number(entry.savedAt),
    };

    const entries = [...existingTimeline.entries];
    const lastEntry = entries[entries.length - 1];

    const shouldReplaceLast =
      !!lastEntry &&
      lastEntry.segmentIndex === normalizedEntry.segmentIndex &&
      Math.abs(lastEntry.segmentTime - normalizedEntry.segmentTime) < 0.25;

    if (shouldReplaceLast) {
      entries[entries.length - 1] = normalizedEntry;
    } else {
      entries.push(normalizedEntry);
    }

    const compactedEntries =
      entries.length > 7200 ? entries.slice(entries.length - 7200) : entries;

    const nextTimeline = normalizeTimeline(webcamFolderName, {
      version: 1,
      webcamFolderName,
      updatedAt: Date.now(),
      entries: compactedEntries,
    });

    timelineCache.set(webcamFolderName, nextTimeline);
    await persistReplayScoreboardTimeline(webcamFolderName, nextTimeline);
  });

  writeQueue.set(
    webcamFolderName,
    nextTask.catch(error => {
      console.log('[ReplayTimeline] append failed:', error);
    }),
  );

  await nextTask;
};
