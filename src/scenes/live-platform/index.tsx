import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {memo, useCallback, useContext, useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, StatusBar, StyleSheet, Switch, useWindowDimensions, View} from 'react-native';

import images from 'assets';
import AppImage from 'components/Image';
import Container from 'components/Container';
import Text from 'components/Text';
import {LanguageContext} from 'context/language';
import {screens} from 'scenes/screens';
import {Navigation} from 'types/navigation';

import facebookLogo from './facebook.png';
import youtubeLogo from './youtube.png';

export interface Props extends Navigation {}
export const CURRENT_PLATFORM_KEY = '@current_livestream_platform';

type PlatformKey = 'facebook' | 'youtube' | 'device';
type PlatformItem = {key: PlatformKey; label: string; image?: any; isAccent?: boolean};

const LivePlatform = (props: any) => {
  const {language} = useContext(LanguageContext);
  const {width, height} = useWindowDimensions();
  const [saveToDeviceWhileStreaming, setSaveToDeviceWhileStreaming] = useState(false);
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 768;
  const isCompact = width < 980;

  const localized = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Choose livestream platform',
        subtitle: 'Choose where to stream, then continue to the match settings.',
        deviceLabel: 'Save to device',
        saveBadge: 'Save',
        switchTitle: 'Stream and save video',
        switchDescription: 'Turn on to livestream and save the video to device storage at the same time.',
      };
    }

    return {
      title: 'Chọn nền tảng livestream',
      subtitle: 'Chọn nơi phát trực tiếp rồi tiếp tục vào cài đặt trận đấu.',
      deviceLabel: 'Lưu vào bộ nhớ máy',
      saveBadge: 'Lưu',
      switchTitle: 'Vừa live vừa lưu video',
      switchDescription: 'Bật để livestream và đồng thời lưu video vào bộ nhớ máy.',
    };
  }, [language]);

  const ui = useMemo(() => ({horizontalPadding: isTablet ? 24 : 18, topGap: isTablet ? 18 : 14, gridGap: isTablet ? 16 : 12, iconSize: isTablet ? 66 : 56, titleSize: isTablet ? 16 : 14, subtitleSize: isTablet ? 13 : 12}), [isTablet]);
  const platformItems: PlatformItem[] = useMemo(() => [{key:'facebook', label:'Facebook', image:facebookLogo}, {key:'youtube', label:'YouTube', image:youtubeLogo}, {key:'device', label:localized.deviceLabel, isAccent:true}], [localized.deviceLabel]);

  const onBack = useCallback(() => { if (typeof props?.goBack === 'function') { props.goBack(); return; } if (typeof props?.navigation?.goBack === 'function') { props.navigation.goBack(); } }, [props]);

  const onSelectPlatform = useCallback(async (platform: PlatformKey) => {
    if (platform === 'device') {
      await AsyncStorage.removeItem(CURRENT_PLATFORM_KEY);
      props.navigate?.(screens.gameSettings, {livestreamPlatform: platform, saveToDeviceWhileStreaming});
      return;
    }
    await AsyncStorage.setItem(CURRENT_PLATFORM_KEY, platform);
    const params = {livestreamPlatform: platform, saveToDeviceWhileStreaming};
    if (platform === 'facebook') { props.navigate?.(screens.livePlatformSetupFacebook, params); return; }
    props.navigate?.(screens.livePlatformSetupYoutube, params);
  }, [props, saveToDeviceWhileStreaming]);

  return (
    <Container style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={false} />
      <View style={styles.headerGlow}>
        <Pressable
          onPress={onBack}
          style={styles.headerBackButton}
          android_ripple={{color:'rgba(255,255,255,0.08)', borderless:false}}>
          <View style={styles.headerBackFrame}>
            <View style={styles.headerBackInner}>
  <AppImage
    source={require('../../assets/images/logo-back.png')}
    resizeMode="contain"
    style={{width: 18, height: 18, marginRight: 8}}
  />
  <AppImage
    source={images.logoSmall || images.logo}
    resizeMode="contain"
    style={styles.headerBackLogoImage}
  />
</View>
          </View>
        </Pressable>
        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text color={'#FFFFFF'} style={styles.headerTitle}>{localized.title}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{paddingHorizontal: ui.horizontalPadding, paddingTop: ui.topGap}}>
          <Text color={'#8C8C8C'} fontSize={ui.subtitleSize}>{localized.subtitle}</Text>
          <View style={[styles.grid, {marginTop: ui.topGap, flexDirection: isCompact ? 'column' : 'row'}]}>
            {platformItems.map(item => <Pressable key={item.key} onPress={() => onSelectPlatform(item.key)} style={[styles.card, item.isAccent && styles.cardAccent, isCompact ? styles.cardStacked : styles.cardInline, {marginBottom: isCompact ? ui.gridGap : 0, marginRight: !isCompact && item.key !== 'device' ? ui.gridGap : 0}]}>
              {item.image ? <Image source={item.image} resizeMode="contain" style={{width: ui.iconSize, height: ui.iconSize, marginBottom: 16}} /> : <View style={styles.deviceBadge}><Text color={'#FFFFFF'} fontWeight={'900'} fontSize={18}>{localized.saveBadge}</Text></View>}
              <Text color={'#FFFFFF'} style={styles.cardTitle}>{item.label}</Text>
            </Pressable>)}
          </View>
          <View style={[styles.switchBox, {marginTop: ui.topGap}]}>
            <View style={styles.switchTextWrap}><Text color={'#FFFFFF'} style={styles.switchTitle}>{localized.switchTitle}</Text><Text color={'#8C8C8C'} style={styles.switchDescription}>{localized.switchDescription}</Text></View>
            <Switch value={saveToDeviceWhileStreaming} onValueChange={setSaveToDeviceWhileStreaming} trackColor={{false:'#2A2A2A', true:'#C91D24'}} thumbColor={saveToDeviceWhileStreaming ? '#FFFFFF' : '#BDBDBD'} ios_backgroundColor="#2A2A2A" />
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  screen:{flex:1, backgroundColor:'#000000', paddingHorizontal:22, paddingTop:12, paddingBottom:22},
  content:{flexGrow:1, paddingBottom:8},
  headerGlow:{minHeight:70, borderRadius:24, borderWidth:1.25, borderColor:'rgba(255, 52, 52, 0.28)', backgroundColor:'#050505', flexDirection:'row', alignItems:'center', justifyContent:'center', paddingHorizontal:18, position:'relative', shadowColor:'#FF1414', shadowOpacity:0.45, shadowRadius:20, shadowOffset:{width:0,height:8}, elevation:12},
  headerBackButton:{position:'absolute', left:18, top:9, bottom:9, justifyContent:'center', zIndex:2},
  headerBackFrame:{height:52, minWidth:116, paddingHorizontal:16, borderRadius:16, borderWidth:1.25, borderColor:'rgba(255, 52, 52, 0.28)', backgroundColor:'#070707', justifyContent:'center', shadowColor:'#FF1414', shadowOpacity:0.18, shadowRadius:10, shadowOffset:{width:0,height:4}, elevation:6, transform:[{skewX:'-16deg'}]},
  headerBackInner:{flexDirection:'row', alignItems:'center', justifyContent:'center', transform:[{skewX:'16deg'}]},
  headerBackArrow:{color:'#FFFFFF', fontSize:22, fontWeight:'900', marginRight:10},
  headerBackLogoImage:{width:72,height:28},
  headerTitleWrap:{position:'absolute', left:0, right:0, alignItems:'center', justifyContent:'center', paddingHorizontal:146, pointerEvents:'none'},
  logoButton:{width:120, justifyContent:'center', alignItems:'flex-start', paddingVertical:6}, logoImage:{width:92,height:34}, headerTitle:{color:'#FFFFFF',textAlign:'center',fontSize:26,fontWeight:'800'}, headerSpacer:{width:120},
  grid:{alignItems:'stretch'}, card:{flex:1, minHeight:178, borderRadius:24, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', backgroundColor:'#050505', alignItems:'center', justifyContent:'center', padding:20}, cardInline:{}, cardStacked:{width:'100%'}, cardAccent:{backgroundColor:'#8F1318', borderColor:'rgba(255,255,255,0.12)'}, deviceBadge:{width:72,height:72,borderRadius:36,backgroundColor:'rgba(255,255,255,0.08)',alignItems:'center',justifyContent:'center',marginBottom:16}, cardTitle:{color:'#FFFFFF', fontSize:16, fontWeight:'800', textAlign:'center'},
  switchBox:{backgroundColor:'#050505', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:24, paddingHorizontal:18, paddingVertical:18, flexDirection:'row', alignItems:'center', justifyContent:'space-between'}, switchTextWrap:{flex:1, paddingRight:12}, switchTitle:{color:'#FFFFFF', fontSize:16, fontWeight:'800'}, switchDescription:{color:'#8C8C8C', marginTop:6, lineHeight:18},
});

export default memo(LivePlatform);
