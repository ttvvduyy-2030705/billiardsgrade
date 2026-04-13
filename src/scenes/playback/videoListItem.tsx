import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Video from 'react-native-video';

import {responsiveDimension} from 'utils/helper';

import styles from './styles';

export interface VideoListItemProps {
  index: number;
  time?: string;
  path: string;
  onPress: (index: number) => void;
  currentIndex: number;
}

const thumbnailSize = responsiveDimension(40);

const VideoListItem = (props: VideoListItemProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        props.index === props.currentIndex
          ? styles.selectITem
          : styles.unselectItem,
      ]}
      onPress={() => {
        props.onPress(props.index);
      }}>
      <View style={styles.details}>
        <Video
          style={{width: thumbnailSize, height: thumbnailSize}}
          source={{uri: props.path}}
        />
        <Text style={styles.duration}>{props.time}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default VideoListItem;
