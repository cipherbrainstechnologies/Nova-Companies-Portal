import { NextRequest, NextResponse } from "next/server";
import { getPublicCostEstimateByReference } from "@/server/public/estimate-service";

type Params = { params: Promise<{ reference: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { reference } = await params;
  const ref = reference.trim().toUpperCase();
  if (!/^EST-[A-F0-9]{8}$/.test(ref)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = await getPublicCostEstimateByReference(ref);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.expired) {
    return NextResponse.json({ error: "expired", publicReference: ref }, { status: 410 });
  }

  return NextResponse.json(row);
}
