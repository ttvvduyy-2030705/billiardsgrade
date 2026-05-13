'use strict';

const clone = value => JSON.parse(JSON.stringify(value));

const createSeedDatabase = () => ({
  meta: {
    schemaVersion: 'scoremenu_backend_schema_v1_batch25',
    generatedAt: new Date().toISOString(),
  },
  restaurants: [],
  branches: [],
  tables: [],
  categories: [],
  items: [],
  orders: [],
  billSessions: [],
  auditLogs: [],
  publicOrderRateLimits: [],
  carts: {},
  imageUploads: [],
  adminUsers: [],
});

module.exports = {
  createSeedDatabase,
  seedDatabase: createSeedDatabase(),
  clone,
};
