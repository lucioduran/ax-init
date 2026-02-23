# ax-init

**Generate AI Agent Experience (AX) files — companion to [ax-audit](https://github.com/lucioduran/ax-audit).**

`ax-audit` tells you what's missing. `ax-init` generates it.

## Usage

```bash
npx ax-init
```

### CLI flags

```bash
npx ax-init                          # Interactive mode
npx ax-init --from <url>             # Detect existing files, pre-fill prompts
npx ax-init --config ax.json         # Non-interactive mode
npx ax-init --dry-run                # Preview without writing files
npx ax-init --save-config            # Save answers to ax.json after prompts
npx ax-init --help                   # Show help
npx ax-init --version                # Show version
```

### Auto-detect mode

Scan an existing site to detect what AX files are already present. Pre-fills prompts with discovered metadata and pre-deselects generators for files that already exist:

```bash
npx ax-init --from https://example.com
```

```
  Scanning https://example.com...

  ✓ llms.txt           found
  ✗ llms-full.txt      not found
  ✓ robots.txt         found (policy: allow)
  ✗ agent.json         not found
  ✗ mcp.json           not found
  ✓ security.txt       found
  ✗ openapi.yaml       not found
  ✓ Structured Data    found
  ✓ AI Meta Tags       found
  ✓ HTTP Headers       found

  Detected: "Example Corp" — business site
  Contact: hello@example.com
  Languages: en, es
```

Prompts are pre-filled with detected values. Only missing files are selected by default.

### Dry run

Preview what would be generated without writing any files:

```bash
npx ax-init --config ax.json --dry-run
npx ax-init --from https://example.com --dry-run
```

### Save config

Save your prompt answers to `ax.json` for future runs with `--config`:

```bash
npx ax-init --save-config
# or combine with --from:
npx ax-init --from https://example.com --save-config
```

### Non-interactive mode

Create an `ax.json` config file and run without prompts — useful for CI/CD:

```json
{
  "url": "https://example.com",
  "name": "My Site",
  "type": "business",
  "description": "A great website",
  "contactName": "Acme Inc",
  "contactEmail": "hello@example.com",
  "languages": ["en"],
  "crawlerPolicy": "allow",
  "outputDir": "./public",
  "generators": ["llms-txt", "llms-full-txt", "robots-txt", "agent-json",
    "mcp-json", "security-txt", "structured-data", "meta-tags", "http-headers"]
}
```

```bash
npx ax-init --config ax.json
```

## Generated files

Interactive CLI that generates:

| File | Description |
|------|-------------|
| `llms.txt` | LLM-readable site description ([llmstxt.org](https://llmstxt.org) spec) |
| `llms-full.txt` | Extended LLM-readable site content with full inline sections |
| `robots.txt` | AI crawler allow/block rules for 29+ known crawlers |
| `.well-known/agent.json` | A2A Agent Card for protocol compliance |
| `.well-known/mcp.json` | MCP server configuration for AI agent discovery |
| `.well-known/security.txt` | RFC 9116 security contact file |
| `openapi.yaml` | OpenAPI 3.0 stub (API type sites only) |
| JSON-LD | Structured data `<script>` tag for `<head>` |
| AI Meta Tags | `<meta>` and `<link>` tags for `<head>` |
| HTTP Headers | Server config snippets for Nginx, Apache, Vercel, Netlify |

## How it works

1. Answer questions about your site (URL, name, type, description, contact, languages, crawler policy)
2. Select which files to generate
3. Files are written to your output directory; snippets are printed to the console
4. Run `npx ax-audit` to verify your score

## Example

```
$ npx ax-init

  ax-init v1.4.0 — Generate AI Agent Experience files

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
  ✓ public/llms-full.txt
  ✓ public/robots.txt
  ✓ public/.well-known/agent.json
  ✓ public/.well-known/mcp.json
  ✓ public/.well-known/security.txt

  6 files written

  Snippets — copy to your config:

  ── Structured Data (JSON-LD) ──
  <script type="application/ld+json">
  ...
  </script>

  ── AI Meta Tags ──
  <meta name="ai:site" content="Example">
  ...

  ── HTTP Headers ──
  # Nginx / Apache / Vercel / Netlify configs
  ...

  ✓ All files validated

  ──────────────────────────────────────

  Verify your score: npx ax-audit https://example.com
  Show only issues:  npx ax-audit https://example.com --only-failures
```

## Supported site types

- **Personal** — generates `Person` schema, personal llms.txt
- **Business** — generates `Organization` schema, corporate llms.txt
- **API / Developer Tool** — generates `SoftwareApplication` schema, API-focused llms.txt, OpenAPI stub
- **Blog** — generates `Blog` schema, content-focused llms.txt

## AI crawlers configured

robots.txt rules cover 29 known AI crawlers including:

GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Gemini, Amazonbot, Grok, xAI-Bot, DeepSeekBot, Meta-ExternalAgent, Meta-ExternalFetcher, PerplexityBot, and more.

## Requirements

- Node.js 18+

## Related

- **[ax-audit](https://github.com/lucioduran/ax-audit)** — Lighthouse for AI Agents. Audit your AX score.

## License

Apache 2.0
