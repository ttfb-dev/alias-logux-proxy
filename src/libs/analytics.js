import { logger } from './logger';

const analytics = {
  setStepWordsGuessed: async (userId, stepWords) => {
    await stepWords.forEach(async (stepWord) => {
      await logger.analytics('word.guessing_result', userId, {
        word: stepWord.value,
        guessed: stepWord.guessed,
      });
    });
  },
};

export default analytics;
