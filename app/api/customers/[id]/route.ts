import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { CustomerModel } from "@/lib/db/models/Customer";
import { requireRole, requireCustomerAccess } from "@/lib/auth/session";
import { UpdateCustomerSchema } from "@/lib/validators";
import { ok, noContent, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireCustomerAccess(params.id);
    await connectDB();
    const c = await CustomerModel.findById(params.id).lean();
    if (!c) throw Object.assign(new Error("Not found"), { code: "NOT_FOUND", status: 404 });
    return ok({ ...c, id: c._id.toString() });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();
    const data = UpdateCustomerSchema.parse(body);
    await connectDB();
    const c = await CustomerModel.findByIdAndUpdate(params.id, data, { new: true });
    if (!c) throw Object.assign(new Error("Not found"), { code: "NOT_FOUND", status: 404 });
    return ok(c.toJSON());
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    await CustomerModel.findByIdAndUpdate(params.id, { active: false });
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
