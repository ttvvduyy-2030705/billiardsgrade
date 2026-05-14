module.exports = {
  apps: [
    {
      name: 'scoremenu-api',
      cwd: '/opt/scoremenu/backend/scoremenu-server',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env_file: '/etc/scoremenu/scoremenu.env',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/scoremenu/scoremenu-api-error.log',
      out_file: '/var/log/scoremenu/scoremenu-api-out.log',
      time: true,
    },
  ],
};
