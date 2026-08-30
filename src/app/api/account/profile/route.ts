import { NextResponse } from "next/server";
import { updateProfile } from "@/services/account.service";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const updated = await updateProfile(user.id, await request.json());
    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
