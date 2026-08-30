/** Structured logger. Never log secrets, passwords or payment credentials. */

function serialize(meta: unknown): string {
  if (meta instanceof Error) {
    return `${meta.name}: ${meta.message}\n${meta.stack ?? ""}`;
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), message, meta: meta === undefined ? undefined : serialize(meta) }));
  },
  warn(message: string, meta?: unknown) {
    console.warn(JSON.stringify({ level: "warn", time: new Date().toISOString(), message, meta: meta === undefined ? undefined : serialize(meta) }));
  },
  error(message: string, meta?: unknown) {
    console.error(JSON.stringify({ level: "error", time: new Date().toISOString(), message, meta: meta === undefined ? undefined : serialize(meta) }));
  }
};
