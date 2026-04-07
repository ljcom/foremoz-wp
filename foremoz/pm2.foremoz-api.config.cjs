module.exports = {
  apps: [
    {
      name: 'foremoz-eventdb',
      cwd: '/opt/apps/foremoz-wp/eventdb/mvp-node',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-api',
      cwd: '/opt/apps/foremoz-wp/foremoz/apps/api',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-passport-api',
      cwd: '/opt/apps/foremoz-wp/passport/apps/api',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
