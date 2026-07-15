"use strict";

module.exports = {
  apps: [
    {
      name: "writex-co-in",
      cwd: "/var/www/writex-co-in/current",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3002",
      env: {
        NODE_ENV: "production",
        APP_ENV: "production"
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,
      error_file: "/var/www/writex-co-in/logs/pm2-error.log",
      out_file: "/var/www/writex-co-in/logs/pm2-out.log"
    }
  ]
};
