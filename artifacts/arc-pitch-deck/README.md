# Envelo — Pitch Deck

Web-based investor pitch deck for Envelo, built as a slide-per-component React app.

## Develop

```bash
PORT=5010 BASE_PATH=/ pnpm --filter @workspace/arc-pitch-deck dev
```

## Layout

Slides live in `src/slides/` (one component per slide) with a manifest that controls order and titles.
