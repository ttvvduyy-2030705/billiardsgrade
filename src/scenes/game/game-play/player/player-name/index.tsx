import React, {memo, useEffect, useMemo, useRef} from 'react';
import {TextInput as RNTextInput} from 'react-native';
import View from 'components/View';
import colors from 'configuration/colors';
import Button from 'components/Button';
import Image from 'components/Image';
import images from 'assets';
import {responsiveDimension} from 'utils/helper';
import {Player} from 'types/player';
import styles from './styles';

interface Props {
  totalPlayers?: number;
  player: Player;
  nameEditable: boolean;
  onChangeName: (value: string) => void;
  onToggleEditName: () => void;
}

const PlayerName = (props: Props) => {
  const inputRef = useRef<RNTextInput>(null);
  const isMultiPlayerLayout = (props.totalPlayers ?? 0) > 2;

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    if (props.nameEditable) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      return () => clearTimeout(timeout);
    }

    inputRef.current.blur();
  }, [props.nameEditable]);

  const metrics = useMemo(() => {
    if (isMultiPlayerLayout) {
      return {
        containerHeight: responsiveDimension(56),
        inputHeight: responsiveDimension(36),
        fontSize: responsiveDimension(24),
        lineHeight: responsiveDimension(28),
        horizontalPadding: responsiveDimension(14),
      };
    }

    return {
      containerHeight: responsiveDimension(72),
      inputHeight: responsiveDimension(46),
      fontSize: responsiveDimension(34),
      lineHeight: responsiveDimension(40),
      horizontalPadding: responsiveDimension(16),
    };
  }, [isMultiPlayerLayout]);

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        color: colors.white,
        fontWeight: '700',
        borderBottomColor: props.nameEditable ? '#FF4040' : colors.transparent,
        height: metrics.inputHeight,
        fontSize: metrics.fontSize,
        lineHeight: metrics.lineHeight,
      },
    ],
    [metrics.fontSize, metrics.inputHeight, metrics.lineHeight, props.nameEditable],
  );

  return (
    <View
      style={{
        height: metrics.containerHeight,
        paddingHorizontal: metrics.horizontalPadding,
      }}
      direction={'row'}
      alignItems={'center'}
      marginTop={'4'}
      marginBottom={'4'}>
      <View style={styles.inputWrapper}>
        <RNTextInput
          ref={inputRef}
          style={inputStyle}
          value={props.player.name ?? ''}
          onChangeText={props.onChangeName}
          editable={props.nameEditable}
          autoCorrect={false}
          autoCapitalize="words"
          selectTextOnFocus={props.nameEditable}
          underlineColorAndroid="transparent"
          selectionColor={'#FF4040'}
          placeholderTextColor={'#8E9099'}
          multiline={false}
          numberOfLines={1}
          textAlignVertical="center"
        />
      </View>

      <Button style={styles.buttonEdit} onPress={props.onToggleEditName}>
        <Image source={images.game.edit} style={styles.editIcon} />
      </Button>
    </View>
  );
};

export default memo(PlayerName);
