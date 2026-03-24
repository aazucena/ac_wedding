// directus-sync configuration
// https://github.com/tractr/directus-sync

'use strict';

module.exports = {
  directusUrl: process.env.PUBLIC_URL ?? 'http://localhost:8055',
  directusEmail: process.env.ADMIN_EMAIL,
  directusPassword: process.env.ADMIN_PASSWORD,
  dumpPath: './sync',
  seedPath: './sync/seed',
  preserveIds: '*',
  collectionsPath: 'collections',
  collections: true,
  maxPushRetries: 20,
  snapshotPath: 'snapshot',
  snapshot: true,
  split: true,
  specsPath: 'specs',
  specs: true,
};
