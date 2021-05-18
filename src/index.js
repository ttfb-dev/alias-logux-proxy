import dotenv from 'dotenv';

dotenv.config();

//получаем сервер
import { server } from './initServer.js';

import { open } from './modules/index.js';

open(server);

server.listen();
