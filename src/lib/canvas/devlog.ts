/** Development changelog of the app itself, updated with every change made through Lovable chat. Newest first. */
export interface DevLogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const DEV_LOG: DevLogEntry[] = [
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
