/** Development changelog of the app itself, updated with every change made through Lovable chat. Newest first. */
export interface DevLogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const DEV_LOG: DevLogEntry[] = [
  {
    date: "2026-10-27",
    title: "Collapsible coach panel",
    changes: [
      "New toggle button in the header collapses the Socratic Coach so the canvas fills the whole screen; click again to bring it back.",
    ],
  },
  {
    date: "2026-10-26",
    title: "Canvas-grounded coherence checks",
    changes: [
      "Check coherence reviews all nine blocks using the current working canvas or selected snapshot, without requiring an API key.",
      "Prioritised findings quote actual entries, distinguish untested claims and missing information, and ask specific delivery, pricing, channel and cost questions.",
      "Financial reviews request customer numbers and cost estimates rather than assuming a venture is unprofitable. Unchanged repeat checks do not duplicate chat messages.",
    ],
  },
  {
    date: "2026-10-20",
    title: "App updates log",
    changes: ["Added this “App updates” view so every change made to the app is recorded here."],
  },
  {
    date: "2026-10-20",
    title: "Changelog & Decision Log",
    changes: [
      "Automatic changelog of canvas edits, versions and test cards.",
      "Decision log with manual “Record decision” form, filters and markdown export.",
    ],
  },
  {
    date: "2026-10-20",
    title: "Assumption extraction & testing",
    changes: [
      "Coach surfaces 1–2 underlying assumptions (Desirability / Feasibility / Viability) per answer.",
      "Sticky notes show status badges; clicking shows the underlying assumption.",
      "“Identify My Riskiest Assumption” drafts a Strategyzer Test Card.",
    ],
  },
  {
    date: "2026-10-20",
    title: "Synthetic assumptions",
    changes: ["Per-block lightbulb and “every block” button generate assumptions to test."],
  },
  {
    date: "2026-10-20",
    title: "First release",
    changes: ["Socratic BMC co-pilot with offline coach, optional live AI, versioned canvas stack and test cards."],
  },
];
