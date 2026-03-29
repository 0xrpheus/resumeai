# resumai

a local-first latex resume optimizer. paste a job description, get an ATS-aligned rewrite of your resume sections, compiled to pdf — all in the browser.

## what it does

- **ai rewrite** — sends your experience, projects, and skills sections to gemini with the job description. rewrites bullets to match the job description's tech stack and keywords without fabricating credentials.
- **latex compilation** — compiles via [tectonic](https://tectonic-typesetting.github.io) on a local server. no cloud compiler, no upload.
- **local-first** — your gemini api key and all resume content stay in your browser's localStorage. nothing is stored server-side.
- **editable everything** — every tex file and the ai system prompt are editable directly in the interface.

## stack

- [sveltekit](https://kit.svelte.dev)
- [gemini 2.5 flash](https://ai.google.dev) for rewriting
- [tectonic](https://tectonic-typesetting.github.io) for latex → pdf

## prerequisites

- node 18+
- tectonic installed and on your PATH

```bash
# macos
brew install tectonic

# cargo
cargo install tectonic
```

## getting started

```bash
git clone https://github.com/0xrpheus/resumai
cd resumai
npm install
npm run dev
```

open `http://localhost:5173`.

## usage

1. **set up your resume** — the app loads with a default jake's-resume-style template. edit each file in the sidebar to match your actual resume. changes are auto-saved to localStorage.

2. **add your gemini api key** — paste it in the top-right field. get one at [aistudio.google.com](https://aistudio.google.com). stored in localStorage only, never persisted server-side.

3. **paste a job description** — click the `+ paste job description` button in the topbar.

4. **generate** — hit `generate`. this rewrites experience, projects, and skills to align with the jd, then compiles. or hit `compile only` to skip the rewrite and just render the current tex.

5. **download** — once compiled, hit `↓ download pdf`.

## file structure

```
src/
├── lib/
│   ├── defaults.ts      # default latex templates + ai system prompt
│   └── store.ts         # svelte stores, localStorage persistence
└── routes/
    ├── +page.svelte     # ui
    ├── api/
    │   ├── rewrite/     # gemini api call
    │   └── compile/     # tectonic compilation
```

your resume is structured as:

```
sections/
├── heading.tex
├── education.tex
├── experience.tex    ← rewritten by ai
├── projects.tex      ← rewritten by ai
└── skills.tex        ← rewritten by ai
config.tex
main.tex
```

## customizing the ai prompt

the system prompt gemini receives is editable in the `prompt.md` tab in the sidebar. by default it follows the logic from the original template:

- rewrites experience and projects to match the jd's tech stack
- reorders skills to front-load relevant technologies
- comments/uncomments finance-specific projects when the jd is quant/finance-heavy
- does not fabricate tools or responsibilities beyond what's implied

## hosting

the app is designed for local use. if you want to run it remotely:

- the **compile route** requires a server with tectonic installed and vercel's serverless functions will time out before tectonic finishes. [railway](https://railway.app) or [fly.io](https://fly.io) should work well.
- the **rewrite route** is stateless and can stay on vercel or any edge runtime.

> [!WARNING]
> the compile endpoint executes tectonic on user-supplied LaTeX. LaTeX is turing-complete and can read arbitrary files from the server (e.g. via `\input{}`). tectonic is more restricted than a full texlive install, but this is still a real risk if you expose the server to untrusted users. only deploy publicly if you're comfortable with who has access, or if you add an authentication layer in front of the compile route. for personal or team use this is a non-issue.

## license

mit
