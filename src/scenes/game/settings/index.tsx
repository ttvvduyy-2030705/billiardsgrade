import React from 'react';
import {Pressable, ScrollView, StatusBar, Text, View} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import Container from 'components/Container';
import i18n from 'i18n';
import {screens} from 'scenes/screens';

import CategorySettings from './category';
import PlayerSettings from './player';
import GameSettingsViewModel, {Props} from './SettingsViewModel';
import useAdaptiveLayout from '../useAdaptiveLayout';
import {
  getScreenProfile,
  setScreenProfile,
  subscribeScreenProfile,
  hydrateScreenProfile,
  ScreenProfile,
} from '../screenProfileStore';
import createStyles from './styles';

const getLocale = () => {
  const maybeCurrentLocale =
    typeof (i18n as any)?.currentLocale === 'function'
      ? (i18n as any).currentLocale()
      : '';

  return String((i18n as any)?.locale ?? maybeCurrentLocale ?? '').toLowerCase();
};

const getFallbackLabel = (key: string, vi: string, en: string) => {
  const translated = i18n.t(key as never);
  if (translated && translated !== key && !String(translated).includes('[missing')) {
    return translated as string;
  }

  return getLocale().startsWith('en') ? en : vi;
};


const SCREEN_PROFILE_OPTIONS: Array<{
  value: ScreenProfile;
  label: string;
  description: string;
}> = [
  {value: 'auto', label: 'Tự động', description: 'Tự nhận diện theo màn hiện tại'},
  {value: 'compact7', label: '7 inch / nhỏ', description: 'Co mạnh hơn cho máy ngang thấp'},
  {value: 'tablet12', label: '12 inch / tablet', description: 'Giữ bố cục tablet cân bằng'},
  {value: 'display24', label: '24 inch / màn lớn', description: 'Ưu tiên giao diện lớn, thoáng'},
];

const GameSettings = (props: Props) => {
  const viewModel = GameSettingsViewModel(props);
  const adaptive = useAdaptiveLayout();
  const styles = React.useMemo(() => createStyles(adaptive), [adaptive]);
  const isEnglish = getLocale().startsWith('en');
  const [screenProfile, setScreenProfileState] = React.useState<ScreenProfile>(getScreenProfile());

  React.useEffect(() => {
    const unsubscribe = subscribeScreenProfile(setScreenProfileState);
    void hydrateScreenProfile().then(setScreenProfileState).catch(() => {});
    return unsubscribe;
  }, []);

  const translatedTitle = i18n.t(screens.gameSettings as never);
  const title =
    translatedTitle && translatedTitle !== screens.gameSettings && !String(translatedTitle).includes('[missing')
      ? (translatedTitle as string)
      : isEnglish
        ? 'Game Settings'
        : 'Cài đặt trận đấu';

  const configTitle = isEnglish ? 'Mode' : 'Chế độ';
  const playerTitle = isEnglish ? 'Players' : 'Người chơi';

  const cancelText = getFallbackLabel('txtCancel', 'Hủy', 'Cancel');
  const startText = getFallbackLabel('txtStart', 'Bắt đầu', 'Start');
  const displayTitle = isEnglish ? 'Display Profile' : 'Cấu hình màn hình';
  const displayHint = isEnglish
    ? 'Auto detect first. If the device still looks too big or too small, choose a profile manually.'
    : 'Ưu tiên để tự động. Nếu máy vẫn hiển thị chưa chuẩn thì chọn profile tay bên dưới.';
  const displayMeta = `${Math.round(adaptive.width)} × ${Math.round(adaptive.height)} • ${adaptive.isLandscape ? (isEnglish ? 'Landscape' : 'Ngang') : isEnglish ? 'Portrait' : 'Dọc'} • ${adaptive.aspectRatio.toFixed(2)}`;

  return (
    <Container style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={false}
      />

      <View style={styles.headerGlow}>
        <Pressable
          onPress={viewModel.onCancel}
          style={styles.headerBackButton}
          android_ripple={{color: 'rgba(255,255,255,0.08)', borderless: false}}>
          <View style={styles.headerBackFrame}>
            <View style={styles.headerBackInner}>
  <Image
    source={require('../../../assets/images/logo-back.png')}
    resizeMode="contain"
    style={{width: 18, height: 18, marginRight: 8}}
  />
  <Image
    source={images.logoSmall || images.logo}
    resizeMode="contain"
    style={styles.headerBackLogoImage}
  />
</View>
          </View>
        </Pressable>

        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={[styles.panelShell, styles.leftPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>{configTitle}</Text>
          </View>

          <ScrollView
            style={styles.panelScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.panelScrollContent}>
            <View style={styles.displayCard}>
              <Text style={styles.displayCardTitle}>{displayTitle}</Text>
              <Text style={styles.displayCardHint}>{displayHint}</Text>
              <Text style={styles.displayCardMeta}>{displayMeta}</Text>

              <View style={styles.profileGrid}>
                {SCREEN_PROFILE_OPTIONS.map(option => {
                  const selected = option.value === screenProfile;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setScreenProfileState(option.value);
                        void setScreenProfile(option.value);
                      }}
                      style={({pressed}) => [
                        styles.profileChip,
                        selected && styles.profileChipActive,
                        pressed && styles.profileChipPressed,
                      ]}>
                      <Text
                        style={[
                          styles.profileChipLabel,
                          selected && styles.profileChipLabelActive,
                        ]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.profileChipDescription,
                          selected && styles.profileChipDescriptionActive,
                        ]}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <CategorySettings
              adaptive={adaptive}
              showTitle={false}
              category={viewModel.category}
              gameMode={viewModel.gameMode}
              gameSettingsMode={viewModel.gameSettingsMode}
              extraTimeTurnsEnabled={viewModel.extraTimeTurnsEnabled}
              countdownEnabled={viewModel.countdownEnabled}
              warmUpEnabled={viewModel.warmUpEnabled}
              extraTimeBonusEnabled={viewModel.extraTimeBonusEnabled}
              onSelectCategory={viewModel.onSelectCategory}
              onSelectGameMode={viewModel.onSelectGameMode}
              onSelectExtraTimeTurns={viewModel.onSelectExtraTimeTurns}
              onSelectCountdown={viewModel.onSelectCountdown}
              onSelectWarmUp={viewModel.onSelectWarmUp}
              onSelectExtraTimeBonus={viewModel.onSelectExtraTimeBonus}
            />
          </ScrollView>
        </View>

        <View style={[styles.panelShell, styles.rightPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>{playerTitle}</Text>
          </View>

          <View style={styles.rightPanelContent}>
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.playerScrollContent}>
              <PlayerSettings
                adaptive={adaptive}
                showTitle={false}
                gameMode={viewModel.gameMode}
                category={viewModel.category}
                playerSettings={viewModel.playerSettings}
                onSelectPlayerNumber={viewModel.onSelectPlayerNumber}
                onSelectPlayerGoal={viewModel.onSelectPlayerGoal}
                onChangePlayerName={viewModel.onChangePlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
                onSelectPlayerCountry={viewModel.onSelectPlayerCountry}
              />
            </ScrollView>

            <View style={styles.footerInside}>
              <Pressable
                onPress={viewModel.onCancel}
                style={({pressed}) => [
                  styles.footerButton,
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>

              <Pressable
                onPress={viewModel.onStart}
                style={({pressed}) => [
                  styles.footerButton,
                  styles.startButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.startText}>{startText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Container>
  );
};

export default GameSettings;
