import { json, text } from 'body-parser';
import express from 'express';

const httpServer = express();
httpServer.use(text);
httpServer.use(json);
const port = 80;

export { httpServer, port };
