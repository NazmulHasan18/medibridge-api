export interface JobConfig {
  name: string;
  schedule: string;
  timezone?: string;
  runOnInit?: boolean;
}

export type JobHandler = () => Promise<void>;

export interface Job {
  start: () => void;
  stop: () => void;
}
