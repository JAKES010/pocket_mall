import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, fail, ok, readJson } from "@/lib/api";
import { get, run } from "@/lib/db";

const sourceSchema = z.object({
  source_url: z.string().url().max(500).refine((value) => value.startsWith("https://"), "Use an HTTPS verification source."),
});

function authorize(request: Request): void {
  const expected = process.env.ORDERDESK_VERIFICATION_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected) throw new ApiError(503, "VERIFICATION_DISABLED", "Vendor verification is not configured.");
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  const matches = expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
  if (!matches) throw new ApiError(401, "UNAUTHORIZED", "Verification credentials are invalid.");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    authorize(request);
    const { id } = await params;
    const { source_url } = sourceSchema.parse(await readJson(request));
    const vendor = get<{ id: string }>("SELECT id FROM vendors WHERE id = ?", id);
    if (!vendor) throw new ApiError(404, "VENDOR_NOT_FOUND", "Vendor not found.");
    const verifiedAt = new Date().toISOString();
    run("UPDATE vendors SET verified_at = ?, verification_source = ? WHERE id = ?", verifiedAt, source_url, id);
    return ok({ verification: { vendor_id: id, verified_at: verifiedAt } });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    authorize(request);
    const { id } = await params;
    const vendor = get<{ id: string }>("SELECT id FROM vendors WHERE id = ?", id);
    if (!vendor) throw new ApiError(404, "VENDOR_NOT_FOUND", "Vendor not found.");
    run("UPDATE vendors SET verified_at = NULL, verification_source = NULL WHERE id = ?", id);
    return ok({ verification: { vendor_id: id, verified: false } });
  } catch (error) {
    return fail(error);
  }
}
