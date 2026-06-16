module.exports = {
  apps: [
    {
      name: 'line-admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3003',
      cwd: '/root/line-admin',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
