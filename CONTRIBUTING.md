# contributing to resumai

thanks for your interest. this is a small personal tool — contributions are welcome but keep them focused.

## what's worth contributing

- bug fixes
- tectonic compilation edge cases
- ui improvements
- prompt engineering improvements for the ai rewrite
- documentation

## what's probably not worth contributing

- new ai providers (gemini works, adding complexity for alternatives isn't a priority)
- authentication / user accounts (intentionally local-first)
- cloud storage integration (same reason)

## setup

```bash
git clone https://github.com/0xrpheus/resumai
cd resumai
npm install
npm run dev
```

you'll need tectonic installed locally to test compilation. see the readme for install instructions.

## project structure

```
src/lib/defaults.ts          default templates and system prompt
src/lib/store.ts             svelte stores and localStorage logic
src/routes/+page.svelte      entire ui
src/routes/api/rewrite/      gemini rewrite endpoint
src/routes/api/compile/      tectonic compilation endpoint
src/app.css                  global styles and design tokens
```

## making changes

- open an issue before starting large changes so we can discuss direction
- keep prs focused — one thing per pr
- test that `npm run build` passes before submitting
- don't introduce new dependencies without a good reason

## code style

- typescript, no `any` if avoidable
- svelte 5 runes (`$state`, `$derived`, `$effect`) — not the legacy store syntax
- css variables for all colors, never hardcode hex values inline

## submitting

1. fork the repo
2. create a branch: `git checkout -b fix/your-thing`
3. make your changes
4. `npm run build` — must pass clean
5. open a pr with a clear description of what and why

no cla, no contributor agreement. mit license applies to all contributions.
