import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Image, Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import images from 'assets';
import ImageComponent from 'components/Image';
import Container from 'components/Container';
import i18n from 'i18n';
import {screens} from 'scenes/screens';

import CategorySettings from './category';
import PlayerSettings from './player';
import GameSettingsViewModel, {Props} from './SettingsViewModel';
import useAdaptiveLayout from '../useAdaptiveLayout';
import useScreenSystemUI, {configureSystemUI} from 'theme/systemUI';
import createStyles from './styles';
import {
  COUNTRIES,
  getCountryFlagImageUri,
  normalizeCountryName,
} from './player/countries';

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

const GameSettings = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});
  const viewModel = GameSettingsViewModel(props);
  const adaptive = useAdaptiveLayout();
  const styles = React.useMemo(() => createStyles(adaptive), [adaptive]);
  const isEnglish = getLocale().startsWith('en');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryKeyword, setCountryKeyword] = useState('');
  const [countryPlayerIndex, setCountryPlayerIndex] = useState<number | null>(null);

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

  const reapplyFullscreenSystemUI = useCallback(() => {
    configureSystemUI({
      animated: false,
      barStyle: 'light-content',
      backgroundColor: 'transparent',
    });
  }, []);

  const openCountryPicker = useCallback((index: number) => {
    reapplyFullscreenSystemUI();
    setCountryPlayerIndex(index);
    setCountryKeyword('');
    setCountryPickerVisible(true);
  }, [reapplyFullscreenSystemUI]);

  const closeCountryPicker = useCallback(() => {
    setCountryPickerVisible(false);
    setCountryKeyword('');
    setCountryPlayerIndex(null);
    reapplyFullscreenSystemUI();
  }, [reapplyFullscreenSystemUI]);

  const filteredCountries = useMemo(() => {
    const keyword = normalizeCountryName(countryKeyword);

    if (!keyword) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(item => {
      return (
        item.normalizedName.includes(keyword) ||
        normalizeCountryName(item.name).includes(keyword) ||
        item.code.toLowerCase().includes(keyword)
      );
    });
  }, [countryKeyword]);

  return (
    <Container style={styles.screen}>

      <View style={styles.headerGlow}>
        <Pressable
          onPress={viewModel.onCancel}
          style={styles.headerBackButton}
          android_ripple={{color: 'rgba(255,255,255,0.08)', borderless: false}}>
          <View style={styles.headerBackFrame}>
            <View style={styles.headerBackInner}>
              <ImageComponent
                source={require('../../../assets/images/logo-back.png')}
                resizeMode="contain"
                style={{width: 18, height: 18, marginRight: 8}}
              />
              <ImageComponent
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
                onOpenCountryPicker={openCountryPicker}
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

      {countryPickerVisible ? (
        <View style={styles.countryPickerLayer} pointerEvents="box-none">
          <Pressable style={styles.countryPickerOverlay} onPress={closeCountryPicker}>
            <Pressable style={styles.countryPickerCard} onPress={() => {}}>
              <Text style={styles.countryPickerTitle}>
                {isEnglish ? 'Select country' : 'Chọn quốc gia'}
              </Text>

              <TextInput
                value={countryKeyword}
                onChangeText={setCountryKeyword}
                placeholder={isEnglish ? 'Search country...' : 'Tìm quốc gia...'}
                placeholderTextColor="#8E8E8E"
                autoCorrect={false}
                autoCapitalize="words"
                autoFocus={false}
                onFocus={reapplyFullscreenSystemUI}
                style={styles.countrySearchInput}
              />

              <FlatList
                data={filteredCountries}
                keyExtractor={item => item.code}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.countryList}
                renderItem={({item}) => {
                  const displayFlag = item.flag || '🏳️';
                  const displayFlagImage = getCountryFlagImageUri(item.code, 80);

                  return (
                    <Pressable
                      style={({pressed}) => [
                        styles.countryItem,
                        pressed && styles.countryItemPressed,
                      ]}
                      onPress={() => {
                        if (countryPlayerIndex !== null) {
                          viewModel.onSelectPlayerCountry(
                            {
                              ...item,
                              flag: displayFlag,
                            },
                            countryPlayerIndex,
                          );
                        }
                        closeCountryPicker();
                      }}>
                      {displayFlagImage ? (
                        <View style={styles.countryFlagFrame}>
                          <Image
                            source={{uri: displayFlagImage}}
                            resizeMode="cover"
                            fadeDuration={0}
                            style={styles.countryFlagImage}
                          />
                        </View>
                      ) : (
                        <Text style={styles.countryFlag}>{displayFlag}</Text>
                      )}
                      <Text style={styles.countryName}>{item.name}</Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.countryEmptyText}>
                    {isEnglish ? 'No result found' : 'Không tìm thấy kết quả'}
                  </Text>
                }
              />
            </Pressable>
          </Pressable>
        </View>
      ) : null}
    </Container>
  );
};

export default GameSettings;
