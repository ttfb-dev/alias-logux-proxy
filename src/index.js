import dotenv from 'dotenv';

dotenv.config();

//получаем сервер
import { server } from './initServer.js';

import { open, room } from './modules/index.js';

open(server);

room(server);

server.listen();
