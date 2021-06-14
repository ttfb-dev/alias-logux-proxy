import { Server } from '@logux/server';
import { isVkAuthorized } from './midlewares/index.js';
import { logger, prs } from './libs/index.js';

const isProd = process.env.NODE_ENV === 'production';

const server = new Server(
  Server.loadOptions(process, {
    host: isProd ? '0.0.0.0' : '127.0.0.1',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
  }),
);

server.auth(async ({ client, headers, userId, token }) => {
  const isAuthorized = isVkAuthorized(userId, token);

  await logger.debug('server.auth', { isAuthorized, userId });

  console.log(client, headers);

  if (isAuthorized) {
    await prs.setUserParam(userId, 'last_connect', { value: Date.now() });
  }

  return isAuthorized;
});

export { server };
