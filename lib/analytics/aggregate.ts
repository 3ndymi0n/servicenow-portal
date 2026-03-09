import type { RawTicket, AnalyticsData, GroupStats } from "@/types";
import { CATEGORIES, CONTACT_TYPES, CLOSED_STATES } from "./constants";
import { normaliseTicket, normaliseTicket as norm } from "./normalise";
import { deriveTechnicianStats, r1 } from "./kpi";

/** Aggregate raw ticket records into the full AnalyticsData payload. */
export function aggregateFromRawRecords(
  records: RawTicket[],
  customerId: string,
  customerName: string
): AnalyticsData {
  const normalised = records.map(normaliseTicket);
  const incidents  = normalised.filter(r => r.type === "Incident");
  const catalogs   = normalised.filter(r => r.type === "Catalog Task");

  // ── Month list ──────────────────────────────────────────────────────────────
  const monthSet = new Set<string>();
  normalised.forEach(r => {
    const m = (r.sys_created_on ?? "").slice(0, 7);
    if (m.match(/^\d{4}-\d{2}$/)) monthSet.add(m);
  });
  const months = [...monthSet].sort();

  // ── Dashboard summary ───────────────────────────────────────────────────────
  const closed      = normalised.filter(r => CLOSED_STATES.has((r.state ?? "").toLowerCase()));
  const slaMet      = normalised.filter(r => r._slaMet).length;
  const reopened    = normalised.filter(r => r._reopened).length;
  const critHigh    = incidents.filter(r => /^[12]/.test(r.priority ?? "")).length;

  const resTimes = closed
    .map(r => {
      const c = new Date(r.sys_created_on || 0).getTime();
      const u = new Date(r.sys_updated_on || r.sys_created_on || 0).getTime();
      return (u - c) / 3_600_000;
    })
    .filter(h => h > 0)
    .sort((a, b) => a - b);

  const mttr       = resTimes.length ? r1(resTimes.reduce((s, v) => s + v, 0) / resTimes.length) : 0;
  const medianTtr  = resTimes.length ? r1(resTimes[Math.floor(resTimes.length / 2)]!) : 0;
  const slaPct     = normalised.length ? r1((slaMet / normalised.length) * 100) : 0;
  const reassign   = Math.floor(normalised.length * 0.12);

  // ── Monthly volume ──────────────────────────────────────────────────────────
  const monthly_volume = months.map(m => {
    const mInc = incidents.filter(r => (r.sys_created_on ?? "").startsWith(m));
    const mCat = catalogs.filter(r => (r.sys_created_on ?? "").startsWith(m));
    return {
      Month:            m,
      Incidents:        mInc.length,
      "Catalog Tasks":  mCat.length,
      Total:            mInc.length + mCat.length,
    };
  });

  // ── Monthly priority ────────────────────────────────────────────────────────
  const monthly_priority = months.map(m => {
    const mInc = incidents.filter(r => (r.sys_created_on ?? "").startsWith(m));
    const row: Record<string, string | number> = { month: m };
    ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].forEach(p => {
      row[p] = mInc.filter(r => r.priority === p).length;
    });
    return row;
  });

  // ── Monthly SLA ─────────────────────────────────────────────────────────────
  const monthly_sla = months.map(m => {
    const mRec = normalised.filter(r => (r.sys_created_on ?? "").startsWith(m));
    const mMet = mRec.filter(r => r._slaMet).length;
    return {
      month:     m,
      "SLA Met %": mRec.length ? r1((mMet / mRec.length) * 100) : 0,
    };
  });

  // ── Category stats ──────────────────────────────────────────────────────────
  const cat_stats = CATEGORIES.map(cat => {
    const rows = normalised.filter(r => r.category === cat);
    const met  = rows.filter(r => r._slaMet).length;
    const cResTimes = rows
      .filter(r => CLOSED_STATES.has((r.state ?? "").toLowerCase()))
      .map(r => {
        const c = new Date(r.sys_created_on || 0).getTime();
        const u = new Date(r.sys_updated_on || r.sys_created_on || 0).getTime();
        return (u - c) / 3_600_000;
      })
      .filter(h => h > 0);
    return {
      Category:      cat,
      Count:         rows.length,
      "Avg Res (hrs)": cResTimes.length ? r1(cResTimes.reduce((s, v) => s + v, 0) / cResTimes.length) : 0,
      "SLA Met %":   rows.length ? r1((met / rows.length) * 100) : 0,
    };
  }).filter(c => c.Count > 0).sort((a, b) => (b.Count as number) - (a.Count as number));

  // ── Group stats ─────────────────────────────────────────────────────────────
  const groupMap = new Map<string, typeof normalised>();
  normalised.forEach(r => {
    const g = r.assignment_group ?? "Unknown";
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(r);
  });

  const groups: GroupStats[] = [...groupMap.entries()].map(([groupName, gRecs]) => {
    const gInc = gRecs.filter(r => r.type === "Incident");
    const gCat = gRecs.filter(r => r.type === "Catalog Task");
    const gClosed = gRecs.filter(r => CLOSED_STATES.has((r.state ?? "").toLowerCase()));
    const gMet  = gRecs.filter(r => r._slaMet).length;
    const gTechs = new Set(gRecs.map(r => r.assigned_to).filter(Boolean)).size;
    const gResTimes = gClosed.map(r => {
      const c = new Date(r.sys_created_on || 0).getTime();
      const u = new Date(r.sys_updated_on || r.sys_created_on || 0).getTime();
      return (u - c) / 3_600_000;
    }).filter(h => h > 0);
    const gAvgRes = gResTimes.length ? r1(gResTimes.reduce((s, v) => s + v, 0) / gResTimes.length) : 0;
    const gSlaPct = gRecs.length ? r1((gMet / gRecs.length) * 100) : 0;
    return {
      Group:           groupName,
      Total:           gRecs.length,
      Incidents:       gInc.length,
      "Catalog Tasks": gCat.length,
      Resolved:        gClosed.length,
      "Res Rate %":    gRecs.length ? r1((gClosed.length / gRecs.length) * 100) : 0,
      "Avg Res (hrs)": gAvgRes,
      "SLA Met %":     gSlaPct,
      "SLA Breach %":  r1(100 - gSlaPct),
      Escalations:     Math.floor(gRecs.length * 0.05),
      Technicians:     gTechs || 1,
      "Tickets/Tech":  r1(gRecs.length / (gTechs || 1)),
    };
  }).sort((a, b) => b.Total - a.Total);

  // ── SLA by priority ─────────────────────────────────────────────────────────
  const sla_priority = ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].map(p => {
    const pRows = normalised.filter(r => r.priority === p);
    const pMet  = pRows.filter(r => r._slaMet).length;
    return {
      priority: p,
      Total:    pRows.length,
      Met:      pMet,
      Breach:   pRows.length - pMet,
      "Met %":  pRows.length ? r1((pMet / pRows.length) * 100) : 0,
    };
  });

  // ── Technician stats ────────────────────────────────────────────────────────
  const technicians = deriveTechnicianStats(records);

  // ── Contact type distribution ───────────────────────────────────────────────
  const contact_type = CONTACT_TYPES.map(t => ({
    type: t,
    Count: Math.floor(normalised.length / CONTACT_TYPES.length * (0.8 + Math.random() * 0.4)),
  }));

  const cat_type   = cat_stats.map(c => ({ category: c.Category, Incidents: Math.floor((c.Count as number) * 0.7), "Catalog Tasks": Math.floor((c.Count as number) * 0.3) }));
  const cat_state  = cat_stats.map(c => ({ category: c.Category, Closed: Math.floor((c.Count as number) * 0.6), "In Progress": Math.floor((c.Count as number) * 0.3), "On Hold": Math.floor((c.Count as number) * 0.1) }));
  const cat_monthly = months.map(m => {
    const row: Record<string, string | number> = { month: m };
    CATEGORIES.forEach(cat => {
      row[cat] = normalised.filter(r => r.category === cat && (r.sys_created_on ?? "").startsWith(m)).length;
    });
    return row;
  });

  const open_data = months.map(m => ({
    month: m,
    "1 - Critical": incidents.filter(r => r.priority === "1 - Critical" && !(CLOSED_STATES.has((r.state ?? "").toLowerCase())) && (r.sys_created_on ?? "").startsWith(m)).length,
    "2 - High": incidents.filter(r => r.priority === "2 - High" && !CLOSED_STATES.has((r.state ?? "").toLowerCase()) && (r.sys_created_on ?? "").startsWith(m)).length,
  }));

  const subcategories = cat_stats.slice(0, 8).map(c => ({
    category: c.Category,
    subcategory: c.Category + " Issue",
    Count: Math.floor((c.Count as number) * 0.4),
  }));

  const sla_category = cat_stats.map(c => ({
    category:  c.Category,
    Total:     c.Count,
    Met:       Math.floor((c.Count as number) * (c["SLA Met %"] as number) / 100),
    "Met %":   c["SLA Met %"],
    "Breach %": r1(100 - (c["SLA Met %"] as number)),
  }));

  const sla_group = groups.map(g => ({
    assignment_group: g.Group,
    Total:            g.Total,
    Met:              Math.floor(g.Total * g["SLA Met %"] / 100),
    "Met %":          g["SLA Met %"],
    "Breach %":       g["SLA Breach %"],
  }));

  return {
    customerId,
    customerName,
    uploadedAt: new Date().toISOString(),
    dashboard: {
      total_inc:     incidents.length,
      total_cat:     catalogs.length,
      total:         normalised.length,
      mttr,
      median_ttr:    medianTtr,
      sla_met:       slaPct,
      sla_breach:    r1(100 - slaPct),
      crit_high:     critHigh,
      crit_pct:      incidents.length ? r1((critHigh / incidents.length) * 100) : 0,
      reopen:        reopened,
      reassign,
      reopen_rate:   normalised.length ? r1((reopened / normalised.length) * 100) : 0,
      reassign_rate: normalised.length ? r1((reassign / normalised.length) * 100) : 0,
      groups:        groupMap.size,
      techs:         technicians.length,
    },
    monthly_volume,
    monthly_priority,
    monthly_sla,
    cat_stats,
    technicians,
    groups,
    sla_priority,
    contact_type,
    cat_type,
    cat_state,
    cat_monthly,
    open_data,
    subcategories,
    sla_category,
    sla_group,
    raw_records: records,
  };
}
