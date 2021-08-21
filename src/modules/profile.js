import { logger } from '../libs';
import { profileService } from '../services';

const profile = (server) => {
  server.type('profile/get_game_datasets', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      const datasets = await profileService.getDatasetsWithStatus(userId);

      ctx.sendBack({
        type: 'profile/get_game_datasets_success',
        datasets,
      });
    },
  });

  server.type('profile/activate_dataset', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const { datasetId } = action;

      const isActive = await profileService.isDatasetActive(userId, datasetId);
      const isAvailable = await profileService.isDatasetAvailable(
        userId,
        datasetId,
      );

      return !isActive && isAvailable;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const { id } = action;

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
      const userId = parseInt(ctx.userId, 10);
      const { datasetId } = action;

      const isActive = await profileService.isDatasetActive(userId, datasetId);

      return isActive;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const { id } = action;

      await profileService.deactivateDatasetId(userId, datasetId);

      const datasets = await profileService.getDatasetsWithStatus(userId);

      ctx.sendBack({
        type: 'profile/deactivate_dataset_success',
        datasets,
      });
    },
  });

  server.type('profile/toggle_dataset', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const { id } = action;

      ctx.data = { userId, id };

      return true;
    },
    async process(ctx, action, meta) {
      const { userId, id } = ctx.data;

      try {
        await profileService.toggleSet(userId, id);
      } catch ({ message }) {
        logger.critical(message, {
          type: 'profile/toggle_dataset',
          action,
          id: ctx.id,
          userId: ctx.userId,
        });
        server.undo(action, meta);
      }
    },
  });

  //событие обновления списка наборов профиля
  server.type('profile/datasets_changed', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return { user: String(action.userId) };
    },
  });
};

export default profile;
