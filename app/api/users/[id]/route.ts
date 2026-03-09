import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/User";
import { requireRole, requireSession } from "@/lib/auth/session";
import { UpdateUserSchema } from "@/lib/validators";
import { ok, noContent, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    // Users can fetch their own profile; admins can fetch any
    if (session.role !== "admin" && session.id !== params.id) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    await connectDB();
    const user = await UserModel.findById(params.id).lean();
    if (!user) throw Object.assign(new Error("Not found"), { code: "NOT_FOUND", status: 404 });
    return ok({ ...user, id: user._id.toString(), passwordHash: undefined });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    if (session.role !== "admin" && session.id !== params.id) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    const body = await req.json();
    const data = UpdateUserSchema.parse(body);

    const update: Record<string, unknown> = { ...data };
    if (data.password) {
      update["passwordHash"] = await bcrypt.hash(data.password, 12);
      delete update["password"];
    }

    await connectDB();
    const user = await UserModel.findByIdAndUpdate(params.id, update, { new: true });
    if (!user) throw Object.assign(new Error("Not found"), { code: "NOT_FOUND", status: 404 });
    return ok(user.toJSON());
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const session = await requireSession();
    if (session.id === params.id) {
      throw Object.assign(new Error("Cannot delete yourself"), { code: "BAD_REQUEST", status: 400 });
    }
    await UserModel.findByIdAndUpdate(params.id, { active: false });
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
