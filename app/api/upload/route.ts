import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { TicketDataModel } from "@/lib/db/models/TicketData";
import { CustomerModel } from "@/lib/db/models/Customer";
import { NotificationModel } from "@/lib/db/models/Notification";
import { requireCustomerAccess } from "@/lib/auth/session";
import { parseCsvText } from "@/lib/analytics/normalise";
import { deduplicateRecords } from "@/lib/analytics/deduplicate";
import { aggregateFromRawRecords } from "@/lib/analytics/aggregate";
import { ALL_GROUPS } from "@/lib/analytics/constants";
import { ok, handleError } from "@/lib/api/response";
import type { RawTicket } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const customerId = formData.get("customerId") as string;
    const file = formData.get("file") as File | null;

    if (!customerId || !file) {
      throw Object.assign(new Error("customerId and file are required"), { code: "BAD_REQUEST", status: 400 });
    }

    const session = await requireCustomerAccess(customerId);

    const csvText = await file.text();
    const incoming = parseCsvText(csvText);

    if (incoming.length === 0) {
      throw Object.assign(new Error("No valid records found in CSV"), { code: "BAD_REQUEST", status: 400 });
    }

    await connectDB();
    const customer = await CustomerModel.findById(customerId).lean();
    if (!customer) {
      throw Object.assign(new Error("Customer not found"), { code: "NOT_FOUND", status: 404 });
    }

    // Deduplicate against existing records
    const existing = await TicketDataModel.findOne({ customerId }).lean();
    const existingRecords = (existing?.raw_records ?? []) as RawTicket[];
    const { merged, stats } = deduplicateRecords(existingRecords, incoming);

    // Aggregate
    const analytics = aggregateFromRawRecords(merged, customerId, customer.name);

    // Persist
    await TicketDataModel.findOneAndUpdate(
      { customerId },
      {
        ...analytics,
        customerId,
        customerName: customer.name,
        uploadedAt: new Date(),
        uploadedBy: session.id,
      },
      { upsert: true, new: true }
    );

    // Fire notifications for unknown groups
    const knownGroups = new Set([...ALL_GROUPS, ...customer.resolverGroups]);
    const unknownGroups = new Set<string>();
    merged.forEach(r => {
      if (r.assignment_group && !knownGroups.has(r.assignment_group)) {
        unknownGroups.add(r.assignment_group);
      }
    });
    for (const groupName of unknownGroups) {
      await NotificationModel.create({
        type: "unknown_group",
        customerId,
        customerName: customer.name,
        groupName,
        message: `Unknown resolver group "${groupName}" found in uploaded data for ${customer.name}`,
        read: false,
      });
    }

    return ok({
      message: "Upload successful",
      stats,
      unknownGroups: [...unknownGroups],
      totalRecords: merged.length,
    });
  } catch (err) {
    return handleError(err);
  }
}
