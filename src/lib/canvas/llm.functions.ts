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
    const key = serverKey();
    if (!key) throw new Error("The shared demo AI is currently switched off.");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: data.model, response_format: { type: "json_object" }, messages: data.messages }),
    });
    if (!res.ok) throw new Error(`Demo AI request failed (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { content: json.choices?.[0]?.message?.content ?? "{}" };
  });
