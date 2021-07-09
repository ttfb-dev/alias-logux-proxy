import { text } from 'body-parser';
import express from 'express';

const httpServer = express();
httpServer.use(text);
const port = 80;

export { httpServer, port };
