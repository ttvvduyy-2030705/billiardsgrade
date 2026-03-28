import {useCallback, useMemo} from 'react';
import {GoogleSignin, User} from '@react-native-google-signin/google-signin';
import {useDispatch} from 'react-redux';
import {configsActions} from 'data/redux/actions/configs';
import {LiveStreamCamera, YouTubeResponse} from 'types/webcam';
import {Alert} from 'react-native';
import i18n from 'i18n';

export interface Props {
  liveStreamData: LiveStreamCamera;
  onUpdateYouTubeLiveStreamData: (
    username: string,
    url: string,
    streamKey: string,
  ) => void;
}

const GoogleViewModel = (props: Props) => {
  const dispatch = useDispatch();

  const onRetrieveSuccess = useCallback(
    ({user, data}: {user: User; data: YouTubeResponse}) => {
      if (data.items.length === 0) {
        return;
      }

      const {closedCaptionsIngestionUrl} = data.items[0].contentDetails;
      const streamKey = closedCaptionsIngestionUrl.split('cid=')[1];

      props.onUpdateYouTubeLiveStreamData(
        `${user.user.familyName} ${user.user.givenName}`,
        'rtmp://a.rtmp.youtube.com/live2',
        streamKey,
      );
    },
    [props],
  );

  const onRetrieveError = useCallback(() => {
    Alert.alert(i18n.t('txtError'), i18n.t('msgError'));
  }, []);

  const onLoginGoogle = useCallback(async () => {
    if (props.liveStreamData.streamKey) {
      GoogleSignin.signOut();
    }

    dispatch(
      configsActions.retrieveStreamKey(
        undefined,
        onRetrieveSuccess,
        onRetrieveError,
      ),
    );
  }, [props, dispatch, onRetrieveError, onRetrieveSuccess]);

  return useMemo(() => {
    return {onLoginGoogle};
  }, [onLoginGoogle]);
};

export default GoogleViewModel;
