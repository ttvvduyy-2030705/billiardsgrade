import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import styles from './styles';
import Video, {VideoRef} from 'react-native-video';

export interface VideoListItemProps {
    index: number
    time?: string;
    path: string;
    onPress: ((index: number) => void); 
  }
  
const VideoListItem = (props: VideoListItemProps ) => {
  return (
    <TouchableOpacity style={[styles.itemContainer, props.index == props.index ? styles.selectITem :  styles.unselectItem]} onPress={() => {
      props.onPress(props.index)
    }}>
      <View style={styles.details}>
      <Video style={{width:40, height:40}}
          // Can be a URL or a local file.
          source={{uri: props.path}}
          // Store reference  
         // ref={videoRef}
          // Callback when remote video is buffering                                      
          //onBuffer={onBuffer}
          // Callback when video cannot be loaded  
                      
        />
        <Text style={styles.duration}>{props.time}</Text>
        {/* Add a video title Text component here if needed */}
      </View>
    </TouchableOpacity>
  );
}; 

export default VideoListItem;
