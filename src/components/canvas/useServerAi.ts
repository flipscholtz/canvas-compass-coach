import { useEffect, useState } from "react";
import { getServerAiStatus } from "@/lib/canvas/llm.functions";

let cached: Promise<boolean> | null = null;

/** True when the backend demo OpenAI key is switched on. */
export function useServerAi() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    cached ??= getServerAiStatus()
      .then((r) => r.enabled)
      .catch(() => false);
    let alive = true;
    void cached.then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
