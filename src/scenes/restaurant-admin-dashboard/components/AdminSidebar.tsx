import React, {memo} from 'react';
import {Pressable, Text as RNText, View as RNView} from 'react-native';

export type AdminDashboardTab = 'orders' | 'menu';

type Props = {
  activeTab: AdminDashboardTab;
  onChangeTab: (tab: AdminDashboardTab) => void;
  styles: any;
};

const tabs: Array<{id: AdminDashboardTab; label: string; icon: string; hint: string}> = [
  {id: 'orders', label: 'Đơn hàng', icon: 'Đ', hint: 'Tiếp nhận & xử lý'},
  {id: 'menu', label: 'Quản lý món', icon: 'M', hint: 'Sản phẩm & giá'},
];

const AdminSidebar = ({activeTab, onChangeTab, styles}: Props) => {
  return (
    <RNView style={styles.sidebar}>
      <RNView style={styles.sidebarHeader}>
        <RNText style={styles.sidebarTitle}>Điều hướng</RNText>
        <RNText style={styles.sidebarHint}>POS Admin</RNText>
      </RNView>

      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChangeTab(tab.id)}
            style={[styles.sidebarItem, active ? styles.sidebarItemActive : null]}>
            <RNText style={[styles.sidebarIcon, active ? styles.sidebarIconActive : null]}>{tab.icon}</RNText>
            <RNView style={styles.sidebarTextBlock}>
              <RNText style={[styles.sidebarLabel, active ? styles.sidebarLabelActive : null]}>
                {tab.label}
              </RNText>
              <RNText style={styles.sidebarItemHint}>{tab.hint}</RNText>
            </RNView>
          </Pressable>
        );
      })}
    </RNView>
  );
};

export default memo(AdminSidebar);
