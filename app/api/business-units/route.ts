import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { BusinessUnitModel } from "@/lib/db/models/BusinessUnit";
import { requireSession, requireRole } from "@/lib/auth/session";
import { CreateBusinessUnitSchema } from "@/lib/validators";
import { ok, created, handleError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const units = await BusinessUnitModel.find({}).sort({ name: 1 }).lean();
    return ok(units.map(u => ({ ...u, id: u._id.toString() })));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();
    const data = CreateBusinessUnitSchema.parse(body);
    await connectDB();
    const unit = await BusinessUnitModel.create(data);
    return created(unit.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
