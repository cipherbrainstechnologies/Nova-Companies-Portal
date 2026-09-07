import { NextResponse } from "next/server";
import { z } from "zod";
import { payrollFacade } from "@/server/facades/payroll-facade";
import { apiError } from "@/server/api-helpers";

const schema = z.string().trim().min(6).max(64);

export async function GET(request: Request) {
  try {
    const code = schema.parse(new URL(request.url).searchParams.get("code"));
    return NextResponse.json(await payrollFacade.verifyDocument(code.toUpperCase()));
  } catch (error) { return apiError(error); }
}
