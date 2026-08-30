import { NextResponse } from "next/server";
import { createAddress, listAddresses } from "@/services/account.service";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ addresses: await listAddresses(user.id) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const address = await createAddress(user.id, await request.json());
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
