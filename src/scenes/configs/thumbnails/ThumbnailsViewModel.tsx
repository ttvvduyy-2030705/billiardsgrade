import AsyncStorage from '@react-native-community/async-storage';
import {keys} from 'configuration/keys';
import {useCallback, useEffect, useMemo, useState} from 'react';

const ThumbnailsViewModel = () => {
  const [showOnLiveStream, setShowOnLiveStream] = useState<boolean>();

  useEffect(() => {
    AsyncStorage.getItem(
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      (error, result) => {
        if (error) {
          console.log('Failed to get SHOW_THUMBNAILS_ON_LIVESTREAM', error);
          return;
        }

        setShowOnLiveStream(
          typeof result === 'string' ? (result === '1' ? true : false) : true,
        );
      },
    );
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      showOnLiveStream ? '1' : '0',
    );
  }, [showOnLiveStream]);

  const onToggleShowOnLiveStream = useCallback(() => {
    setShowOnLiveStream(prev => !prev);
  }, []);

  return useMemo(() => {
    return {showOnLiveStream, onToggleShowOnLiveStream};
  }, [showOnLiveStream, onToggleShowOnLiveStream]);
};

export default ThumbnailsViewModel;
