import dotenv from 'dotenv';

dotenv.config();

//получаем сервер
import { server } from './initServer.js';

import { open, room, team, game, profile } from './modules/index.js';

open(server);

room(server);

team(server);

game(server);

profile(server);

server.listen();
