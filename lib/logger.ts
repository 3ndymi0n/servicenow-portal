type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level:   LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level, message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };

  if (process.env["NODE_ENV"] === "production") {
    // Structured JSON in production (consumed by log aggregators)
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const prefix = { debug:"🐛", info:"ℹ️ ", warn:"⚠️ ", error:"🚨" }[level];
    const msg = `${prefix} [${entry.timestamp}] ${message}`;
    if (level === "error") console.error(msg, context ?? "");
    else if (level === "warn")  console.warn(msg, context ?? "");
    else console.log(msg, context ?? "");
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => log("info",  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log("warn",  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};
