import { logger } from './logger';

const analytics = {
  setStepWordsGuessed: async (stepWords) => {
    await stepWords.forEach(async (stepWord) => {
      await logger.analytics('word.guessing_result', '', {
        word: stepWord.value,
        guessed: stepWord.guessed,
      });
    });
  },
};

export default analytics;
