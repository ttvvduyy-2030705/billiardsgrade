import AsyncStorage from '@react-native-async-storage/async-storage';
import {keys} from 'configuration/keys';
import {useCallback, useEffect, useMemo, useState} from 'react';

const ThumbnailsViewModel = () => {
  const [showOnLiveStream, setShowOnLiveStream] = useState<boolean | undefined>(
    undefined,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      (error, result) => {
        if (!mounted) {
          return;
        }

        if (error) {
          console.log('Failed to get SHOW_THUMBNAILS_ON_LIVESTREAM', error);
          setShowOnLiveStream(true);
          setIsReady(true);
          return;
        }

        setShowOnLiveStream(
          typeof result === 'string' ? (result === '1' ? true : false) : true,
        );
        setIsReady(true);
      },
    );

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || typeof showOnLiveStream !== 'boolean') {
      return;
    }

    AsyncStorage.setItem(
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      showOnLiveStream ? '1' : '0',
    );
  }, [isReady, showOnLiveStream]);

  const onToggleShowOnLiveStream = useCallback(() => {
    setShowOnLiveStream(prev => {
      if (typeof prev !== 'boolean') {
        return true;
      }
      return !prev;
    });
  }, []);

  return useMemo(() => {
    return {showOnLiveStream, onToggleShowOnLiveStream};
  }, [showOnLiveStream, onToggleShowOnLiveStream]);
};

export default ThumbnailsViewModel;
