export interface Logger {
  warn: (message: string, metadata?: Record<string, unknown>) => void;
}

export const noopLogger: Logger = {
  warn: () => undefined,
};

export function createLogger(): Logger {
  return {
    warn(message, metadata) {
      console.warn(message, metadata ?? {});
    },
  };
}
