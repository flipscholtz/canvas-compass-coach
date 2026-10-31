import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "./auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "CanvasStack — Your business model workspace" },
    { name: "description", content: "Sign in to develop your Business Model Canvas, test assumptions and explore your venture journey." },
    { property: "og:title", content: "CanvasStack — Your business model workspace" },
    { property: "og:description", content: "Private scenarios, shared demos and Socratic coaching for your venture." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SignIn,
});