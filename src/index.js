import dotenv from 'dotenv';

import { server } from './init.js';

dotenv.config();

server.autoloadModules();
server.listen();
