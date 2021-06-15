import dotenv from 'dotenv';

import { server } from './init';

dotenv.config();

server.autoloadModules();
server.listen();
