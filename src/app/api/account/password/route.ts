import { NextResponse } from "next/server";
import { changePassword } from "@/services/password.service";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const result = await changePassword(user.id, await request.json());
    return NextResponse.json({ ok: true, email: result.email });
  } catch (err) {
    return handleApiError(err);
  }
}
