module.exports = {
  apps: [
    {
      name: 'foremoz-eventdb',
      cwd: '/Users/samuelsurya/androidCode/paper/foremoz-wp/eventdb/mvp-node',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-api',
      cwd: '/Users/samuelsurya/androidCode/paper/foremoz-wp/foremoz/apps/api',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'foremoz-passport-api',
      cwd: '/Users/samuelsurya/androidCode/paper/foremoz-wp/passport/apps/api',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
