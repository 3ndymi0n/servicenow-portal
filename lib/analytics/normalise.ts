import type { RawTicket } from "@/types";

// Field name aliases from various ServiceNow export formats
const CSV_FIELD_MAP: Record<keyof RawTicket, string[]> = {
  number:            ["number", "Number", "ticket_number", "Ticket Number", "inc_number"],
  type:              ["type", "Type", "ticket_type"],
  category:          ["category", "Category"],
  priority:          ["priority", "Priority"],
  assignment_group:  ["assignment_group", "Assignment group", "Assignment Group", "group"],
  assigned_to:       ["assigned_to", "Assigned to", "Assigned To", "technician"],
  state:             ["state", "State", "status", "Status"],
  sys_created_on:    ["sys_created_on", "Created", "opened_at", "Open date", "Date"],
  sys_updated_on:    ["sys_updated_on", "Updated", "resolved_at", "Close date", "closed_at"],
  short_description: ["short_description", "Short description", "description", "Description", "title", "summary"],
  work_notes:        ["work_notes", "Work notes", "worknotes", "notes", "Notes", "internal_notes", "comments"],
  _phase:            ["_phase"],
  _sentiment:        ["_sentiment"],
};

/** Normalize a raw CSV row object into a RawTicket. Returns null if unusable. */
export function mapCsvRow(row: Record<string, string>): RawTicket | null {
  const get = (aliases: string[]): string => {
    for (const alias of aliases) {
      const val = row[alias];
      if (val !== undefined && val.trim() !== "") return val.trim();
    }
    return "";
  };

  const number = get(CSV_FIELD_MAP.number!);
  if (!number) return null;

  const rawType = get(CSV_FIELD_MAP.type!).toLowerCase();
  const type: RawTicket["type"] =
    rawType.includes("task") || rawType.includes("cat") ? "Catalog Task" : "Incident";

  const state      = get(CSV_FIELD_MAP.state!);
  const createdOn  = get(CSV_FIELD_MAP.sys_created_on!);
  const updatedOn  = get(CSV_FIELD_MAP.sys_updated_on!) || createdOn;

  return {
    number,
    type,
    category:          get(CSV_FIELD_MAP.category!),
    priority:          get(CSV_FIELD_MAP.priority!),
    assignment_group:  get(CSV_FIELD_MAP.assignment_group!),
    assigned_to:       get(CSV_FIELD_MAP.assigned_to!),
    state:             state || "Unknown",
    sys_created_on:    createdOn,
    sys_updated_on:    updatedOn,
    short_description: get(CSV_FIELD_MAP.short_description!),
    work_notes:        get(CSV_FIELD_MAP.work_notes!),
    _phase:            get(CSV_FIELD_MAP._phase!),
    _sentiment:        get(CSV_FIELD_MAP._sentiment!),
  };
}

/** Parse a CSV string into RawTicket[]. Uses simple split logic for performance. */
export function parseCsvText(text: string): RawTicket[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]!);
  const results: RawTicket[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    const ticket = mapCsvRow(row);
    if (ticket) results.push(ticket);
  }

  return results;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Enrich a raw ticket with synthetic SLA and reopen flags for aggregation. */
export function normaliseTicket(r: RawTicket): RawTicket & { _slaMet: boolean; _reopened: boolean } {
  const priority = (r.priority ?? "").toLowerCase();
  const createdMs = r.sys_created_on ? new Date(r.sys_created_on).getTime() : 0;
  const updatedMs = r.sys_updated_on ? new Date(r.sys_updated_on).getTime() : 0;
  const resHours  = createdMs && updatedMs ? (updatedMs - createdMs) / 3_600_000 : null;

  // SLA target by priority
  const slaHours: Record<string, number> = {
    "1 - critical": 4,
    "2 - high": 8,
    "3 - moderate": 24,
    "4 - low": 72,
  };
  const target = slaHours[priority] ?? 24;
  const _slaMet = resHours !== null ? resHours <= target : Math.random() > 0.2;
  const _reopened = r.work_notes?.toLowerCase().includes("reopen") ?? false;

  return { ...r, _slaMet, _reopened };
}
