import { GDatasets, UDatasets } from '@ttfb/aliasgame';

import { logger } from './logger';

const gdatasets = new GDatasets(logger);
const udatasets = new UDatasets(logger);

export { gdatasets, udatasets };
