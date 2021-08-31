import express from 'express';

const httpServer = express();
httpServer.use(express.text());
httpServer.use(express.json());
const port = 80;

export { httpServer, port };
