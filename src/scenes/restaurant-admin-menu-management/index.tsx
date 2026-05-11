import React, {memo} from 'react';

import RestaurantAdminDashboardScreen from '../restaurant-admin-dashboard';
import {Navigation} from 'types/navigation';

type Props = Navigation & {
  adminUsername?: string;
};

const RestaurantAdminMenuManagementScreen = (props: Props) => {
  return (
    <RestaurantAdminDashboardScreen
      {...props}
      initialAdminTab="menu"
      adminPageMode="single"
      adminPageTitle="Quản lý món"
    />
  );
};

export default memo(RestaurantAdminMenuManagementScreen);
