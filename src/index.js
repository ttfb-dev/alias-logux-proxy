import dotenv from 'dotenv';

dotenv.config();

//получаем сервер
import { server } from './initServer.js';

server.listen();
