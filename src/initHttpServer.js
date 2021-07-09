import bodyParser from 'body-parser';
import express from 'express';

const httpServer = express();
httpServer.use(bodyParser.text());
const port = 80;

export { httpServer, port };
