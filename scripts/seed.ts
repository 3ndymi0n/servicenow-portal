/**
 * Database seed script.
 * Usage:
 *   npm run db:seed           # seeds if not already seeded
 *   npm run db:seed -- --reset  # wipes and re-seeds
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db/connect";
import { UserModel } from "../lib/db/models/User";
import { CustomerModel } from "../lib/db/models/Customer";
import { BusinessUnitModel } from "../lib/db/models/BusinessUnit";
import { TicketDataModel } from "../lib/db/models/TicketData";
import { aggregateFromRawRecords } from "../lib/analytics/aggregate";
import { generateSampleData } from "./generateSampleData";

const SEED_VERSION = "v1";
const RESET = process.argv.includes("--reset");

async function hash(pwd: string) {
  return bcrypt.hash(pwd, 12);
}

async function main() {
  await connectDB();
  console.log("[Seed] Connected to MongoDB");

  if (RESET) {
    await Promise.all([
      UserModel.deleteMany({}),
      CustomerModel.deleteMany({}),
      BusinessUnitModel.deleteMany({}),
      TicketDataModel.deleteMany({}),
    ]);
    console.log("[Seed] Cleared all collections");
  }

  const existingCount = await UserModel.countDocuments();
  if (existingCount > 0 && !RESET) {
    console.log(
      `[Seed] Already seeded (${existingCount} users). Pass --reset to re-seed.`,
    );
    await mongoose.disconnect();
    return;
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  const [c1, c2, c3] = await CustomerModel.insertMany([
    {
      name: "Acme Corporation",
      code: "ACME",
      industry: "Manufacturing",
      resolverGroups: [
        "Service Desk",
        "Network Team",
        "Server Team",
        "Security Team",
        "Desktop Support",
      ],
    },
    {
      name: "Brightside Finance",
      code: "BFIN",
      industry: "Financial Services",
      resolverGroups: [
        "Service Desk",
        "Network Team",
        "Security Team",
        "Desktop Support",
      ],
    },
    {
      name: "Oceanic Logistics",
      code: "OCNL",
      industry: "Logistics",
      resolverGroups: ["Desktop Support"],
    },
  ]);
  console.log("[Seed] Created 3 customers");

  // ── Business Units ───────────────────────────────────────────────────────────
  const [bu1, bu2, bu3, bu4, bu5, bu6] = await BusinessUnitModel.insertMany([
    {
      name: "IT Operations",
      customerId: c1!._id.toString(),
      groups: ["Service Desk", "Network Team", "Server Team"],
    },
    {
      name: "End User Computing",
      customerId: c1!._id.toString(),
      groups: ["Service Desk", "Desktop Support"],
    },
    {
      name: "Security & Infra",
      customerId: c2!._id.toString(),
      groups: ["Security Team", "Server Team"],
    },
    {
      name: "Finance IT",
      customerId: c2!._id.toString(),
      groups: ["Service Desk", "Network Team"],
    },
    {
      name: "Desktop Support",
      customerId: c2!._id.toString(),
      groups: ["Desktop Support"],
    },
    {
      name: "Desktop Support",
      customerId: c3!._id.toString(),
      groups: ["Desktop Support"],
    },
  ]);
  console.log("[Seed] Created 6 business units");

  // ── Users ────────────────────────────────────────────────────────────────────
  const ADMIN_PWD = process.env["SEED_ADMIN_PASSWORD"] ?? "Admin1234!";
  const ANALYST_PWD = process.env["SEED_ANALYST_PASSWORD"] ?? "Pass1234!";
  const VIEWER_PWD = process.env["SEED_VIEWER_PASSWORD"] ?? "View1234!";
  const EMP_PWD = process.env["SEED_EMP_PASSWORD"] ?? "Emp1234!";

  await UserModel.insertMany([
    {
      username: "admin",
      email: "admin@msp.local",
      passwordHash: await hash(ADMIN_PWD),
      role: "admin",
      displayName: "System Admin",
      customers: ["*"],
      allowedGroups: new Map(),
      businessUnit: null,
      isExecutive: true,
      isCustomerManager: true,
      managedCustomers: [
        c1!._id.toString(),
        c2!._id.toString(),
        c3!._id.toString(),
      ],
      active: true,
    },
    {
      username: "analyst1",
      email: "analyst1@msp.local",
      passwordHash: await hash(ANALYST_PWD),
      role: "analyst",
      displayName: "Alex Chen",
      customers: [c1!._id.toString(), c2!._id.toString()],
      allowedGroups: new Map(),
      businessUnit: bu1!._id.toString(),
      isExecutive: true,
      isCustomerManager: true,
      managedCustomers: [c1!._id.toString(), c2!._id.toString()],
      active: true,
    },
    {
      username: "analyst2",
      email: "analyst2@msp.local",
      passwordHash: await hash(ANALYST_PWD),
      role: "analyst",
      displayName: "Sam Rivera",
      customers: [c1!._id.toString(), c2!._id.toString()],
      allowedGroups: new Map(),
      businessUnit: null,
      isExecutive: false,
      isCustomerManager: true,
      managedCustomers: [c1!._id.toString(), c2!._id.toString()],
      active: true,
    },
    {
      username: "viewer1",
      email: "viewer1@msp.local",
      passwordHash: await hash(VIEWER_PWD),
      role: "viewer",
      displayName: "Jordan Lee",
      customers: [c1!._id.toString()],
      allowedGroups: new Map([
        [c1!._id.toString(), ["Service Desk", "Network Team"]],
      ]),
      businessUnit: bu2!._id.toString(),
      isExecutive: false,
      isCustomerManager: false,
      managedCustomers: [],
      active: true,
    },
    {
      username: "emp1",
      email: "emp1@msp.local",
      passwordHash: await hash(EMP_PWD),
      role: "employee",
      displayName: "Taylor Brooks",
      customers: [c1!._id.toString(), c2!._id.toString(), c3!._id.toString()],
      allowedGroups: new Map([
        [c1!._id.toString(), ["Desktop Support"]],
        [c2!._id.toString(), ["Desktop Support"]],
        [c3!._id.toString(), ["Desktop Support"]],
      ]),
      businessUnit: null,
      isExecutive: false,
      isCustomerManager: false,
      managedCustomers: [],
      active: true,
    },
  ]);
  console.log("[Seed] Created 5 users");

  // ── Ticket data ─────────────────────────────────────────────────────────────
  for (const cust of [c1!, c2!, c3!]) {
    const custId = cust._id.toString();
    const rawRecs = generateSampleData(custId, cust.name);
    const analytics = aggregateFromRawRecords(rawRecs, custId, cust.name);
    await TicketDataModel.create({
      ...analytics,
      customerId: custId,
      customerName: cust.name,
      uploadedAt: new Date(),
      uploadedBy: "seed",
    });
    console.log(`[Seed] Generated ${rawRecs.length} tickets for ${cust.name}`);
  }

  console.log("[Seed] ✅ Seeding complete");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[Seed] ❌ Error:", err);
  process.exit(1);
});
