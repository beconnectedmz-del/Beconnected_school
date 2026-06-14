'use strict';

const cluster = require('cluster');
const os = require('os');

const WORKERS = parseInt(process.env.NODE_CLUSTER_WORKERS || '4');

if (cluster.isPrimary) {
  console.log(`[streaming] Master ${process.pid} starting ${WORKERS} workers`);
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code) => {
    console.log(`[streaming] Worker ${worker.process.pid} died (code ${code}), restarting...`);
    cluster.fork();
  });
} else {
  require('./server');
}
