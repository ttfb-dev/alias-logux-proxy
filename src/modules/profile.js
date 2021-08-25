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
      const id = parseInt(action.id, 10);

      const isActive = await profileService.isDatasetActive(userId, id);
      const isAvailable = await profileService.isDatasetAvailable(userId, id);

      return !isActive && isAvailable;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const id = parseInt(action.id, 10);

      await profileService.activateDatasetId(userId, id);

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
      const id = parseInt(action.id, 10);

      const isActive = await profileService.isDatasetActive(userId, id);

      return isActive;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const id = parseInt(action.id, 10);

      await profileService.deactivateDatasetId(userId, id);

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

  server.type('profile/is_onboarding_finished', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      try {
        const isFinished = await profileService.isOnboardingFinished(userId);

        ctx.sendBack({
          type: 'profile/is_onboarding_finished_success',
          isFinished,
        });
      } catch ({ message }) {
        logger.critical(message, {
          type: 'profile/is_onboarding_finished',
          action,
          userId: ctx.userId,
        });
      }
    },
  });

  server.type('profile/set_onboarding_finished', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      try {
        await profileService.setOnboardingFinished(userId);
      } catch ({ message }) {
        logger.critical(message, {
          type: 'profile/set_onboarding_finished',
          action,
          userId: ctx.userId,
        });
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
