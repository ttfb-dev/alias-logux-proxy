import { Datasets, UDatasets } from '@ttfb/aliasgame';

import { logger } from './logger';

const datasets = new Datasets(logger);
const udatasets = new UDatasets(logger);

export { datasets, udatasets };
