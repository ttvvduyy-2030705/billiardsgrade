import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LIVESTREAM_ACCOUNT_STORAGE_KEY,
  LIVESTREAM_AUTH_BASE_URL,
  isConfiguredLivestreamBaseUrl,
  normalizeLivestreamBaseUrl,
} from 'config/livestreamAuth';

export type YouTubeEligibilityCheck = {
  key: 'subscribers' | 'liveEnabled';
  label: string;
  status: 'pass' | 'fail' | 'unknown';
  detail: string;
};

export type YouTubeEligibilityResponse = {
  ok: boolean;
  platform?: 'youtube';
  connected?: boolean;
  accountName?: string;
  accountId?: string;
  channelId?: string;
  channelTitle?: string;
  subscriberCount?: number | null;
  hiddenSubscriberCount?: boolean;
  meetsMobileLiveSubscriberRequirement?: boolean | null;
  liveEnabled?: boolean | null;
  liveEnabledReason?: string;
  checks?: YouTubeEligibilityCheck[];
  errorCode?: string;
  message?: string;
};

export type YouTubeCreateLivePayload = {
  title: string;
  description?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  scheduledStartTime?: string;
  enableAutoStart?: boolean;
  enableAutoStop?: boolean;
  enableDvr?: boolean;
  recordFromStart?: boolean;
  resolution?: string;
  frameRate?: string;
};

type StoredSetup = {
  setupToken?: string;
};

type StorageShape = {
  youtube?: StoredSetup;
};

const getYouTubeSetupToken = async () => {
  try {
    const raw = await AsyncStorage.getItem(LIVESTREAM_ACCOUNT_STORAGE_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw) as StorageShape;
    return parsed?.youtube?.setupToken || '';
  } catch (_error) {
    return '';
  }
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = normalizeLivestreamBaseUrl(LIVESTREAM_AUTH_BASE_URL);

  if (!isConfiguredLivestreamBaseUrl(baseUrl)) {
    throw new Error(
      'Bạn chưa cấu hình production backend cho YouTube Live trên bản release.',
    );
  }

  const setupToken = await getYouTubeSetupToken();
  const headers = new Headers(init?.headers || {});

  if (setupToken) {
    headers.set('Authorization', `Bearer ${setupToken}`);
    headers.set('X-Livestream-Setup-Token', setupToken);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();

  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = {message: text};
    }
  }

  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.message || 'Live API request failed');
    (error as any).payload = data;
    throw error;
  }

  return data as T;
};

export const getYouTubeLiveEligibility =
  async (): Promise<YouTubeEligibilityResponse> => {
    return requestJson<YouTubeEligibilityResponse>('/live/youtube/eligibility');
  };

export const createYouTubeLiveSession = async (
  payload: YouTubeCreateLivePayload,
) => {
  return requestJson<{
    ok: boolean;
    platform: 'youtube';
    session: {
      id: string;
      broadcastId: string;
      streamId: string;
      title: string;
      description: string;
      privacyStatus: string;
      scheduledStartTime: string;
      streamUrl: string;
      streamName: string;
      streamUrlWithKey: string;
      watchUrl: string;
      streamStatus: string;
      broadcastStatus: string;
      createdAt: string;
      updatedAt: string;
    };
    raw: any;
  }>('/live/youtube/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
