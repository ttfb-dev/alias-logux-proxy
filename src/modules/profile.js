import { ProfileService, WordService } from '../services/index.js';

const profileService = new ProfileService();
const wordService = new WordService();

const profile = (server) => {
  
  server.type('profile/get_game_datasets', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);

      const datasets = await wordService.getLangGameDatasets('ru');

      const purchasedIds = await profileService.getPurchasedDatasetIds(userId);

      const activeIds = await profileService.getActiveDatasetIds(userId);

      const datasetsWithStatus = wordService.mapDatasetsWithStatus(activeIds, purchasedIds, datasets);


      ctx.sendBack({
        type: 'profile/get_game_datasets_success',
        datasetsWithStatus,
      });
    },
  });
  
  server.type('profile/get_purchases', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);

      const purchases = await profileService.getPurchasedDatasetsList(userId);

      ctx.sendBack({
        type: 'profile/get_purchases_success',
        purchases,
      });
    },
  });

  server.type('profile/buy_game_dataset', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      const purchases = await profileService.addPurchasedDataset(userId, datasetId);

      ctx.sendBack({
        type: 'profile/buy_game_dataset_success',
        purchases,
      });
    },
  });
};

export { profile };