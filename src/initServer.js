//тут всё для создания сервера, результат работы - переменная server
import { Server } from '@logux/server';

const isDev = process.env.NODE_ENV === 'development';

const server = new Server(
  Server.loadOptions(process, {
    host: isDev ? '127.0.0.1' : '0.0.0.0',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
  }),
);

server.auth(async (userId, token) => {
  return true;
});

export {
  server,
};
