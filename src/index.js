import dotenv from 'dotenv';

import { hooks } from './httpModules';
import { server } from './init';
import { httpServer, port } from './initHttpServer.js';

dotenv.config();

server.autoloadModules();
server.listen();

hooks.renewDatasets(httpServer, server);

httpServer.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log(`http server is listening on ${port}`);
});
