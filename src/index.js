import dotenv from 'dotenv';

import httpModules from './httpModules';
import { server } from './init';
import { httpServer, port } from './initHttpServer';

dotenv.config();

server.autoloadModules();
server.listen();

httpModules.hooks(httpServer, server);
httpModules.metrics(httpServer);

httpServer.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log(`http server is listening on ${port}`);
});
