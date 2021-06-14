import { Server } from '@logux/server';
import { isVkAuthorized } from './midlewares/index.js';
import { logger, prs } from './libs/index.js';
import parser from 'ua-parser-js';

const isProd = process.env.NODE_ENV === 'production';

const server = new Server(
  Server.loadOptions(process, {
    host: isProd ? '0.0.0.0' : '127.0.0.1',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
  }),
);

const clientPool = [];

server.auth(async ({ client, userId, token }) => {
  const isAuthorized = isVkAuthorized(userId, token);
  console.log(`auth ${client.clientId}`);

  await logger.debug('server.auth', { isAuthorized, userId });

  if (isAuthorized) {
    await prs.setUserParam(userId, 'last_connect', { value: Date.now() });

    const device = parser(client.httpHeaders['user-agent']);

    if (client.clientId) {
      clientPool[client.clientId] = {
        clientId: client.clientId,
        userId,
        connectedAt: Date.now(),
        device,
      }
    }
  }

  return isAuthorized;
});

server.on('disconnected', (client) => {
  console.log(`disconnected ${client.clientId}`);

});

export { server };
