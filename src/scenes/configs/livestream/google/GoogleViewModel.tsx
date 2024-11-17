import {useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';
import {configsActions} from 'data/redux/actions/configs';
import {YouTubeResponse} from 'types/webcam';
import {Alert} from 'react-native';
import i18n from 'i18n';

const GoogleViewModel = () => {
  const dispatch = useDispatch();

  const onRetrieveSuccess = useCallback((data: YouTubeResponse) => {
    console.log('On login success', data);
  }, []);

  const onRetrieveError = useCallback(() => {
    Alert.alert(i18n.t('txtError'), i18n.t('msgError'));
  }, []);

  const onLoginGoogle = useCallback(async () => {
    dispatch(
      configsActions.retrieveStreamKey(
        undefined,
        onRetrieveSuccess,
        onRetrieveError,
      ),
    );
  }, [dispatch, onRetrieveError, onRetrieveSuccess]);

  return useMemo(() => {
    return {onLoginGoogle};
  }, [onLoginGoogle]);
};

export default GoogleViewModel;
