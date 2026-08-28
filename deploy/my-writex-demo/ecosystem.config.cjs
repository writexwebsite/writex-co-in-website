"use strict";

const port = Number(process.env.MY_WRITEX_DEMO_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("MY_WRITEX_DEMO_PORT is not a valid isolated listener.");
}

module.exports = {
  apps: [
    {
      name: "my-writex-demo",
      cwd: "/var/www/my-writex-demo/current",
      script: "node_modules/next/dist/bin/next",
      node_args: "--env-file=/var/www/my-writex-demo/shared/.env.demo",
      args: `start -H 127.0.0.1 -p ${port}`,
      env: { NODE_ENV: "production", APP_ENV: "demo" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,
      error_file: "/var/www/my-writex-demo/logs/pm2-error.log",
      out_file: "/var/www/my-writex-demo/logs/pm2-out.log",
    },
  ],
};
