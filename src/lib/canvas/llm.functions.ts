import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Shared Lovable AI is available to signed-in accounts; inference reports service failures. */
export const getServerAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ enabled: true }));

/** Generates one JSON-mode response through Lovable AI for an authenticated account. */
export const serverChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(20000) }))
          .max(30),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const response = await generateResponse({
        model: "openai/gpt-6.1-sol",
        input: data.messages,
        text: { format: { type: "json_object" } },
      }, { signal: AbortSignal.timeout(30_000) });
      const content = response.output.flatMap((item) => item.type === "message"
        ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : [])
        : []).join("\n");
      if (!content.trim()) throw new Error("Lovable AI returned no text");
      return { content, error: null };
    } catch (error) {
      if (error instanceof GatewayError) {
        console.error("[CanvasStack coach] Lovable AI failure", {
          code: error.code, httpStatus: error.httpStatus, outcome: error.outcome, recovery: error.recovery, ids: error.ids,
        });
        if (error.httpStatus === 402) return { content: "", error: "Lovable AI credits are unavailable. Ask the organiser to review the workspace balance." };
      } else {
        console.error("[CanvasStack coach] Lovable AI response failure");
      }
      return { content: "", error: "The shared coach could not complete this request." };
    }
  });
