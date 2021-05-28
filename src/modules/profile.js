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

      const datasets = await wordService.getGameDatasets();

      ctx.sendBack({
        type: 'room/get_game_datasets_success',
        datasets,
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
        type: 'room/get_purchases_success',
        purchases,
      });
    },
  });

  server.type('profile/buy_dataset', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { lang, key } = action;

      const dataset = await wordService.getGameDataset(lang, key)

      const purchases = await profileService.addPurchasedDataset(userId, dataset);

      ctx.sendBack({
        type: 'room/get_purchases_success',
        purchases,
      });
    },
  });
};

export { profile };