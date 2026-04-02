import {LIVESTREAM_AUTH_BASE_URL} from 'config/livestreamAuth';

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

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(
    `${normalizeBaseUrl(LIVESTREAM_AUTH_BASE_URL)}${path}`,
    init,
  );

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
