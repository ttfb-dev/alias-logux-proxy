import dotenv from 'dotenv';

// import { base, game, profile, room, team } from './modules';
import { server } from './init';

dotenv.config();

// base(server);
// game(server);
// profile(server);
// room(server);
// team(server);

server.autoloadModules();
server.listen();
