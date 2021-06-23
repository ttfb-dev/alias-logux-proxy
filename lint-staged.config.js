module.exports = {
  '{*.js,*.ts}': ['yarn lint:eslint', 'yarn lint:prettier'],
  '{!(package)*.json,*.code-snippets,': ['yarn lint:prettier --parser json'],
  'package.json': ['yarn lint:prettier'],
  '*.md': ['yarn lint:prettier'],
};
