import bodyParser from 'body-parser';
import express from 'express';

const httpServer = express();
httpServer.use(bodyParser.json());
const port = 80;

export { httpServer, port };
