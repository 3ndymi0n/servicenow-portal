import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { CustomerModel } from "@/lib/db/models/Customer";
import { requireRole, requireSession } from "@/lib/auth/session";
import { CreateCustomerSchema } from "@/lib/validators";
import { ok, created, handleError } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    const all = await CustomerModel.find({ active: true })
      .sort({ name: 1 })
      .lean();

    const role = session.role;
    const customers = session.customers ?? [];

    console.log("[api/customers] session role:", role, "customers:", customers);

    const filtered =
      role === "admin" || customers.includes("*")
        ? all
        : all.filter((c) => customers.includes(c._id.toString()));

    return ok(filtered.map((c) => ({ ...c, id: c._id.toString() })));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();
    const data = CreateCustomerSchema.parse(body);
    await connectDB();
    const customer = await CustomerModel.create(data);
    return created(customer.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
