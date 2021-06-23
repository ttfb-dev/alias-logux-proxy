import { Server } from '@logux/server';
import parser from 'ua-parser-js';

import { logger, prs } from './libs';
import { isVkAuthorized } from './midlewares';

const isProd = process.env.NODE_ENV === 'production';

const server = new Server(
  Server.loadOptions(process, {
    host: isProd ? '0.0.0.0' : '127.0.0.1',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
    root: './src',
  }),
);

const clientPool = [];

server.auth(async ({ client, userId, token }) => {
  const isAuthorized = isVkAuthorized(userId, token);

  await logger.debug('server.auth', { isAuthorized, userId });

  if (isAuthorized) {
    await prs.setUserParam(userId, 'last_connect', { value: Date.now() });

    const device = parser(client.httpHeaders['user-agent']);
    await logger.analytics('client.authorized', client.userId, { ...device });

    if (client.clientId) {
      clientPool[client.clientId] = Date.now();
    }
  }

  return isAuthorized;
});

server.on('disconnected', async (client) => {
  try {
    if (clientPool[client.clientId]) {
      const device = parser(client.httpHeaders['user-agent']);
      const duration = Date.now() - clientPool[client.clientId];
      delete clientPool[client.clientId];
      await logger.analytics('client.disconnected', client.userId, {
        ...device,
        duration,
      });
    }
  } catch (e) {
    await logger.critical(e.message, { type: 'server_on_disconnected' });
  }
});

export { server };
