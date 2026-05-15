import React, {memo} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';
import {useAppTranslation} from 'utils/appI18n';

export type AdminDashboardTab = 'orders' | 'menu' | 'tables';

type Props = {
  activeTab: AdminDashboardTab;
  onChangeTab: (tab: AdminDashboardTab) => void;
  styles: any;
};

const tabs: Array<{
  id: AdminDashboardTab;
  labelKey: string;
  iconKey: string;
  hintKey: string;
}> = [
  {id: 'orders', labelKey: 'restaurantAdmin.orders', iconKey: 'restaurantAdmin.ordersIcon', hintKey: 'restaurantAdmin.ordersHint'},
  {id: 'menu', labelKey: 'restaurantAdmin.menuManagement', iconKey: 'restaurantAdmin.menuIcon', hintKey: 'restaurantAdmin.menuHint'},
  {id: 'tables', labelKey: 'restaurantAdmin.qr', iconKey: 'restaurantAdmin.qrIcon', hintKey: 'restaurantAdmin.qrHint'},
];

const AdminSidebar = ({activeTab, onChangeTab, styles}: Props) => {
  const t = useAppTranslation();

  return (
    <RNView style={styles.sidebar}>
      <RNView style={styles.sidebarHeader}>
        <RNText style={styles.sidebarTitle}>{t('restaurantAdmin.navigation')}</RNText>
        <RNText style={styles.sidebarHint}>{t('restaurantAdmin.posAdmin')}</RNText>
      </RNView>

      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            hitSlop={10}
            android_ripple={{color: 'rgba(255,255,255,0.08)'}}
            onPressIn={() => onChangeTab(tab.id)}
            onPress={() => onChangeTab(tab.id)}
            style={({pressed}) => [
              styles.sidebarItem,
              active ? styles.sidebarItemActive : null,
              pressed ? styles.sidebarItemPressed : null,
            ]}>
            <RNText
              style={[
                styles.sidebarIcon,
                active ? styles.sidebarIconActive : null,
              ]}>
              {t(tab.iconKey)}
            </RNText>
            <RNView style={styles.sidebarTextBlock}>
              <RNText
                style={[
                  styles.sidebarLabel,
                  active ? styles.sidebarLabelActive : null,
                ]}>
                {t(tab.labelKey)}
              </RNText>
              <RNText style={styles.sidebarItemHint}>{t(tab.hintKey)}</RNText>
            </RNView>
          </Pressable>
        );
      })}
    </RNView>
  );
};

export default memo(AdminSidebar);
