//тут всё для создания сервера, результат работы - переменная server
import { Server } from '@logux/server';
const { resolve, join } = require('path');

const isProd = process.env.NODE_ENV === 'production';

let credentials = {};
if (isProd) {
  credentials.cert = resolve(join(process.env.SSL_CERT_DIR, 'nastavnichestvo.org.crt'));
  credentials.key = resolve(join(process.env.SSL_CERT_DIR, 'nastavnichestvo.org.key'));
}

const server = new Server(
  Server.loadOptions(process, {
    host: isProd ? '0.0.0.0' : '127.0.0.1',
    port: 31337,
    subprotocol: '1.0.0',
    supports: '1.0.0',
    ...credentials,
  }),
);

server.auth(async (userId, token) => {
  return true;
});

export {
  server,
};
