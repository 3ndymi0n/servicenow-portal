import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/User";
import { requireRole } from "@/lib/auth/session";
import { CreateUserSchema } from "@/lib/validators";
import { ok, created, handleError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const users = await UserModel.find({}).sort({ createdAt: -1 }).lean();
    return ok(users.map(u => ({ ...u, id: u._id.toString(), passwordHash: undefined })));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();
    const data = CreateUserSchema.parse(body);

    await connectDB();
    const exists = await UserModel.findOne({ username: data.username });
    if (exists) {
      return handleError(Object.assign(new Error("Username already taken"), { code: "CONFLICT", status: 409 }));
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await UserModel.create({ ...data, passwordHash });
    return created(user.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
