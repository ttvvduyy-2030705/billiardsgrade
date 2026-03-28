import {LIVESTREAM_AUTH_BASE_URL} from 'config/livestreamAuth';

export type LivePlatform = 'youtube' | 'facebook';

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

export type FacebookPage = {
  id: string;
  name: string;
  category?: string;
  picture?: string;
  tasks?: string[];
};

export type FacebookCreateLivePayload = {
  title: string;
  description?: string;
  targetType?: 'page' | 'user';
  targetId?: string;
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const requestJson = async (path: string, init?: RequestInit) => {
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
    throw new Error(data?.message || 'Live API request failed');
  }

  return data;
};

export const getLiveConnections = async () => {
  return requestJson('/live/connections');
};

export const getFacebookPages = async (): Promise<FacebookPage[]> => {
  const data = await requestJson('/live/facebook/pages');
  return Array.isArray(data?.pages) ? data.pages : [];
};

export const createYouTubeLive = async (payload: YouTubeCreateLivePayload) => {
  return requestJson('/live/youtube/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const getYouTubeLiveStatus = async (broadcastId: string) => {
  return requestJson(`/live/youtube/status/${encodeURIComponent(broadcastId)}`);
};

export const stopYouTubeLive = async (broadcastId: string) => {
  return requestJson('/live/youtube/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({broadcastId}),
  });
};

export const createFacebookLive = async (
  payload: FacebookCreateLivePayload,
) => {
  return requestJson('/live/facebook/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const getFacebookLiveStatus = async (liveVideoId: string) => {
  return requestJson(
    `/live/facebook/status/${encodeURIComponent(liveVideoId)}`,
  );
};

export const stopFacebookLive = async (liveVideoId: string) => {
  return requestJson('/live/facebook/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({liveVideoId}),
  });
};
