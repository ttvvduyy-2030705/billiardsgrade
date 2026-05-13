import React, {memo} from 'react';

import RestaurantAdminDashboardScreen from '../restaurant-admin-dashboard';
import {Navigation} from 'types/navigation';

type Props = Navigation & {
  adminUsername?: string;
};

const RestaurantAdminTablesScreen = (props: Props) => {
  return (
    <RestaurantAdminDashboardScreen
      {...props}
      initialAdminTab="tables"
      adminPageMode="single"
      adminPageTitle="QR"
    />
  );
};

export default memo(RestaurantAdminTablesScreen);
