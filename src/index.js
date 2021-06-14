import dotenv from 'dotenv';

export { base, game, profile, room, team } from './modules/index.js';
import { server } from './init.js';

dotenv.config();

base(server);
game(server);
profile(server);
room(server);
teams(server);

server.listen();
