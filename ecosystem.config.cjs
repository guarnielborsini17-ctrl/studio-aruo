module.exports = {
  apps: [
    {
      name: 'studio-aruo-api',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server/index.ts',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
      max_memory_restart: '512M',
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      time: true,
    },
  ],
};
