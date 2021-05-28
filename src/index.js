import dotenv from 'dotenv';

dotenv.config();

//получаем сервер
import { server } from './initServer.js';

import { open, room, team, profile } from './modules/index.js';

open(server);

room(server);

team(server);

profile(server);

server.listen();
