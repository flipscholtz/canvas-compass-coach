import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODELS = ["gpt-4o", "gpt-4o-mini"] as const;

function serverKey() {
  const enabled = (process.env["DEMO_AI_ENABLED"] ?? "").trim().toLowerCase();
  const key = process.env["OPENAI_API_KEY"];
  return enabled === "true" && key ? key : null;
}

/** Tells the browser whether the shared demo key is switched on — never the key itself. */
export const getServerAiStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: !!serverKey(),
}));

/** Proxies one JSON-mode chat completion through the server-held OpenAI key. */
export const serverChat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        model: z.enum(MODELS),
        messages: z
          .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(20000) }))
          .max(30),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    let rawResponse: string | null = null;
    try {
      const key = serverKey();
      if (!key) throw new Error("The shared demo AI is currently switched off.");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: data.model, response_format: { type: "json_object" }, messages: data.messages }),
      });
      rawResponse = await res.text();
      if (!res.ok) throw new Error(`Demo AI request failed (${res.status})`);
      const json = JSON.parse(rawResponse) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Demo AI returned no text");
      return { content, error: null };
    } catch (error) {
      console.error("[CanvasStack coach] Shared AI failure", { error, rawResponse });
      return { content: "", error: "The shared coach could not complete this request." };
    }
  });
