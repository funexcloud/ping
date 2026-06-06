'use strict';

console.log(
  '[ping-express] boot',
  process.version,
  'PORT=',
  process.env.PORT,
  'PING_EXPRESS_API_ONLY=',
  process.env.PING_EXPRESS_API_ONLY,
);

process.on('uncaughtException', (err) => {
  console.error('[ping-express] uncaughtException', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[ping-express] unhandledRejection', err);
  process.exit(1);
});

require('../server.js');
