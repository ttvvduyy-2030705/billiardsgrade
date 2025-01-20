import * as RNLocalize from 'react-native-localize';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {I18n} from 'i18n-js';
import Numeral from 'numeral';
import 'numeral/locales';

import vi from './vi';
import en from './en';

const i18n = new I18n({vi, en});

export const LANGUAGES = ['vi', 'en'];
const systemLocale = RNLocalize.getLocales()[0];

export const loadLanguage = async () => {


  const currentLanguage = await AsyncStorage.getItem('language');
  console.log("lang " + currentLanguage);
  
  const language = currentLanguage
    ? currentLanguage
    : ['vi', 'en'].includes(systemLocale.languageCode)
    ? 'vi'
    : 'vi';

  Numeral.locale(language);
  Tts.setDefaultLanguage(language);
  i18n.locale = language;
  i18n.defaultLocale = 'vi';
  i18n.translations = {vi, en};

  return language;
};

export const setLanguage = language => {
  i18n.defaultLocale = language;
  i18n.locale = language;
  Numeral.locale(language);
  AsyncStorage.setItem('language', language);
  Tts.setDefaultLanguage(language);
};

export default i18n;
