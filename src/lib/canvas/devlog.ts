/** Development changelog of the app itself, updated with every change made through Lovable chat. Newest first. */
export interface DevLogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const DEV_LOG: DevLogEntry[] = [
  {
    date: "2026-10-30",
    title: "Tour brought up to date",
    changes: ["The tour now covers the coach's reply style and help requests, the stage list, numbered blocks and evidence for Validated notes, the quick action pills and Skip link, the Explore menu, the new pivot steps, protected demos and the (i) disclaimer."],
  },
  {
    date: "2026-10-30",
    title: "Phone-friendly coach chat",
    changes: ["On phones only the message list scrolls; the chat box stays pinned at the bottom, above the keyboard and clear of the home bar, and jumps to the newest message.", "The advice disclaimer moved to the tour and a small (i) button in the header.", "The stage label opens a list of all five stages.", "Buttons are at least 44px tall on phones, the chat box uses 16px text to stop zooming, and notifications appear at the top away from the chat box."],
  },
  {
    date: "2026-10-30",
    title: "Stage indicator follows the current block",
    changes: ["The stage shown above the coach now matches the block being discussed, so Key Resources, Activities and Partners show Feasibility and Cost Structure shows Viability, even if that means moving back a stage."],
  },
  {
    date: "2026-10-30",
    title: "Coach follows the recommended canvas order",
    changes: ["The coach now works through Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partners and Cost Structure.", "Before the value proposition it asks about the customer's jobs, pains and gains.", "Each new block opens with one sentence explaining how it builds on the earlier ones.", "Canvas blocks show their order number, and the block the coach is working on is highlighted.", "Jumping ahead before customers and value propositions have content gets a gentle recommendation to go back, which you can override; stage summaries mention empty or thin blocks."],
  },
  {
    date: "2026-10-30",
    title: "Quieter coach actions",
    changes: ["Riskiest assumption, Coherence check and Challenge VP are now small outlined pills in one scrollable row above the chat box, each with a one-line tooltip (long-press on mobile).", "When an action becomes relevant the coach suggests it in one sentence and that pill is highlighted until you use it or the chat moves on.", "Skip is now a 'Not sure yet? Skip for now' link that records the topic as an untested assumption."],
  },
  {
    date: "2026-10-30",
    title: "Canvas-first workspace",
    changes: ["The canvas now takes two-thirds of the desktop workspace, with a smaller coach that collapses to a slim tab; on mobile the coach opens over only the bottom 60% of the screen.", "Explore holds Journey, Changelog & Decisions and Experiments; Versions gathers history, snapshots, pivots, exports and saved versions.", "The discussed block is highlighted, changed stickies briefly glow, and coach drafts show inline confirmations. Stage progress is compact and chat has one scrolling message list."],
  },
  {
    date: "2026-10-30",
    title: "Coach leads like a workshop facilitator",
    changes: ["Live and offline replies reflect your words, add useful BMC guidance and end with one focused question.", "Partial answers become provisional drafts; help stays conversational and stage transitions ask permission before moving on."],
  },
  {
    date: "2026-10-30",
    title: "Practical help when evidence is missing",
    changes: ["Data requests now get source types, three search phrases and a cheap first-hand test for this week; the coach clearly says it cannot browse live.", "Examples, clarification and ‘I don't know’ receive practical guidance and one follow-up question.", "Yes / Not now lets you choose whether to record the proposed untested assumption and create a Test Card; nothing is added without consent."],
  },
  {
    date: "2026-10-30",
    title: "Coach chat no longer gets stuck on blank replies",
    changes: ["The coach shows ‘Coach is thinking…’ while waiting and a friendly reply with Retry after a failure or 30 seconds.", "Empty or malformed AI replies cannot create blank messages; the input stays usable after failures.", "Questions, requests for data, help and acknowledgements are handled without adding them as venture facts. Diagnostic failures include the raw AI reply, never the key."],
  },
  {
    date: "2026-10-28",
    title: "Tour now covers the Experiment Designer",
    changes: ["The \"Test what matters\" step of the welcome tour mentions the Experiment Designer and what its interview call sheet contains."],
  },
  {
    date: "2026-10-28",
    title: "Clearer snapshots, pivots and version history",
    changes: ["Commit snapshot is now Save snapshot, with a clear distinction between refining the same model and exploring a new direction.", "A short help dialog explains what is copied, which blocks to rethink, and how Log and Journey record pivots.", "History now opens saved versions directly; read-only labels and a return button make revisiting earlier points clearer. New snapshots and pivots are available on the working canvas."],
  },
  {
    date: "2026-10-28",
    title: "Experiment designer moved to Testing",
    changes: ["The interview call sheet is now called \"Experiment designer\".", "It moved from the Journey tab to the Testing tab, next to Test Cards."],
  },
  {
    date: "2026-10-27",
    title: "Smarter Fork pivot",
    changes: ["Fork pivot now asks: 'I know my pivot' or 'Suggest a pattern' (after 5 blocks have content).", "The coach names the closest Business Model Generation pattern, suggests an alternative and asks which blocks would change.", "Blocks expected to change are outlined on the new version; the reason is recorded in the Log and Journey tabs."],
  },
  {
    date: "2026-10-27",
    title: "Verdicts need evidence",
    changes: ["Marking a sticky note Validated or Invalidated now asks which test and what result back it up.", "The evidence is saved on the note, written to the decision log and shown in coherence checks."],
  },
  {
    date: "2026-10-27",
    title: "Coach and canvas polish",
    changes: [
      "The coach now opens with \"Who is this for, and what job or pain do they have?\" and asks \"How do you know?\" before any product talk.",
      "Prices you mention (e.g. \"R2000 a month\") are added to Revenue Streams even mid-conversation.",
      "The stage bar only moves forward; replies that decline a request no longer show assumption chips.",
      "Coherence checks show the top 3 findings, with the rest behind a toggle.",
      "The sticky-note edit popup stays on screen; demo ventures are locked and can be brought back with \"Restore demos\".",
      "Fixed the \"hypothesises\" typo in Journey.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Shared demo AI",
    changes: ["The coach can use a shared AI key kept on the server, switched on or off for demos.", "Your own key in Settings still takes priority."],
  },
  {
    date: "2026-10-27",
    title: "Fixed doubled assumption wording",
    changes: ["Assumptions no longer read \"We believe that we believe that …\" — the duplicate prefix is stripped wherever assumptions are shown or turned into Test Cards."],
  },
  {
    date: "2026-10-27",
    title: "Welcome tour",
    changes: ["A short welcome tour opens the first time the app is opened, covering the coach, canvas, testing, versions, scenarios and log.", "Reopen it any time with the Tour button in the header.", "The tour is now live: each step highlights the relevant part of the screen with its card beside it."],
  },
  {
    date: "2026-10-27",
    title: "Experiment designer: interview call sheet",
    changes: [
      "Pick untested assumptions from the current canvas and print an interview call sheet.",
      "The sheet includes the ideal persona, a screener, opening script, questions per assumption, signals to listen for, and logistics.",
      "Open it from the Journey tab: Interview call sheet.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Saved scenarios",
    changes: [
      "Scenarios button lists saved scenarios to load or delete; Save stores the current one by name in this browser.",
      "Comes with two demos: VeriTrace (carbon ESG SaaS) and LearnLoop (matric exam-prep tutoring).",
      "New Scenario replaces Reset and starts a blank, named canvas.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Printable BMC report",
    changes: ["New PDF report button on the Journey tab: a cover with the journey, one full canvas per version, and insights with next-direction questions, ready to print or save as PDF."],
  },
  {
    date: "2026-10-27",
    title: "Business model journey view",
    changes: [
      "New Journey tab compares every canvas version: what was added or dropped, pivots, the blocks you changed most, and hypotheses dropped after being invalidated.",
      "Highlights validated foundations, assumptions carried untested since the first version, and unexplored blocks, then asks questions to guide your next direction.",
    ],
  },
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
