import React, {memo} from 'react';

import RestaurantAdminDashboardScreen from '../restaurant-admin-dashboard';
import {Navigation} from 'types/navigation';

type Props = Navigation & {
  adminUsername?: string;
};

const RestaurantAdminOrdersScreen = (props: Props) => {
  return (
    <RestaurantAdminDashboardScreen
      {...props}
      initialAdminTab="orders"
      adminPageMode="single"
      adminPageTitle="Đơn hàng"
    />
  );
};

export default memo(RestaurantAdminOrdersScreen);
