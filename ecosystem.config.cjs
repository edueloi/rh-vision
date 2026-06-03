module.exports = {
  apps: [
    {
      name: "triagem-smart",
      script: "server.ts",
      interpreter: "node",
      interpreter_args: "--import tsx/esm",
      cwd: "/var/www/triagem-smart",
      env: {
        NODE_ENV: "production",
        PORT: 3021,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/var/log/pm2/triagem-smart-error.log",
      out_file: "/var/log/pm2/triagem-smart-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
