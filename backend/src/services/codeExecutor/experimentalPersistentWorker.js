'use strict';

const path = require('path');
const { Worker } = require('worker_threads');

const WORKER_PATH = path.join(__dirname, 'experimentalPersistentWorkerThread.js');

class ExperimentalPersistentWorkerPool {
  constructor({ size = 2, timeoutMs = 1000 } = {}) {
    this.size = size;
    this.timeoutMs = timeoutMs;
    this.workers = [];
    this.pending = [];
    this.nextJobId = 1;
    this.activeJobs = new Map();
  }

  async start() {
    for (let index = 0; index < this.size; index += 1) {
      this.workers.push(this.createWorker());
    }
    await Promise.all(this.workers.map(worker => worker.ready));
  }

  createWorker() {
    const state = {
      worker: new Worker(WORKER_PATH),
      busy: false,
      ready: null,
      currentJobId: null,
    };

    state.ready = new Promise((resolve, reject) => {
      state.resolveReady = resolve;
      state.rejectReady = reject;
    });

    state.worker.on('message', message => {
      if (message.type === 'ready') {
        state.resolveReady();
        return;
      }

      const job = this.activeJobs.get(message.jobId);
      if (!job) return;

      this.activeJobs.delete(message.jobId);
      state.busy = false;
      state.currentJobId = null;
      clearTimeout(job.timer);
      job.resolve(message.result);
      this.dispatch();
    });

    state.worker.on('error', error => {
      if (state.currentJobId !== null) {
        const job = this.activeJobs.get(state.currentJobId);
        if (job) {
          this.activeJobs.delete(state.currentJobId);
          clearTimeout(job.timer);
          job.reject(error);
        }
      }
      state.rejectReady(error);
    });

    return state;
  }

  loadChallenge(challengeId, hiddenCode) {
    return Promise.all(this.workers.map(state => new Promise((resolve, reject) => {
      const listener = message => {
        if (message.type !== 'loaded' || message.challengeId !== challengeId) return;
        state.worker.off('message', listener);
        resolve(message);
      };
      state.worker.on('message', listener);
      state.worker.postMessage({ type: 'load', challengeId, hiddenCode });
      setTimeout(() => {
        state.worker.off('message', listener);
        reject(new Error('Challenge compilation timed out'));
      }, this.timeoutMs);
    })));
  }

  execute(challengeId, userInput) {
    return new Promise((resolve, reject) => {
      this.pending.push({ challengeId, userInput, resolve, reject });
      this.dispatch();
    });
  }

  dispatch() {
    for (const state of this.workers) {
      if (state.busy || this.pending.length === 0) continue;

      const job = this.pending.shift();
      const jobId = this.nextJobId++;
      state.busy = true;
      state.currentJobId = jobId;

      const timer = setTimeout(() => {
        this.activeJobs.delete(jobId);
        state.busy = false;
        state.currentJobId = null;
        job.resolve({
          success: false,
          output: '',
          error: { code: 'EXECUTION_TIMEOUT', message: 'Execution timed out.' },
        });
        this.dispatch();
      }, this.timeoutMs + 100);

      this.activeJobs.set(jobId, { resolve: job.resolve, reject: job.reject, timer });
      state.worker.postMessage({
        type: 'execute',
        jobId,
        challengeId: job.challengeId,
        userInput: job.userInput,
        timeoutMs: this.timeoutMs,
      });
    }
  }

  async close() {
    await Promise.all(this.workers.map(state => state.worker.terminate()));
    this.workers = [];
  }
}

module.exports = { ExperimentalPersistentWorkerPool };
