# ax-init

**Generate AI Agent Experience (AX) files — companion to [ax-audit](https://github.com/lucioduran/ax-audit).**

`ax-audit` tells you what's missing. `ax-init` generates it.

## Usage

```bash
npx ax-init
```

Interactive CLI that generates:

| File | Description |
|------|-------------|
| `llms.txt` | LLM-readable site description ([llmstxt.org](https://llmstxt.org) spec) |
| `robots.txt` | AI crawler allow/block rules for 22+ known crawlers |
| `.well-known/agent.json` | A2A Agent Card for protocol compliance |
| `.well-known/security.txt` | RFC 9116 security contact file |
| JSON-LD | Structured data `<script>` tag for `<head>` |
| AI Meta Tags | `<meta>` and `<link>` tags for `<head>` |

## How it works

1. Answer 9 questions about your site (URL, name, type, description, contact, languages, crawler policy)
2. Select which files to generate
3. Files are written to your output directory; HTML snippets are printed to the console
4. Run `npx ax-audit` to verify your score

## Example

```
$ npx ax-init

  ax-init — Generate AI Agent Experience files

  Site URL: https://example.com
  Site name: Example
  Site type: Personal
  Brief description: Personal portfolio and blog
  Your name: John Doe
  Contact email: john@example.com
  Languages: en
  AI crawler policy: Allow
  Output directory: ./public
  Files to generate: all

  ✓ public/llms.txt
  ✓ public/robots.txt
  ✓ public/.well-known/agent.json
  ✓ public/.well-known/security.txt

  2 files written

  HTML snippets — copy to your <head>:

  ── Structured Data (JSON-LD) ──
  <script type="application/ld+json">
  ...
  </script>

  ── AI Meta Tags ──
  <meta name="ai:site" content="Example">
  ...

  ──────────────────────────────────────

  Verify your score: npx ax-audit https://example.com
```

## Supported site types

- **Personal** — generates `Person` schema, personal llms.txt
- **Business** — generates `Organization` schema, corporate llms.txt
- **API / Developer Tool** — generates `SoftwareApplication` schema, API-focused llms.txt
- **Blog** — generates `Blog` schema, content-focused llms.txt

## AI crawlers configured

robots.txt rules cover 22 known AI crawlers including:

GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, Google-Extended, Amazonbot, Bytespider, CCBot, PerplexityBot, YouBot, Cohere-ai, anthropic-ai, Meta-ExternalAgent, OAI-SearchBot, and more.

## Requirements

- Node.js 18+

## Related

- **[ax-audit](https://github.com/lucioduran/ax-audit)** — Lighthouse for AI Agents. Audit your AX score.

## License

Apache 2.0
