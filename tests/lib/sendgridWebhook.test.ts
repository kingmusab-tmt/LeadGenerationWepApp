import { generateKeyPairSync, createSign } from "crypto";
import { describe, expect, it } from "vitest";
import {
  isTimestampFresh,
  verifySendGridSignature,
} from "@/lib/security/sendgridWebhook";

function makeKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1", // NIST P-256, what SendGrid uses
  });
  const publicKeyBase64 = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  return { publicKey, privateKey, publicKeyBase64 };
}

function sign(privateKey: import("crypto").KeyObject, timestamp: string, body: string) {
  const signer = createSign("SHA256");
  signer.update(timestamp + body);
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

describe("verifySendGridSignature", () => {
  it("accepts a genuinely signed payload", () => {
    const { privateKey, publicKeyBase64 } = makeKeyPair();
    const rawBody = JSON.stringify([{ event: "bounce", email: "a@b.com" }]);
    const timestamp = "1700000000";
    const signature = sign(privateKey, timestamp, rawBody);

    expect(
      verifySendGridSignature({ publicKeyBase64, rawBody, signature, timestamp }),
    ).toBe(true);
  });

  it("rejects a payload that was tampered with after signing", () => {
    const { privateKey, publicKeyBase64 } = makeKeyPair();
    const timestamp = "1700000000";
    const signature = sign(
      privateKey,
      timestamp,
      JSON.stringify([{ event: "bounce", email: "a@b.com" }]),
    );
    const tamperedBody = JSON.stringify([{ event: "bounce", email: "attacker@evil.com" }]);

    expect(
      verifySendGridSignature({
        publicKeyBase64,
        rawBody: tamperedBody,
        signature,
        timestamp,
      }),
    ).toBe(false);
  });

  it("rejects a signature produced with a different key", () => {
    const { publicKeyBase64 } = makeKeyPair();
    const other = makeKeyPair();
    const rawBody = JSON.stringify([{ event: "bounce" }]);
    const timestamp = "1700000000";
    const signature = sign(other.privateKey, timestamp, rawBody);

    expect(
      verifySendGridSignature({ publicKeyBase64, rawBody, signature, timestamp }),
    ).toBe(false);
  });

  it("rejects when the timestamp used to verify differs from the one signed", () => {
    const { privateKey, publicKeyBase64 } = makeKeyPair();
    const rawBody = JSON.stringify([{ event: "bounce" }]);
    const signature = sign(privateKey, "1700000000", rawBody);

    expect(
      verifySendGridSignature({
        publicKeyBase64,
        rawBody,
        signature,
        timestamp: "1700000001",
      }),
    ).toBe(false);
  });

  it("returns false instead of throwing on garbage input", () => {
    expect(
      verifySendGridSignature({
        publicKeyBase64: "not-a-real-key",
        rawBody: "{}",
        signature: "not-a-real-signature",
        timestamp: "1700000000",
      }),
    ).toBe(false);
  });
});

describe("isTimestampFresh", () => {
  it("accepts a timestamp within the tolerance window", () => {
    const now = 1_700_000_000;
    expect(isTimestampFresh(String(now - 60), now)).toBe(true);
    expect(isTimestampFresh(String(now + 60), now)).toBe(true);
  });

  it("rejects a timestamp older than the tolerance window", () => {
    const now = 1_700_000_000;
    expect(isTimestampFresh(String(now - 601), now)).toBe(false);
  });

  it("rejects a non-numeric timestamp", () => {
    expect(isTimestampFresh("not-a-number")).toBe(false);
  });
});
