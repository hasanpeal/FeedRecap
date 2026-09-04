import winston from "winston";
import LokiTransport from "winston-loki";

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
];

if (process.env.LOKI_URL) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { app: "feedrecap-server" },
      json: true,
      replaceTimestamp: true,
      onConnectionError: (err: unknown) =>
        console.error("[Loki] connection error:", err),
    })
  );
}

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
