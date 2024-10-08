import React, {memo} from 'react';
import View from 'components/View';
import Image from 'components/Image';
import images from 'assets';

import {Player} from 'types/player';
import {GameSettings} from 'types/settings';

import styles from './styles';

interface Props {
  gameSettings?: GameSettings;
  player: Player;
}

const ExtraTimeTurns = (props: Props) => {
  if (
    !props.gameSettings?.mode?.extraTimeTurns ||
    props.gameSettings?.mode?.extraTimeTurns === 'infinity' ||
    props.gameSettings?.mode?.mode === 'fast' ||
    (props.player.proMode?.extraTimeTurns as number) === 0
  ) {
    return <View />;
  }

  return (
    <View style={styles.extraTimeTurnsContainer} marginRight={'15'}>
      <View
        style={styles.extraTimeTurnsWrapper}
        justify={'center'}
        alignItems={'end'}>
        {Array.from(
          {length: (props.player.proMode?.extraTimeTurns as number) || 0},
          (_, i) => {
            return (
              <View
                key={`extra-time-turns-${i}`}
                style={styles.extraTimeTurn}
                alignItems={'end'}>
                <Image
                  source={images.game.addTime}
                  style={styles.extraTimeIcon}
                  resizeMode={'contain'}
                />
              </View>
            );
          },
        )}
      </View>
    </View>
  );
};

export default memo(ExtraTimeTurns);
