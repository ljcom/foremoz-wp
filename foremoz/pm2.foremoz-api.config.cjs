const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'foremoz-eventdb',
      cwd: path.resolve(__dirname, 'apps/eventdb/mvp-node'),
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-api',
      cwd: path.resolve(__dirname, 'apps/api'),
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-passport-api',
      cwd: path.resolve(__dirname, 'apps/passport/apps/api'),
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
