import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { NotificationModel } from "@/lib/db/models/Notification";
import { requireSession } from "@/lib/auth/session";
import { ok, handleError } from "@/lib/api/response";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    await connectDB();
    await NotificationModel.findByIdAndUpdate(params.id, { read: true });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
