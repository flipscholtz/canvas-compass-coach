import type { Canvas, CanvasItem, CanvasVersion, ChatMessage, ItemStatus, LogEntry, TestCard } from "./types";
import { uid } from "./types";

const i = (text: string, status: ItemStatus = "hypothesis"): CanvasItem => ({ id: uid(), text, status });

const v1: Canvas = {
  keyPartners: [i("Carbon offset marketplaces"), i("Smart-meter vendors")],
  keyActivities: [i("Mobile app development"), i("Gamified footprint challenges")],
  keyResources: [i("Consumer app team"), i("Emissions factor database")],
  valueProps: [i("Track your personal carbon footprint in real time"), i("Offset with one tap")],
  relationships: [i("Self-service app"), i("Community leaderboards")],
  channels: [i("App Store"), i("Instagram influencers")],
  segments: [i("Eco-conscious millennials")],
  costs: [i("Paid social acquisition"), i("App development")],
  revenue: [i("Freemium $4/month premium"), i("Offset commission")],
};

const v11: Canvas = {
  keyPartners: [i("Smart-meter vendors"), i("ESG audit firms (Big 4)"), i("Carbon offset marketplaces", "invalidated")],
  keyActivities: [i("Sensor data ingestion"), i("Scope 1–2 emissions modelling")],
  keyResources: [i("Data engineers"), i("Emissions factor database", "validated")],
  valueProps: [i("Audit-ready Scope 1–2 reports in days, not months"), i("Track your personal carbon footprint in real time", "invalidated")],
  relationships: [i("Onboarding specialist"), i("Self-service app", "invalidated")],
  channels: [i("ESG auditor referrals"), i("App Store", "invalidated")],
  segments: [i("Sustainability managers at mid-size EU manufacturers (250–2,000 staff)", "validated"), i("Eco-conscious millennials", "invalidated")],
  costs: [i("Engineering salaries"), i("Sensor integration")],
  revenue: [i("Annual SaaS licence per site (€12k)"), i("Freemium $4/month premium", "invalidated")],
};

const v20: Canvas = {
  keyPartners: [i("Smart-meter vendors", "validated"), i("ESG audit firms (Big 4)", "validated"), i("ERP integrators (SAP partners)")],
  keyActivities: [i("Sensor data ingestion", "validated"), i("CSRD / ESRS E1 compliance mapping"), i("Audit trail & evidence vault")],
  keyResources: [i("Data engineers", "validated"), i("Emissions factor database", "validated"), i("Compliance domain experts")],
  valueProps: [i("Audit-ready Scope 1–2 reports in days, not months", "validated"), i("CSRD-aligned assurance pack for auditors")],
  relationships: [i("Dedicated customer success manager"), i("Quarterly compliance reviews")],
  channels: [i("ESG auditor referrals", "validated"), i("Industry association webinars"), i("Direct enterprise sales")],
  segments: [i("Sustainability managers at mid-size EU manufacturers (250–2,000 staff)", "validated"), i("CFOs facing CSRD reporting deadlines")],
  costs: [i("Engineering salaries"), i("Enterprise sales team"), i("Compliance certification")],
  revenue: [i("Annual SaaS licence per site (€12k)", "validated"), i("Assurance pack add-on (€4k/audit)")],
};

export const demoVersions = (): CanvasVersion[] => [
  { id: uid(), label: "v1.0 · Initial Hypothesis", note: "Consumer carbon-tracking app for eco-conscious millennials.", createdAt: "2026-02-03T09:00:00Z", canvas: v1 },
  { id: uid(), label: "v1.1 · Post-Interview Pivot", note: "12 consumer interviews: 0 willing to pay. 4 of 5 manufacturers described CSRD reporting as urgent and budgeted.", createdAt: "2026-03-17T14:00:00Z", canvas: v11 },
  { id: uid(), label: "v2.0 · B2B Compliance Stack", note: "LOIs from 3 manufacturers; auditors asked for an assurance pack. Shift to enterprise compliance SaaS.", createdAt: "2026-05-28T10:30:00Z", canvas: v20 },
];

export const demoCards = (): TestCard[] => [
  {
    id: uid(),
    title: "Test: CFOs facing CSRD reporting deadlines",
    block: "segments",
    hypothesis: "We believe that CFOs at EU manufacturers with 250–2,000 staff will sponsor a carbon-reporting tool before their first CSRD filing.",
    experiment: "To verify that, we will run 8 discovery interviews with CFOs sourced via auditor referrals.",
    metric: "And measure how many name CSRD as a top-3 2026 priority with allocated budget.",
    criteria: "We are right if ≥ 5 of 8 confirm budget is allocated.",
  },
  {
    id: uid(),
    title: "Test: Assurance pack add-on (€4k/audit)",
    block: "revenue",
    hypothesis: "We believe that existing customers will pay €4k per audit for an auditor-ready assurance pack.",
    experiment: "To verify that, we will offer a pre-sale to the 3 LOI customers ahead of Q3 audits.",
    metric: "And measure signed purchase orders.",
    criteria: "We are right if ≥ 2 of 3 sign a PO.",
  },
];

export const demoMessages = (): ChatMessage[] => [
  { id: uid(), role: "coach", text: "Welcome back to VeriTrace. You've stacked three canvases — from a consumer app to a B2B compliance engine." },
  { id: uid(), role: "user", text: "We now sell to CFOs and sustainability managers at manufacturers." },
  {
    id: uid(),
    role: "coach",
    text: "Your v2.0 adds a dedicated customer success manager. At €12k per site, how many sites must one CSM carry before that relationship pays for itself?",
    flags: ["Coherence: high-touch relationships need contract values that cover the people cost."],
  },
];

export const demoLog = (): LogEntry[] =>
  [
    { at: "2026-05-28T10:30:00Z", kind: "decision", category: "version", author: "Thandi (CEO)", version: "v2.0", summary: "Pivoted: v2.0 · B2B Compliance Stack", rationale: "LOIs from 3 manufacturers; auditors asked for an assurance pack.", alternatives: "Stay horizontal across all SMEs; sell only via auditors." },
    { at: "2026-05-20T09:00:00Z", kind: "decision", category: "decision", author: "Thandi (CEO)", version: "v1.1", summary: "Price per site, not per user", rationale: "Buyers budget by facility; 4 of 5 interviewees rejected per-seat pricing.", alternatives: "Per-seat pricing; usage-based per tonne CO₂e.", block: "revenue" as const },
    { at: "2026-05-02T15:10:00Z", kind: "change", category: "added", author: "Sipho (Product)", version: "v1.1", summary: "Added “Compliance domain experts” to Key Resources", block: "keyResources" as const },
    { at: "2026-03-17T14:00:00Z", kind: "decision", category: "version", author: "Thandi (CEO)", version: "v1.1", summary: "Pivoted from consumer app to B2B compliance", rationale: "12 consumer interviews: 0 willing to pay. 4 of 5 manufacturers described CSRD reporting as urgent and budgeted." },
    { at: "2026-03-16T11:00:00Z", kind: "decision", category: "status", author: "Sipho (Product)", version: "v1.0", summary: "Marked “Eco-conscious millennials” as invalidated", rationale: "No willingness to pay across 12 interviews.", block: "segments" as const },
    { at: "2026-02-03T09:00:00Z", kind: "change", category: "session", author: "Thandi (CEO)", version: "v1.0", summary: "Created initial canvas" },
  ].map((e) => ({ ...e, id: uid() }) as LogEntry);
