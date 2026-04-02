import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  Image as RNImage,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import {ReactNativeZoomableView} from '@openspacelabs/react-native-zoomable-view';
import QRCode from 'react-native-qrcode-svg';
import RNFS from 'react-native-fs';
import {showEditor, listFiles, deleteFile} from 'react-native-video-trim';
import Video from 'react-native-video';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {NetworkInfo} from 'react-native-network-info';
import {useSelector} from 'react-redux';

import images from 'assets';
import Button from 'components/Button';
import Container from 'components/Container';
import Image from 'components/Image';
import Loading from 'components/Loading';
import PoolBroadcastScoreboard from 'components/PoolBroadcastScoreboard';
import CaromBroadcastScoreboard from 'components/CaromBroadcastScoreboard';
import Text from 'components/Text';
import View from 'components/View';
import {keys} from 'configuration/keys';
import {WEBCAM_SELECTED_VIDEO_TRACK} from 'constants/webcam';
import {RootState} from 'data/redux/reducers';
import i18n from 'i18n';
import {
  buildReplayFolderPath,
  resolveReplayFolder,
} from 'services/replay/localReplay';
import {
  loadReplayScoreboardTimeline,
  type ReplayScoreboardTimelineEntry,
} from 'services/replay/replayTimeline';
import {goBack} from 'utils/navigation';
import {isCaromGame, isPool10Game, isPool9Game} from 'utils/game';

import PlayBackWebcamViewModel, {
  PlayBackWebcamViewModelProps,
} from './PlayBackViewModel';
import styles from './styles';
import VideoListItem from './videoListItem';

const setReplayReturnRequestSync = (
  request:
    | {matchSessionId?: string; webcamFolderName?: string; requestedAt?: number}
    | null,
) => {
  (globalThis as any).__APLUS_REPLAY_RETURN_REQUEST__ = request
    ? JSON.parse(JSON.stringify(request))
    : null;
};

const {HttpServer} = NativeModules;
const REPLAY_RESUME_SNAPSHOT_STORAGE_KEY = '@APLUS_REPLAY_RESUME_SNAPSHOT_V3';

type PlaybackThumbnailOverlayState = {
  enabled: boolean;
  topLeft: string[];
  topRight: string[];
  bottomLeft: string[];
  bottomRight: string[];
};

type ReplayOverlaySnapshot = {
  webcamFolderName?: string;
  currentPlayerIndex?: number;
  countdownTime?: number;
  totalTurns?: number;
  playerSettings?: any;
};

const EMPTY_THUMBNAIL_OVERLAY: PlaybackThumbnailOverlayState = {
  enabled: false,
  topLeft: [],
  topRight: [],
  bottomLeft: [],
  bottomRight: [],
};

const parseThumbnailUris = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).slice(0, 1);
    }

    if (typeof parsed === 'string' && parsed.length > 0) {
      return [parsed];
    }

    return [];
  } catch (_error) {
    return [];
  }
};

const getReplayResumeSnapshotSync = (): ReplayOverlaySnapshot | null => {
  const snapshot = (globalThis as any).__APLUS_REPLAY_RESUME_SNAPSHOT__;

  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch (_error) {
    return snapshot;
  }
};

const PlayBackWebcam = (props: PlayBackWebcamViewModelProps) => {
  const viewModel = PlayBackWebcamViewModel(props);
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [folder, setFolder] = useState<string>(
    buildReplayFolderPath(props.webcamFolderName),
  );
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [ip, setIp] = useState('');
  const [fileUrl, setFileUrl] = useState<string>();
  const [thumbnailOverlay, setThumbnailOverlay] =
    useState<PlaybackThumbnailOverlayState>(EMPTY_THUMBNAIL_OVERLAY);
  const [replaySnapshot, setReplaySnapshot] =
    useState<ReplayOverlaySnapshot | null>(null);
  const [scoreboardTimeline, setScoreboardTimeline] =
    useState<ReplayScoreboardTimelineEntry[]>([]);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);

  const loadThumbnailOverlay = useCallback(async () => {
    try {
      const result = await AsyncStorage.multiGet([
        keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
        keys.THUMBNAILS_TOP_LEFT,
        keys.THUMBNAILS_TOP_RIGHT,
        keys.THUMBNAILS_BOTTOM_LEFT,
        keys.THUMBNAILS_BOTTOM_RIGHT,
      ]);

      const enabledRaw = result?.[0]?.[1];
      const enabled =
        typeof enabledRaw === 'string'
          ? enabledRaw === '1' || enabledRaw.toLowerCase() === 'true'
          : enabledRaw == null
            ? true
            : !!enabledRaw;

      if (!enabled) {
        setThumbnailOverlay(EMPTY_THUMBNAIL_OVERLAY);
        return;
      }

      setThumbnailOverlay({
        enabled: true,
        topLeft: parseThumbnailUris(result?.[1]?.[1]),
        topRight: parseThumbnailUris(result?.[2]?.[1]),
        bottomLeft: parseThumbnailUris(result?.[3]?.[1]),
        bottomRight: parseThumbnailUris(result?.[4]?.[1]),
      });
    } catch (error) {
      console.log('[Playback] load thumbnail overlay error:', error);
      setThumbnailOverlay(EMPTY_THUMBNAIL_OVERLAY);
    }
  }, []);

  const loadReplaySnapshot = useCallback(async () => {
    const runtimeSnapshot = getReplayResumeSnapshotSync();

    if (runtimeSnapshot?.webcamFolderName === props.webcamFolderName) {
      setReplaySnapshot(runtimeSnapshot);
      return;
    }

    try {
      const rawSnapshot = await AsyncStorage.getItem(
        REPLAY_RESUME_SNAPSHOT_STORAGE_KEY,
      );

      if (!rawSnapshot) {
        setReplaySnapshot(null);
        return;
      }

      const parsedSnapshot = JSON.parse(rawSnapshot) as ReplayOverlaySnapshot;
      setReplaySnapshot(
        parsedSnapshot?.webcamFolderName === props.webcamFolderName
          ? parsedSnapshot
          : null,
      );
    } catch (error) {
      console.log('[Playback] load replay snapshot error:', error);
      setReplaySnapshot(null);
    }
  }, [props.webcamFolderName]);

  const loadScoreboardTimeline = useCallback(async () => {
    try {
      const timeline = await loadReplayScoreboardTimeline(props.webcamFolderName);
      setScoreboardTimeline(timeline?.entries || []);
    } catch (error) {
      console.log('[Playback] load scoreboard timeline error:', error);
      setScoreboardTimeline([]);
    }
  }, [props.webcamFolderName]);

  useEffect(() => {
    loadScoreboardTimeline();
    const interval = setInterval(loadScoreboardTimeline, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [loadScoreboardTimeline]);

  useEffect(() => {
    setPlaybackCurrentTime(0);
  }, [viewModel.currentIndex]);

  useEffect(() => {
    NetworkInfo.getIPAddress().then(ipAddress => {
      if (ipAddress) {
        setIp(ipAddress);
      }
    });
  }, []);

  useEffect(() => {
    resolveReplayFolder(props.webcamFolderName).then(path => {
      if (path) {
        setFolder(path);
      }
    });
  }, [props.webcamFolderName]);

  useEffect(() => {
    loadThumbnailOverlay();
    const interval = setInterval(loadThumbnailOverlay, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [loadThumbnailOverlay]);

  useEffect(() => {
    loadReplaySnapshot();
    const interval = setInterval(loadReplaySnapshot, 500);

    return () => {
      clearInterval(interval);
    };
  }, [loadReplaySnapshot]);

  useEffect(() => {
    if (viewModel.videoFiles.length > 0) {
      startServer(viewModel.videoFiles[0].path);
    }
  }, [viewModel.videoFiles]);

  const startServer = async (filePath: string) => {
    try {
      await stopServer();
      await HttpServer.startServer(filePath);
      setFileUrl(`http://${ip}:8000${filePath}`);
    } catch (_error) {
      // bỏ qua lỗi server preview nội bộ
    }
  };

  const stopServer = async () => {
    try {
      await HttpServer.stopServer();
      setFileUrl('');
    } catch (_error) {
      // bỏ qua lỗi stop server
    }
  };

  const onBackToMatch = async () => {
    try {
      viewModel.videoRef.current?.pause?.();
      await stopServer();
    } catch (_error) {
      // bỏ qua lỗi dọn dẹp playback
    }

    if (props.returnToMatch) {
      setReplayReturnRequestSync({
        matchSessionId: props.matchSessionId,
        webcamFolderName: props.webcamFolderName,
        requestedAt: Date.now(),
      });
    }

    goBack();
  };

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, []);

  const onPress = async (index: number, path: string) => {
    setPlaybackCurrentTime(0);
    viewModel.setCurrentIndex(index);
    await startServer(path);
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop();
  };

  const scale = useSharedValue(1);
  const doubleTapZoom = 2;
  const maxZoom = 128;
  const minZoom = 1;

  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      scale.value = Math.max(minZoom, Math.min(event.scale, maxZoom));
    })
    .onEnd(() => {
      if (scale.value < minZoom) {
        scale.value = withSpring(minZoom);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  useEffect(() => {
    const videoTrimModule = NativeModules.VideoTrim;
    const supportsNativeEventEmitter = !!(
      videoTrimModule &&
      typeof videoTrimModule.addListener === 'function' &&
      typeof videoTrimModule.removeListeners === 'function'
    );

    const eventSource = supportsNativeEventEmitter
      ? new NativeEventEmitter(videoTrimModule)
      : DeviceEventEmitter;

    const subscription = eventSource.addListener('VideoTrim', async event => {
      switch (event.name) {
        case 'onLoad':
        case 'onShow':
        case 'onHide':
        case 'onStartTrimming':
        case 'onCancelTrimming':
        case 'onCancel':
        case 'onError':
        case 'onLog':
        case 'onStatistics':
          console.log(event.name, event);
          break;
        case 'onFinishTrimming': {
          const files = await listFiles();

          for (let index = 0; index < files.length; index += 1) {
            try {
              const fileName = getFileName(files[index]);
              await RNFS.moveFile(files[index], `${folder}/${fileName}`);
              await deleteFile(files[index]);
            } catch (error) {
              console.error('Error saving video:', error);
            }
          }

          viewModel.loadFiles();
          break;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [folder, viewModel.loadFiles]);

  const {width} = Dimensions.get('window');

  const getVideoWidth = () => {
    return Math.floor(width);
  };

  const getVideoHeight = () => {
    return Math.floor((9 * Math.floor(width)) / 16);
  };

  const currentVideoPath =
    viewModel.videoFiles?.[viewModel.currentIndex]?.path || '';

  const findTimelineEntryForPlayback = useCallback(() => {
    if (!scoreboardTimeline.length) {
      return null;
    }

    const currentSegmentEntries = scoreboardTimeline.filter(
      item => item.segmentIndex === viewModel.currentIndex,
    );

    if (!currentSegmentEntries.length) {
      return null;
    }

    const safeCurrentTime = Math.max(0, Number(playbackCurrentTime || 0));
    let selectedEntry = currentSegmentEntries[0];

    for (const entry of currentSegmentEntries) {
      if (entry.segmentTime <= safeCurrentTime + 0.15) {
        selectedEntry = entry;
      } else {
        break;
      }
    }

    return selectedEntry;
  }, [playbackCurrentTime, scoreboardTimeline, viewModel.currentIndex]);

  const renderOverlaySlot = useCallback(
    (imageList: string[], positionStyle: any) => {
      if (!thumbnailOverlay.enabled || imageList.length === 0) {
        return null;
      }

      return (
        <View pointerEvents={'none'} style={[overlayStyles.slot, positionStyle]}>
          {imageList.map((uri, index) => (
            <RNImage
              key={`${uri}-${index}`}
              source={{uri}}
              style={overlayStyles.image}
              resizeMode={'contain'}
            />
          ))}
        </View>
      );
    },
    [thumbnailOverlay.enabled],
  );

  const renderPlaybackLogoOverlay = useCallback(() => {
    if (!thumbnailOverlay.enabled) {
      return null;
    }

    return (
      <View pointerEvents={'none'} style={overlayStyles.overlayRoot}>
        {renderOverlaySlot(thumbnailOverlay.topLeft, overlayStyles.topLeft)}
        {renderOverlaySlot(thumbnailOverlay.topRight, overlayStyles.topRight)}
        {renderOverlaySlot(thumbnailOverlay.bottomLeft, overlayStyles.bottomLeft)}
        {renderOverlaySlot(
          thumbnailOverlay.bottomRight,
          overlayStyles.bottomRight,
        )}
      </View>
    );
  }, [renderOverlaySlot, thumbnailOverlay]);

  const playbackScoreboardProps = useMemo(() => {
    const timelineEntry = findTimelineEntryForPlayback();
    const resolvedCategory = timelineEntry?.category ?? gameSettings?.category;

    if (timelineEntry?.playerSettings) {
      return {
        category: resolvedCategory,
        gameSettings: {
          category: resolvedCategory,
          mode: {
            countdownTime:
              timelineEntry.baseCountdown ?? gameSettings?.mode?.countdownTime ?? 0,
          },
          players: {
            goal: {
              goal:
                timelineEntry.goal ??
                gameSettings?.players?.goal?.goal ??
                replaySnapshot?.playerSettings?.goal?.goal ??
                0,
            },
          },
        },
        playerSettings: timelineEntry.playerSettings,
        currentPlayerIndex: timelineEntry.currentPlayerIndex ?? 0,
        countdownTime:
          timelineEntry.countdownTime ??
          timelineEntry.baseCountdown ??
          gameSettings?.mode?.countdownTime ??
          0,
        totalTurns: timelineEntry.totalTurns ?? replaySnapshot?.totalTurns ?? 1,
      };
    }

    const hasMatchingSnapshot =
      replaySnapshot?.webcamFolderName === props.webcamFolderName;

    if (!hasMatchingSnapshot || !replaySnapshot?.playerSettings) {
      return null;
    }

    return {
      category: gameSettings?.category,
      gameSettings,
      playerSettings: replaySnapshot.playerSettings,
      currentPlayerIndex: replaySnapshot.currentPlayerIndex ?? 0,
      countdownTime:
        replaySnapshot.countdownTime ?? gameSettings?.mode?.countdownTime ?? 0,
      totalTurns: replaySnapshot.totalTurns ?? 1,
    };
  }, [
    findTimelineEntryForPlayback,
    gameSettings,
    props.webcamFolderName,
    replaySnapshot,
  ]);

  const renderPlaybackScoreboard = useCallback(() => {
    if (!playbackScoreboardProps) {
      return null;
    }

    const category = playbackScoreboardProps.category;

    if (isPool9Game(category) || isPool10Game(category)) {
      return (
        <PoolBroadcastScoreboard
          gameSettings={playbackScoreboardProps.gameSettings}
          playerSettings={playbackScoreboardProps.playerSettings}
          currentPlayerIndex={playbackScoreboardProps.currentPlayerIndex}
          countdownTime={playbackScoreboardProps.countdownTime}
          variant={'playback'}
          bottomOffset={62}
        />
      );
    }

    if (isCaromGame(category)) {
      return (
        <CaromBroadcastScoreboard
          gameSettings={playbackScoreboardProps.gameSettings}
          playerSettings={playbackScoreboardProps.playerSettings}
          currentPlayerIndex={playbackScoreboardProps.currentPlayerIndex}
          countdownTime={playbackScoreboardProps.countdownTime}
          totalTurns={playbackScoreboardProps.totalTurns}
          variant={'playback'}
          bottomOffset={62}
        />
      );
    }

    return null;
  }, [playbackScoreboardProps]);

  return (
    <Container>
      <View direction={'row'}>
        <View margin={'20'}>
          <View direction={'row'} marginBottom={'20'}>
            <View flex={'1'} justify={'center'} alignItems={'center'}>
              <Text fontSize={16} fontWeight={'bold'}>
                {i18n.t('reWatch')}
              </Text>
            </View>
          </View>
          <View flex={'1'} style={{alignItems: 'center'}}>
            {viewModel.videoFiles.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{height: 300}}>
                {viewModel.videoFiles.map((item, index) => (
                  <VideoListItem
                    key={index}
                    time={item.mtime?.toLocaleTimeString()}
                    path={item.path}
                    onPress={() => onPress(index, item.path)}
                    index={index}
                    currentIndex={viewModel.currentIndex}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text lineHeight={15}>No video!</Text>
            )}

            {fileUrl ? <QRCode value={fileUrl} size={100} /> : ''}

            <Text style={styles.label}>
              {i18n.t('txtTocDoXem')}: {playbackRate.toFixed(2)}x
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0.25}
              maximumValue={2.0}
              step={0.25}
              value={playbackRate}
              onValueChange={(value: React.SetStateAction<number>) =>
                setPlaybackRate(value)
              }
            />
          </View>

          <Button style={styles.buttonBack} onPress={onBackToMatch}>
            <View direction={'row'} alignItems={'center'}>
              <Image source={images.back} style={styles.iconBack} />
              <Text lineHeight={15}>{i18n.t('txtBack')}</Text>
            </View>
          </Button>
        </View>

        <View flex={'1'} style={styles.webcamContainer}>
          {viewModel.isLoading ? (
            <View style={styles.webcam}>{WEBCAM_LOADER}</View>
          ) : viewModel.videoFiles.length > 0 ? (
            <GestureDetector gesture={pinchGesture}>
              <Animated.View style={[styles.webcam, animatedStyle]}>
                <ReactNativeZoomableView
                  maxZoom={40}
                  minZoom={1}
                  zoomStep={0.5}
                  initialZoom={1}
                  bindToBorders={true}
                  doubleTapZoomToCenter={true}
                  disablePanOnInitialZoom={true}
                  panBoundaryPadding={0}
                  movementSensibility={3}
                  contentHeight={getVideoHeight()}
                  contentWidth={getVideoWidth()}>
                  <Video
                    resizeMode="contain"
                    id={'webcam-billiards-playback'}
                    ref={viewModel.videoRef}
                    style={[styles.webcam]}
                    controls={true}
                    source={{
                      uri:
                        viewModel.videoFiles.length > 0
                          ? viewModel.videoFiles[viewModel.currentIndex].path
                          : '',
                    }}
                    selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
                    onError={viewModel.onWebcamError}
                    renderLoader={WEBCAM_LOADER}
                    rate={playbackRate}
                    onLoad={data => {
                      viewModel.handleVideoLoad(currentVideoPath, data?.duration || 0);
                      setPlaybackCurrentTime(0);
                      viewModel.handleLoad();
                    }}
                    onProgress={data => {
                      setPlaybackCurrentTime(data?.currentTime || 0);
                      viewModel.handleProgress(data);
                    }}
                    onEnd={viewModel.handleNext}
                    controlsStyles={{
                      hideNext: true,
                      hidePrevious: true,
                      hideForward: true,
                      hideRewind: true,
                      hideDuration: false,
                      hideSettingButton: false,
                      hidePosition: false,
                    }}
                  />
                </ReactNativeZoomableView>
                {renderPlaybackLogoOverlay()}
                {renderPlaybackScoreboard()}
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.webcam} />
          )}
        </View>

        {viewModel.videoFiles.length > 0 ? (
          <Button
            style={styles.buttonShare}
            onPress={() => {
              showEditor(viewModel.videoFiles[viewModel.currentIndex].path, {
                type: 'video',
                outputExt: 'mov',
                trimmingText: i18n.t('trimmingText'),
                cancelTrimmingDialogMessage: i18n.t(
                  'cancelTrimmingDialogMessage',
                ),
                cancelTrimmingButtonText: i18n.t('cancelTrimmingButtonText'),
                saveDialogConfirmText: i18n.t('saveDialogConfirmText'),
                saveDialogTitle: i18n.t('saveDialogTitle'),
                saveButtonText: i18n.t('saveButtonText'),
                saveDialogMessage: i18n.t('saveDialogMessage'),
                cancelDialogConfirmText: i18n.t('cancelDialogConfirmText'),
                openDocumentsOnFinish: false,
                cancelButtonText: i18n.t('cancelButtonText'),
                cancelTrimmingDialogCancelText: i18n.t(
                  'cancelTrimmingDialogCancelText',
                ),
                cancelDialogCancelText: i18n.t('cancelDialogCancelText'),
                cancelDialogMessage: i18n.t('cancelDialogMessage'),
              });
            }}>
            <Image source={images.videoEditor} style={styles.iconShare} />
          </Button>
        ) : (
          <View />
        )}
      </View>
    </Container>
  );
};

const overlayStyles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    elevation: 12,
  },
  slot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLeft: {
    top: 10,
    left: 10,
  },
  topRight: {
    top: 10,
    right: 10,
  },
  bottomLeft: {
    bottom: 10,
    left: 10,
  },
  bottomRight: {
    bottom: 10,
    right: 10,
  },
  image: {
    width: 120,
    height: 70,
  },
});

export default memo(PlayBackWebcam);
