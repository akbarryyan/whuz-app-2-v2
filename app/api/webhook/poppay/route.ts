import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSiteConfigValue } from "@/lib/site-config";
import { handlePoppayCallback, type PoppayCallbackPayload } from "@/lib/poppay-callback";

export const dynamic = "force-dynamic";

type VerificationResult =
  | { mode: "verified" | "skipped" | "invalid"; reason?: string };

function readHeader(headers: Headers, keys: string[]): string {
  for (const key of keys) {
    const value = headers.get(key);
    if (value) return value.trim();
  }
  return "";
}

function normalizeBool(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function safeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft.length !== normalizedRight.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalizedLeft, "utf8"),
      Buffer.from(normalizedRight, "utf8")
    );
  } catch {
    return false;
  }
}

function computeHmacSha256(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function computeSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function verifyPoppayWebhookSignature(
  headers: Headers,
  rawBody: string,
  payload: PoppayCallbackPayload
): Promise<VerificationResult> {
  const secret = (await getSiteConfigValue("POPPAY_SECRET_KEY")).trim();
  const signatureRequired = normalizeBool(await getSiteConfigValue("POPPAY_WEBHOOK_SIGNATURE_REQUIRED", ""));

  if (!secret) {
    if (signatureRequired) {
      return { mode: "invalid", reason: "POPPAY_SECRET_KEY belum diisi saat strict verification aktif." };
    }
    return { mode: "skipped" };
  }

  const signature = readHeader(headers, [
    "x-signature",
    "x-poppay-signature",
    "signature",
    "x-callback-signature",
  ]);
  const timestamp = readHeader(headers, [
    "x-timestamp",
    "x-poppay-timestamp",
    "timestamp",
    "x-callback-timestamp",
  ]);

  if (!signature) {
    if (signatureRequired) {
      return { mode: "invalid", reason: "Header signature callback tidak ditemukan." };
    }
    console.warn("[Webhook/Poppay] Signature header tidak ditemukan; verifikasi dilewati.");
    return { mode: "skipped" };
  }

  const compactBody = rawBody.trim();
  const baseFields = `${payload.refid}${payload.agg_refid}${payload.status}`;
  const candidates = [
    computeHmacSha256(secret, compactBody),
    computeSha256(compactBody + secret),
    computeSha256(secret + compactBody),
  ];

  if (timestamp) {
    candidates.push(
      computeHmacSha256(secret, `${baseFields}${timestamp}`),
      computeHmacSha256(secret, `${timestamp}.${compactBody}`),
      computeHmacSha256(secret, `${compactBody}${timestamp}`)
    );
  }

  candidates.push(
    computeHmacSha256(secret, baseFields),
    computeSha256(baseFields + secret),
    computeSha256(secret + baseFields)
  );

  const isValid = candidates.some((candidate) => safeEqualHex(candidate, signature));
  if (!isValid) {
    return { mode: "invalid", reason: "Signature callback Poppay tidak valid." };
  }

  return { mode: "verified" };
}

export async function POST(request: Request) {
  let rawBody = "";
  let payload: PoppayCallbackPayload | null = null;

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody) as PoppayCallbackPayload;
  } catch {
    return NextResponse.json(
      {
        status: "success",
        message: "Invalid JSON ignored",
        data: { id: "ignored-invalid-json", created_at: new Date().toISOString() },
      },
      { status: 200 }
    );
  }

  if (!payload?.refid || !payload?.agg_refid || payload?.status == null) {
    return NextResponse.json(
      {
        status: "success",
        message: "Missing required fields ignored",
        data: { id: "ignored-missing-fields", created_at: new Date().toISOString() },
      },
      { status: 200 }
    );
  }

  try {
    const verification = await verifyPoppayWebhookSignature(request.headers, rawBody, payload);
    if (verification.mode === "invalid") {
      console.warn("[Webhook/Poppay] Signature tidak tervalidasi, lanjut dengan cross-check inquiry:", verification.reason);
    }

    const result = await handlePoppayCallback(payload, JSON.parse(rawBody));
    return NextResponse.json(
      {
        status: "success",
        message: "Operation completed successfully",
        data: {
          id: payload.refid,
          created_at: new Date().toISOString(),
          verification: verification.mode,
          result,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook/Poppay] Error:", error);
    return NextResponse.json(
      {
        status: "success",
        message: "Operation completed with internal error",
        data: {
          id: payload.refid,
          created_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  }
}
