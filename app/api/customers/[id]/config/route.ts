import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { CustomerConfigModel } from "@/lib/db/models/CustomerConfig";
import { requireCustomerAccess, requireRole } from "@/lib/auth/session";
import { CustomerConfigSchema } from "@/lib/validators";
import { ok, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireCustomerAccess(params.id);
    await connectDB();
    const cfg = await CustomerConfigModel.findOne({ customerId: params.id }).lean();
    return ok(cfg ?? { customerId: params.id, thresholds: {}, benchmarks: {} });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    // Analysts with customer manager role can update; admins always can
    const session = await requireCustomerAccess(params.id);
    if (session.role !== "admin" && !session.isCustomerManager) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    const body = await req.json();
    const data = CustomerConfigSchema.parse(body);
    await connectDB();
    const cfg = await CustomerConfigModel.findOneAndUpdate(
      { customerId: params.id },
      { ...data, customerId: params.id },
      { upsert: true, new: true }
    );
    return ok(cfg!.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
