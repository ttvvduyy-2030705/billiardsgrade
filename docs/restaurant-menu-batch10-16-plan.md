# Restaurant Menu - Revised Batch 10 to Batch 16

This document replaces the old Batch 10/11 ending plan for the Menu module.

The old Batch 10 created a Repository/API interface, which is still the right foundation, but it was not enough for real restaurant usage because it did not define a multi-restaurant scope. A production Menu system must guarantee that restaurant A, restaurant B, their admins, tables, menus, and orders are fully separated.

## Revised rollout

### Batch 10 - Repository/API interface, multi-restaurant ready

Goal: Keep the app running with LocalRepository, but make the data contract ready for backend, restaurant isolation, table QR join, and realtime order sync.

Included in this batch:

- `RestaurantMenuRepository` now has active restaurant context methods.
- New workspace types: `RestaurantWorkspace`, `RestaurantBranch`, `RestaurantTable`, `RestaurantMenuContext`.
- Menu/category/item/order/cart payloads now support `restaurantId`, `branchId`, and `tableId` where needed.
- `ApiRestaurantMenuRepository` now uses scoped endpoints like `/restaurants/:restaurantId/menu/items` instead of global `/menu/items`.
- `LocalRestaurantMenuRepository` still uses local AsyncStorage, but stores an active restaurant context so current demo builds do not break.
- Admin session can keep the active restaurant id/name for the next backend/auth step.

Acceptance:

- Current demo/local menu still runs.
- The API repository contract can clearly route data by `restaurantId`.
- Future server work will not need to redesign the client-side repository contract.

### Batch 11 - Multi-restaurant model

Goal: Make restaurant identity a real model in app state and local demo data.

Needed:

- Restaurant list screen or admin workspace selector.
- Admin can create/select a restaurant workspace.
- Category, dish, order, cart, table data must be filtered by active `restaurantId`.
- Old local records without `restaurantId` must migrate safely to `local_demo_restaurant`.

### Batch 12 - Backend Menu server

Goal: Build the real server for multi-restaurant Menu.

Needed endpoints:

- Auth/admin session.
- Restaurants/workspaces.
- Branches and tables.
- Categories and menu items.
- Orders and payments.
- QR/table token resolution.

### Batch 13 - Connect app to ApiRepository

Goal: Replace local demo repository with API repository when server config is enabled.

Needed:

- API base URL config.
- Auth token injection.
- Error/loading states for network failures.
- Fallback handling if API is not configured.

### Batch 14 - QR/table/customer join

Goal: Customer opens the correct restaurant menu through a QR/table token.

Needed:

- Admin generates QR/table token per table.
- Customer resolves token to `restaurantId`, `tableId`, and `tableNumber`.
- Customer menu loads only that restaurant's menu.
- Order payload includes the correct table/restaurant scope.

### Batch 15 - Realtime order admin

Goal: Admin receives orders in realtime.

Needed:

- WebSocket/SSE/polling channel scoped by `restaurantId`.
- Customer order submit notifies admin dashboard.
- Order status/payment updates sync back to customer if needed.

### Batch 16 - Multi-restaurant isolation test

Goal: Verify that no restaurant can see or mutate another restaurant's data.

Checklist examples:

- Admin A creates menu A; Admin B must not see it.
- Customer scanning QR A sees only menu A.
- Customer scanning QR B sees only menu B.
- Order from table A goes only to Admin A.
- Payment/order status updates do not leak across restaurants.
