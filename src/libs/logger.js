import { Logger } from '@ttfb/aliasgame';

const host = process.env.LOGGER_HOST;
const loguxService = 'logux-proxy';

const logger = new Logger(host, loguxService);

export { logger };
