import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAddress, deleteAddress, setDefaultAddress } from "@/services/account.service";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };
const patchSchema = z.object({ isDefault: z.boolean().optional() }).passthrough();

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    if (body.isDefault === true) {
      await setDefaultAddress(user.id, id);
      return NextResponse.json({ ok: true });
    }
    const address = await updateAddress(user.id, id, body);
    return NextResponse.json({ address });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteAddress(user.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Could not delete address.", 500);
  }
}
