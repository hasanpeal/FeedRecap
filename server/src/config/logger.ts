import winston from "winston";

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports,
});

const toMessage = (args: unknown[]) =>
  args
    .map((arg) =>
      typeof arg === "string" ? arg : arg instanceof Error ? arg.stack : JSON.stringify(arg)
    )
    .join(" ");

console.log = (...args: unknown[]) => logger.info(toMessage(args));
console.info = (...args: unknown[]) => logger.info(toMessage(args));
console.warn = (...args: unknown[]) => logger.warn(toMessage(args));
console.error = (...args: unknown[]) => logger.error(toMessage(args));

export default logger;
