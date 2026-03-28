import React, {memo} from 'react';
import {Switch as RNSwitch} from 'react-native';
import SwitchViewModel, {Props} from './SwitchViewModel';

const Switch = (props: Props) => {
  const viewModel = SwitchViewModel(props);

  return (
    <RNSwitch value={viewModel.value} onValueChange={viewModel.onToggle} />
  );
};

export default memo(Switch);
