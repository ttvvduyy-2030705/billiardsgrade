export const enum OutputType {
  local = 'local',
  livestream = 'livestream',
}

export const enum Resolution {
  HD = '0.75',
  FullHD = '1',
  QHD = '1,33333333',
}

export const enum Fps {
  F30 = '30',
  F60 = '60',
}

export const enum Bitrate {
  B5000 = '5000k',
  B9000 = '9000k',
}

export type WebcamFile = {
  id: number;
  name: string;
  path: string;
};

export type Webcam = {
  webcamIP: string;
  username: string;
  password: string;
  syncTime: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
  outputType: OutputType;
};

export type LiveStreamCamera = {
  username?: string;
  rtmpUrl: string;
  streamKey: string;
  outputType: OutputType;
  resolution: Resolution;
  fps: Fps;
  bitrate: Bitrate;
};

export enum WebcamType {
  webcam = 'webcam',
  camera = 'camera',
}

export type YouTubeItem = {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    isDefaultStream: boolean;
  };
  status: {
    streamStatus: string;
    healthStatus: {
      status: string;
    };
  };
  contentDetails: {
    closedCaptionsIngestionUrl: string;
    isReusable: boolean;
  };
};

export type YouTubeResponse = {
  etag: string;
  items: YouTubeItem[];
  kind: string;
  pageInfo: {resultsPerPage: number; totalResults: number};
};
