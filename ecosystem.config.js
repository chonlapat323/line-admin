module.exports = {
  apps: [
    {
      name: 'line-admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3003',
      cwd: '/root/line-admin',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=300',
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
