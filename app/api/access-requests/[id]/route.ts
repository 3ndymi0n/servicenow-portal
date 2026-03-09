import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { AccessRequestModel } from "@/lib/db/models/AccessRequest";
import { UserModel } from "@/lib/db/models/User";
import { requireRole } from "@/lib/auth/session";
import { HandleAccessRequestSchema } from "@/lib/validators";
import { ok, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    const { status } = HandleAccessRequestSchema.parse(body);

    await connectDB();
    const ar = await AccessRequestModel.findByIdAndUpdate(
      params.id,
      { status, handledAt: new Date(), handledBy: session.id },
      { new: true }
    );
    if (!ar) throw Object.assign(new Error("Not found"), { code: "NOT_FOUND", status: 404 });

    // If approved, add the customer to the user's accessible list
    if (status === "approved") {
      await UserModel.findByIdAndUpdate(ar.userId, {
        $addToSet: { customers: ar.customerId },
      });
    }

    return ok(ar.toJSON());
  } catch (err) {
    return handleError(err);
  }
}
