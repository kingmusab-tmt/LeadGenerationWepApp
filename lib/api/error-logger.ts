import { ErrorCode } from "./error-handler";

// ============================================
// ERROR LOGGING SERVICE
// ============================================

export interface ErrorLogEntry {
  timestamp: string;
  level: "error" | "warn" | "info";
  code: ErrorCode | string;
  message: string;
  path?: string;
  method?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  log(entry: Omit<ErrorLogEntry, "timestamp">): void {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output with formatting
    this.consoleLog(logEntry);

    // In production, send to external service
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Log error with automatic context extraction
   */
  logError(
    error: unknown,
    context?: {
      path?: string;
      method?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.log({
      level: "error",
      code: this.extractErrorCode(error),
      message: errorMessage,
      stack: errorStack,
      ...context,
    });
  }

  /**
   * Log warning
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log({
      level: "warn",
      code: "WARN",
      message,
      metadata,
    });
  }

  /**
   * Log info
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log({
      level: "info",
      code: "INFO",
      message,
      metadata,
    });
  }

  /**
   * Get recent logs (for admin dashboard)
   */
  getRecentLogs(limit = 100): ErrorLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get logs by filter
   */
  getFilteredLogs(filter: {
    level?: ErrorLogEntry["level"];
    code?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ErrorLogEntry[] {
    return this.logs.filter((log) => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.code && log.code !== filter.code) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.startDate && new Date(log.timestamp) < filter.startDate)
        return false;
      if (filter.endDate && new Date(log.timestamp) > filter.endDate)
        return false;
      return true;
    });
  }

  /**
   * Clear old logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: unknown): string {
    if (error && typeof error === "object") {
      if ("code" in error && typeof error.code === "string") {
        return error.code;
      }
      if ("name" in error && typeof error.name === "string") {
        return error.name;
      }
    }
    return "UNKNOWN_ERROR";
  }

  /**
   * Format and output to console
   */
  private consoleLog(entry: ErrorLogEntry): void {
    const prefix = this.getLevelPrefix(entry.level);

    const logMessage = [
      `${prefix} [${entry.code}]`,
      entry.message,
      entry.path ? `at ${entry.method || "?"} ${entry.path}` : "",
      entry.userId ? `(User: ${entry.userId})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // In Node.js, we can use console methods directly
    switch (entry.level) {
      case "error":
        console.error(logMessage, entry.stack || "");
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
    }

    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log("  Metadata:", entry.metadata);
    }
  }

  /**
   * Send to external logging service
   */
  private sendToExternalService(entry: ErrorLogEntry): void {
    const loggingEndpoint = process.env.LOGGING_ENDPOINT;
    const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL;

    if (loggingEndpoint) {
      void fetch(loggingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch((error) => {
        console.warn("[ErrorLogger] Failed to send log to LOGGING_ENDPOINT", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    if (entry.level === "error" && alertWebhookUrl) {
      const alertPayload = {
        type: "error_alert",
        timestamp: entry.timestamp,
        code: entry.code,
        message: entry.message,
        path: entry.path,
        method: entry.method,
        requestId: entry.requestId,
      };

      void fetch(alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertPayload),
      }).catch((error) => {
        console.warn(
          "[ErrorLogger] Failed to send alert to ALERT_WEBHOOK_URL",
          {
            message: error instanceof Error ? error.message : String(error),
          },
        );
      });
    }
  }

  private getLevelPrefix(level: ErrorLogEntry["level"]): string {
    switch (level) {
      case "error":
        return "❌ ERROR";
      case "warn":
        return "⚠️  WARN";
      case "info":
        return "ℹ️  INFO";
    }
  }

  private getLevelColor(level: ErrorLogEntry["level"]): string {
    switch (level) {
      case "error":
        return "\x1b[31m"; // Red
      case "warn":
        return "\x1b[33m"; // Yellow
      case "info":
        return "\x1b[36m"; // Cyan
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log API error with request context
 */
export function logApiError(
  error: unknown,
  request: Request,
  userId?: string,
): void {
  const url = new URL(request.url);
  errorLogger.logError(error, {
    path: url.pathname,
    method: request.method,
    userId,
    metadata: {
      searchParams: Object.fromEntries(url.searchParams),
      userAgent: request.headers.get("user-agent"),
    },
  });
}

/**
 * Log database error
 */
export function logDatabaseError(
  error: unknown,
  operation: string,
  collection?: string,
): void {
  errorLogger.log({
    level: "error",
    code: ErrorCode.DATABASE_ERROR,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata: {
      operation,
      collection,
    },
  });
}

/**
 * Log external service error
 */
export function logExternalServiceError(
  service: string,
  error: unknown,
  endpoint?: string,
): void {
  errorLogger.log({
    level: "error",
    code: ErrorCode.EXTERNAL_SERVICE_ERROR,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata: {
      service,
      endpoint,
    },
  });
}

/**
 * Log validation error
 */
export function logValidationError(
  errors: Record<string, string[]>,
  path?: string,
): void {
  errorLogger.log({
    level: "warn",
    code: ErrorCode.VALIDATION_ERROR,
    message: "Request validation failed",
    path,
    metadata: { errors },
  });
}

/**
 * Log authentication failure
 */
export function logAuthError(
  reason: string,
  userId?: string,
  ipAddress?: string,
): void {
  errorLogger.log({
    level: "warn",
    code: ErrorCode.UNAUTHORIZED,
    message: `Authentication failed: ${reason}`,
    userId,
    ipAddress,
  });
}
