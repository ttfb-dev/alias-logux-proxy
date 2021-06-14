module.exports = {
  extends: ['airbnb-base', 'plugin:import/recommended', 'prettier'],

  env: {
    node: true,
  },

  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
};
