import { Datasets, GDatasets, UDatasets } from '@ttfb/aliasgame';

import { logger } from './logger';

const datasets = new Datasets(logger);
const gdatasets = new GDatasets(logger);
const udatasets = new UDatasets(logger);

export { datasets, gdatasets, udatasets };
