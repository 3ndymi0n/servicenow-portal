import type { RawTicket } from "../types";

const EMPLOYEE_NAME = "Taylor Brooks";
const CATEGORIES    = ["Network","Hardware","Software","Access/Security","Email","Server","Database","Printing"];
const PRIORITIES    = ["1 - Critical","2 - High","3 - Moderate","4 - Low"];
const GROUPS        = ["Service Desk","Network Team","Server Team","Security Team","Desktop Support"];
const STATES_CLOSED = ["Closed","Resolved","Closed Complete"];
const STATES_OPEN   = ["In Progress","On Hold","Open","Awaiting User Info"];
const MONTHS        = ["2024-10","2024-11","2024-12","2025-01","2025-02","2025-03"];

const TECH_NAMES: Record<string, string[]> = {
  "Service Desk":   ["Taylor Brooks","Jordan Lee","Morgan Price","Casey Ward","Riley Quinn"],
  "Network Team":   ["Blake Turner","Avery Brooks","Charlie Nash","Reese Holt"],
  "Server Team":    ["Alex Chen","Sam Rivera","Taylor Brooks","Drew Sutton"],
  "Security Team":  ["Morgan Price","Quinn Davis","Avery Brooks"],
  "Desktop Support":["Taylor Brooks","Casey Ward","Jordan Lee","Riley Quinn","Blake Turner"],
};

const DESCRIPTIONS: Record<string, string[]> = {
  Network:          ["User cannot connect to network","VPN dropping repeatedly","Network drive inaccessible","Slow connectivity in finance wing"],
  Hardware:         ["Laptop fails to boot","Monitor showing artefacts","Keyboard unresponsive","Printer offline"],
  Software:         ["App crashes at launch","Error opening spreadsheet","License expired","Cannot install update"],
  "Access/Security":["Password reset needed","Account locked after failed logins","MFA not working","Missing permissions on shared drive"],
  Email:            ["Cannot send or receive email","Outlook calendar not syncing","Attachment blocked by filter","Shared mailbox missing"],
  Server:           ["Server response degraded","Scheduled job failed","Disk space critically low","Service restart after patch"],
  Database:         ["Query timing out","Connection pool exhausted","Backup job failed","Index rebuild required"],
  Printing:         ["Print job stuck in queue","Printer not found","Poor print quality","Driver update needed"],
};

const WORK_NOTES = [
  "Initial assessment underway. Investigating root cause.",
  "Reproduced in test environment. Escalating to Tier 2.",
  "User contacted. Awaiting confirmation of resolution.",
  "Fix applied. Monitoring for recurrence.",
  "Issue resolved by resetting credentials and clearing cache.",
  "Workaround provided pending permanent fix from vendor.",
  "Escalated to Network Team for deeper packet analysis.",
  "Server restarted. Services confirmed healthy.",
];

/** Simple seeded deterministic random (xorshift-style) */
function rng(seed: number): number {
  let s = seed ^ (seed << 13);
  s ^= s >> 7;
  s ^= s << 17;
  return Math.abs(s % 10000) / 10000;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rng(seed) * arr.length)] as T;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function genDate(month: string, seq: number): string {
  const day  = 1 + Math.floor(rng(seq * 7  + 1) * 28);
  const hour = Math.floor(rng(seq * 13 + 2) * 23);
  const min  = Math.floor(rng(seq * 17 + 3) * 59);
  return `${month}-${pad2(day)} ${pad2(hour)}:${pad2(min)}:00`;
}

function genUpdatedDate(created: string, seq: number, closed: boolean): string {
  const [datePart, timePart] = created.split(" ");
  const baseDate = new Date(`${datePart}T${timePart}Z`);
  const addHours = closed
    ? Math.floor(rng(seq * 31) * 120) + 1   // 1–120 hours to close
    : Math.floor(rng(seq * 23) * 48);         // 0–48 hours so far
  baseDate.setHours(baseDate.getHours() + addHours);
  return baseDate.toISOString().replace("T"," ").slice(0,19);
}

/** Generate ~400–600 tickets per customer with realistic distributions */
export function generateSampleData(custId: string, custName: string): RawTicket[] {
  const records: RawTicket[] = [];
  let seq = custId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);

  for (const month of MONTHS) {
    // Volume ramps up slightly each month, with variance
    const baseVol = 55 + MONTHS.indexOf(month) * 5;
    const vol     = baseVol + Math.floor(rng(seq++) * 20) - 10;

    for (let i = 0; i < vol; i++) {
      const ticketNum = `INC${String(records.length + 1).padStart(7, "0")}`;
      const group     = pick(GROUPS, seq++);
      const category  = pick(CATEGORIES, seq++);
      const priRoll   = rng(seq++);
      const priority  = priRoll < 0.05 ? "1 - Critical"
                      : priRoll < 0.20 ? "2 - High"
                      : priRoll < 0.65 ? "3 - Moderate"
                      : "4 - Low";
      const isClosed  = rng(seq++) > 0.22;
      const state     = isClosed ? pick(STATES_CLOSED, seq++) : pick(STATES_OPEN, seq++);

      // Employee appears in ~15% of tickets across Desktop Support + Server Team
      const forceTaylor = (group === "Desktop Support" || group === "Server Team") && rng(seq) < 0.20;
      const techPool    = TECH_NAMES[group] ?? ["Unknown"];
      const assigned_to = forceTaylor ? EMPLOYEE_NAME : pick(techPool, seq++);
      seq++;

      const type        = rng(seq++) < 0.30 ? "Catalog Task" : "Incident";
      const created     = genDate(month, seq++);
      const updated     = genUpdatedDate(created, seq++, isClosed);
      const desc        = DESCRIPTIONS[category]
        ? pick(DESCRIPTIONS[category]!, seq++) : "General IT issue";
      const notes       = isClosed ? pick(WORK_NOTES, seq++) : "";

      // Realistic SLA: depends on priority
      const slaLimits: Record<string, number> = {
        "1 - Critical": 4, "2 - High": 8, "3 - Moderate": 24, "4 - Low": 72,
      };
      const resHours = (new Date(updated).getTime() - new Date(created).getTime()) / 3_600_000;
      const slaMet   = isClosed && resHours > 0 && resHours <= (slaLimits[priority] ?? 24);

      // Small reopen flag (~8% of closed)
      const reopened = isClosed && rng(seq++) < 0.08;

      records.push({
        number: ticketNum,
        type,
        category,
        subcategory: category + (rng(seq++) < 0.5 ? " - General" : " - Escalated"),
        priority,
        assignment_group: group,
        assigned_to,
        state,
        contact_type: pick(["Phone","Email","Self-service","Walk-in","Monitoring"], seq++),
        caller_id:    `user${Math.floor(rng(seq++) * 200)}@${custName.toLowerCase().replace(/\s/g, "")}.com`,
        sys_created_on: created,
        sys_updated_on: updated,
        short_description: desc,
        work_notes: notes,
        _slaMet:  slaMet,
        _reopened: reopened,
      });
    }

    // Add a few catalog tasks too
    const catalogVol = 8 + Math.floor(rng(seq++) * 10);
    for (let i = 0; i < catalogVol; i++) {
      const ticketNum = `TASK${String(records.length + 1).padStart(7, "0")}`;
      const created   = genDate(month, seq++);
      const closed    = rng(seq++) > 0.15;
      const updated   = genUpdatedDate(created, seq++, closed);
      records.push({
        number: ticketNum,
        type: "Catalog Task",
        category: pick(["New Hire Setup","Software Request","Hardware Request","Access Request"], seq++),
        priority: "3 - Moderate",
        assignment_group: pick(GROUPS, seq++),
        assigned_to: pick(TECH_NAMES["Service Desk"]!, seq++),
        state: closed ? "Closed Complete" : "In Progress",
        contact_type: "Self-service",
        caller_id: `user${Math.floor(rng(seq++) * 200)}@${custName.toLowerCase().replace(/\s/g, "")}.com`,
        sys_created_on: created,
        sys_updated_on: updated,
        short_description: "Catalog request submitted via portal",
        work_notes: closed ? "Request fulfilled and closed." : "",
        _slaMet: closed,
        _reopened: false,
      });
    }
  }

  return records;
}
