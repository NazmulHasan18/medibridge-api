import { appointmentReminderJob } from "./appointments/reminderJob.js";
import { Job } from "./base/types.js";

const jobs: Job[] = [appointmentReminderJob];

export const startJobs = () => jobs.forEach((j) => j.start());
export const stopJobs = () => jobs.forEach((j) => j.stop());
