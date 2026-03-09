import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { AccessRequestModel } from "@/lib/db/models/AccessRequest";
import { requireSession, requireRole } from "@/lib/auth/session";
import { CreateAccessRequestSchema } from "@/lib/validators";
import { ok, created, handleError } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    const query = session.role === "admin" ? {} : { userId: session.id };
    const requests = await AccessRequestModel.find(query).sort({ createdAt: -1 }).lean();
    return ok(requests.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = CreateAccessRequestSchema.parse(body);
    await connectDB();
    const request = await AccessRequestModel.create({ ...data, userId: session.id });
    return created(request.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
