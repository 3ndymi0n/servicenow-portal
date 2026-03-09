import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/connect";
import { NotificationModel } from "@/lib/db/models/Notification";
import { ok, handleError } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await requireSession();
    // Only admins and customer managers receive notifications
    if (session.role !== "admin" && !session.isCustomerManager) {
      return ok([]);
    }
    await connectDB();

    const query = session.role === "admin"
      ? {}
      : { customerId: { $in: session.managedCustomers } };

    const notifs = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return ok(notifs.map(n => ({ ...n, id: n._id.toString() })));
  } catch (err) {
    return handleError(err);
  }
}
