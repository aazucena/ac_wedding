// directus-sync configuration
// https://github.com/tractr/directus-sync

'use strict';

module.exports = {
  directusUrl: process.env.DIRECTUS_URL ?? 'http://localhost:8055',
  directusToken: process.env.DIRECTUS_ADMIN_TOKEN,
  syncPath: './sync',
};
