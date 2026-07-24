import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { errorLogger } from "@/lib/api/error-logger";

describe("error logger observability hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards production logs to LOGGING_ENDPOINT", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOGGING_ENDPOINT", "https://example.com/logs");

    errorLogger.info("test info log", { requestId: "req-1" });

    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/logs",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends alert payload for production error logs", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOGGING_ENDPOINT", "https://example.com/logs");
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://example.com/alerts");

    errorLogger.logError(new Error("critical failure"), {
      path: "/api/test",
      method: "POST",
    });

    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/logs",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/alerts",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
