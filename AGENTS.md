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

## TV board layout contract

The guest board (`src/routes/index.tsx` + `src/styles.css`) is digital
signage, not a responsive page:

- Everything renders inside `.tv-stage`, a fixed **1920×1080** logical
  canvas. `TvStage` applies one uniform `contain` scale from real
  `window.innerWidth/innerHeight` measurements (browser zoom / OS scaling
  included). Never add `vw`/`vh`/`clamp()` sizing or viewport `@media`
  breakpoints inside the stage — regression tests in
  `src/routes/index.test.tsx` forbid them.
- Critical content stays inside the safe area (`.main-layout` padding:
  48–64 px) to survive TV overscan.
- Financial values (`.product-price`, `.product-original-price`,
  `.product-card__change`) must never use `text-overflow: ellipsis`,
  `overflow: hidden`, or flex shrinking. Only `.product-name` (2 lines) and
  `.product-category` (1 line) may truncate.

Verify with `npm run typecheck && npm run lint && npm run test && npm run build`.
