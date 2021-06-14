import dotenv from 'dotenv';

import { base, game, profile, room, team } from './modules/index.js';
import { server } from './init.js';

dotenv.config();

base(server);
game(server);
profile(server);
room(server);
team(server);

server.listen();
