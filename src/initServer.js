//тут всё для создания сервера, результат работы - переменная server
import { Server } from '@logux/server';
import { isVkAuthorized } from './midlewares/index.js';

const isProd = process.env.NODE_ENV === 'production';

const server = new Server(
  Server.loadOptions(process, {
    host: isProd ? '0.0.0.0' : '127.0.0.1',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
  }),
);

server.auth(async ({userId, token}) => {
  // console.log(params)
  return isVkAuthorized(token);
});

export {
  server,
};
