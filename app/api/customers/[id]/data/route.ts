import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { TicketDataModel } from "@/lib/db/models/TicketData";
import { requireCustomerAccess, allowedGroupsForCustomer } from "@/lib/auth/session";
import { aggregateFromRawRecords } from "@/lib/analytics/aggregate";
import { filterByMonthRange } from "@/lib/analytics/dateFilter";
import { ok, handleError } from "@/lib/api/response";
import type { RawTicket } from "@/types";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireCustomerAccess(params.id);
    await connectDB();

    const doc = await TicketDataModel.findOne({ customerId: params.id }).lean();
    if (!doc) return ok(null);

    // Apply group restriction
    const allowedGroups = allowedGroupsForCustomer(session, params.id);
    let records = doc.raw_records as RawTicket[];
    if (allowedGroups !== null) {
      records = records.filter(r => allowedGroups.includes(r.assignment_group));
    }

    // Optional date range filter from query params
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to   = url.searchParams.get("to");
    if (from && to) {
      records = filterByMonthRange(records, from, to);
    }

    // Re-aggregate if group/date filtered, otherwise return stored
    const hasFilter = allowedGroups !== null || (from && to);
    if (hasFilter) {
      const reAgg = aggregateFromRawRecords(records, params.id, doc.customerName);
      return ok({ ...reAgg, uploadedAt: doc.uploadedAt });
    }

    return ok(doc);
  } catch (err) {
    return handleError(err);
  }
}
