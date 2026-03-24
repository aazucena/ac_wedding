// directus-sync configuration for production transfer
// https://github.com/tractr/directus-sync

'use strict';

module.exports = {
  directusUrl: process.env.TRANSFER_URL,
  directusToken: process.env.TRANSFER_TOKEN,
  dumpPath: './transfer',
  seedPath: './transfer/seed',
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
