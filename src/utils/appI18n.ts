import {useCallback, useContext} from 'react';

import i18n from 'i18n';
import {LanguageContext} from 'context/language';

export type AppI18nOptions = Record<string, string | number | boolean | undefined | null>;
export type AppTranslate = (key: string, options?: AppI18nOptions) => string;

export const translateApp = (key: string, options?: AppI18nOptions) =>
  String(i18n.t(key, options as any));

export const useAppTranslation = (): AppTranslate => {
  const {language} = useContext(LanguageContext);

  return useCallback(
    (key: string, options?: AppI18nOptions) =>
      String(i18n.t(key, options as any)),
    [language],
  );
};

export const getAppLocale = () =>
  String(i18n.locale || i18n.defaultLocale || 'vi').toLowerCase();

export const formatVnd = (value: number) => {
  const locale = getAppLocale().startsWith('en') ? 'en-US' : 'vi-VN';
  return `${Math.max(0, Number(value || 0)).toLocaleString(locale)}đ`;
};
