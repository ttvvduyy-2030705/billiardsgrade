import React, {memo, useMemo, ReactNode} from 'react';
import {Text as RNText, TextStyle, LayoutChangeEvent} from 'react-native';
import {responsiveFontSize} from 'utils/helper';

import colors from 'configuration/colors';
import {getSelectedFont} from 'configuration/fonts';

interface TextProps {
  children: ReactNode;
  style?: TextStyle | TextStyle[];
  fontWeight?:
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
    | 'bold'
    | 'normal';
  fontStyle?: 'normal' | 'italic';
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
  letterSpacing?: number;
  ellipsizeMode?: 'clip' | 'head' | 'middle' | 'tail';
  textAlign?: 'center' | 'justify' | 'left' | 'right';
  color?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}

const Text = (props: TextProps) => {
  const {
    children,
    style,
    fontWeight = 'normal',
    fontStyle = 'normal',
    fontSize = 14,
    lineHeight,
    numberOfLines,
    letterSpacing,
    ellipsizeMode = 'tail',
    textAlign = 'left',
    color = colors.lightBlack,
    onLayout,
  } = props;

  const textStyle = useMemo(() => {
    const propStyle = {
      textAlign,
      fontStyle,
      fontSize: responsiveFontSize(fontSize),
    };

    const result = [style, propStyle];

    if (color) {
      result.push({color});
    }

    if (lineHeight) {
      result.push({lineHeight});
    }

    if (fontWeight === 'bold') {
      result.push({fontFamily: getSelectedFont('Nunito-Regular', 'bold')});
    }

    if (letterSpacing) {
      result.push({letterSpacing});
    }

    return result;
  }, [
    style,
    fontWeight,
    fontStyle,
    fontSize,
    lineHeight,
    textAlign,
    color,
    letterSpacing,
  ]);

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      onLayout={onLayout}>
      {children}
    </RNText>
  );
};

export default memo(Text);
