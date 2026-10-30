<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Workspace feedback is transient presentation state derived from canvas differences and the current coach question; layout never changes persisted coaching or version semantics.
- Recognized help requests use the same pure, contextual helper in live and offline chat because the current completion setup has no browsing tools; saving proposals is an atomic, version-scoped, idempotent store action requiring explicit consent.
- Coach turns use a bounded, validated response boundary and explicit retry metadata referencing the original user message, so failures cannot create blank replies, duplicate user turns or late canvas updates.
- All app state lives in a client-side zustand store (src/lib/canvas/store.ts) persisted to localStorage: guest mode with no backend or sign-in is a hard requirement.
- The offline coach (src/lib/canvas/coach.ts) is pure, deterministic functions so its rules stay unit-testable.
- Shared pure facilitation helpers define the live prompt and local reply shape; offline stage transitions use the existing chat history to request consent before advancing, avoiding a second progress state.
- Explicit coherence reviews use the pure local analyzer in src/lib/canvas/coherence.ts via the existing store, independent of optional AI settings; content/status fingerprints prevent repeated unchanged reports and the selected version supplies the reviewed canvas.
