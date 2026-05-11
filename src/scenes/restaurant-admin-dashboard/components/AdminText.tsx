import React, {memo} from 'react';
import {Text as NativeText, TextProps} from 'react-native';

const AdminText = (props: TextProps) => {
  return (
    <NativeText allowFontScaling={false} maxFontSizeMultiplier={1} {...props} />
  );
};

export default memo(AdminText);
