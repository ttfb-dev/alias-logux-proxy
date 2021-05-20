module.exports = {
  extends: ['airbnb', 'plugin:import/recommended', 'prettier'],

  env: {
    node: true,
  },

  parserOptions: {
    ecmaVersion: 11,
  },

  // plugins: ['prettier'],

  rules: {
    'linebreak-style': 0,
    'import/prefer-default-export': 0,
    'react/prop-types': 0,
  },
};
