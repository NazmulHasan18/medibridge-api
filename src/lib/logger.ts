import { createLogger, format, transports } from "winston";
import { config } from "../config/index.js";

const isDevelopment = config.nodeEnv !== "production";

const logger = createLogger({
  level: isDevelopment ? "debug" : "info",

  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),

  defaultMeta: {
    service: "hospital-management-api",
  },

  transports: [
    new transports.Console({
      format: isDevelopment
        ? format.combine(
            format.colorize(),
            format.timestamp({
              format: "HH:mm:ss",
            }),
            format.printf(({ timestamp, level, message, stack }) => {
              return `${timestamp} ${level}: ${stack || message}`;
            }),
          )
        : format.json(),
    }),

    new transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    new transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

export default logger;
