import cron from "node-cron";
import { JobConfig, JobHandler, Job } from "./types.js";
import logger from "../../lib/logger.js";

export function createJob(config: JobConfig, handler: JobHandler): Job {
  let task: ReturnType<typeof cron.schedule> | null = null;

  return {
    start() {
      task = cron.schedule(
        config.schedule,
        async () => {
          logger.info(`[Job] ${config.name} started`);
          try {
            await handler();
            logger.info(`[Job] ${config.name} completed`);
          } catch (err) {
            logger.error(`[Job] ${config.name} failed`, err);
          }
        },
        { timezone: config.timezone ?? "Asia/Dhaka", noOverlap: true },
      );
    },
    stop() {
      task?.stop();
    },
  };
}
