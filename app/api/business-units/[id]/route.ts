import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { BusinessUnitModel } from "@/lib/db/models/BusinessUnit";
import { requireRole } from "@/lib/auth/session";
import { UpdateBusinessUnitSchema } from "@/lib/validators";
import { ok, noContent, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const bu = await BusinessUnitModel.findById(params.id).lean();
    if (!bu) throw Object.assign(new Error("Not found"), { code:"NOT_FOUND", status:404 });
    return ok({ ...bu, id: bu._id.toString() });
  } catch (err) { return handleError(err); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    const data = UpdateBusinessUnitSchema.parse(await req.json());
    await connectDB();
    const bu = await BusinessUnitModel.findByIdAndUpdate(params.id, data, { new: true });
    if (!bu) throw Object.assign(new Error("Not found"), { code:"NOT_FOUND", status:404 });
    return ok(bu.toJSON());
  } catch (err) { return handleError(err); }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    await BusinessUnitModel.findByIdAndDelete(params.id);
    return noContent();
  } catch (err) { return handleError(err); }
}
