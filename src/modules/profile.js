import { profileService, roomService } from '../services';

const profile = (server) => {
  server.type('profile/get_game_datasets', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);

      const datasets = await profileService.getDatasetsWithStatus(userId);

      ctx.sendBack({
        type: 'profile/get_game_datasets_success',
        datasets,
      });
    },
  });

  server.type('profile/activate_dataset', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      const isActive = await profileService.isDatasetActive(userId, datasetId);
      const isAvailable = await profileService.isDatasetAvailable(
        userId,
        datasetId,
      );

      return !isActive && isAvailable;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      await profileService.activateDatasetId(userId, datasetId);

      const datasets = await profileService.getDatasetsWithStatus(userId);

      ctx.sendBack({
        type: 'profile/activate_dataset_success',
        datasets,
      });
    },
  });

  server.type('profile/deactivate_dataset', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      const isActive = await profileService.isDatasetActive(userId, datasetId);

      return isActive;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      await profileService.deactivateDatasetId(userId, datasetId);

      const datasets = await profileService.getDatasetsWithStatus(userId);

      ctx.sendBack({
        type: 'profile/deactivate_dataset_success',
        datasets,
      });
    },
  });

  //событие покупки набора слов в комнате
  server.type('profile/buy_game_dataset_success', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      console.log('resend to user');
      return {users: [action.userId]};
    },
  });
};

export default profile;
