import { Config } from './types';

export interface DetectedFile {
  id: string;
  label: string;
  found: boolean;
  detail?: string;
}

export interface DetectedInfo {
  url: string;
  name: string | null;
  type: Config['type'] | null;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  languages: string[] | null;
  crawlerPolicy: 'allow' | 'block' | null;
  existingFiles: DetectedFile[];
}

// ── Fetch utility ──────────────────────────────────────

const FETCH_TIMEOUT = 10_000;
const MAX_BODY_SIZE = 5 * 1024 * 1024;

interface FetchResult {
  ok: boolean;
  status: number;
  headers: Headers;
  body: string;
}

async function safeFetch(
  url: string,
  method: 'GET' | 'HEAD' = 'GET',
): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ax-init (https://github.com/lucioduran/ax-init)',
        Accept: 'text/html,application/json,text/plain,*/*',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    if (method === 'HEAD') {
      return { ok: response.ok, status: response.status, headers: response.headers, body: '' };
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) return { ok: response.ok, status: response.status, headers: response.headers, body: '' };

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_BODY_SIZE) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const body = chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();

    return { ok: response.ok, status: response.status, headers: response.headers, body };
  } catch {
    return null;
  }
}

// ── Parsers ────────────────────────────────────────────

function parseLlmsTxt(body: string): { name: string | null; description: string | null } {
  let name: string | null = null;
  let description: string | null = null;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!name && trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      name = trimmed.slice(2).trim();
    }
    if (!description && trimmed.startsWith('> ')) {
      description = trimmed.slice(2).trim();
    }
    if (name && description) break;
  }

  return { name, description };
}

function parseRobotsTxt(body: string): { crawlerPolicy: 'allow' | 'block' | null } {
  const aiCrawlers = [
    'gptbot', 'chatgpt-user', 'claudebot', 'claude-web',
    'anthropic-ai', 'google-extended', 'gemini', 'amazonbot',
    'perplexitybot', 'cohere-ai', 'grok', 'deepseekbot',
  ];

  let allowCount = 0;
  let blockCount = 0;
  let currentAgent = '';

  for (const line of body.split('\n')) {
    const trimmed = line.trim().toLowerCase();

    if (trimmed.startsWith('user-agent:')) {
      currentAgent = trimmed.slice('user-agent:'.length).trim();
    } else if (aiCrawlers.some((c) => currentAgent.includes(c))) {
      if (trimmed === 'disallow: /') {
        blockCount++;
      } else if (trimmed.startsWith('allow: /')) {
        allowCount++;
      }
    }
  }

  if (blockCount > 0 && blockCount >= allowCount) return { crawlerPolicy: 'block' };
  if (allowCount > 0) return { crawlerPolicy: 'allow' };
  return { crawlerPolicy: null };
}

function parseAgentJson(body: string): {
  name: string | null;
  description: string | null;
  contactEmail: string | null;
} {
  try {
    const data = JSON.parse(body);
    return {
      name: typeof data.name === 'string' ? data.name : null,
      description: typeof data.description === 'string' ? data.description : null,
      contactEmail:
        typeof data.contact === 'string' && data.contact.includes('@') ? data.contact : null,
    };
  } catch {
    return { name: null, description: null, contactEmail: null };
  }
}

function parseSecurityTxt(body: string): {
  contactEmail: string | null;
  languages: string[] | null;
} {
  let contactEmail: string | null = null;
  let languages: string[] | null = null;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();

    if (!contactEmail && trimmed.toLowerCase().startsWith('contact:')) {
      const value = trimmed.slice('contact:'.length).trim();
      const email = value.replace(/^mailto:/i, '');
      if (email.includes('@')) {
        contactEmail = email;
      }
    }

    if (!languages && trimmed.toLowerCase().startsWith('preferred-languages:')) {
      const value = trimmed.slice('preferred-languages:'.length).trim();
      languages = value
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  return { contactEmail, languages };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function parseHtml(body: string): {
  name: string | null;
  description: string | null;
  type: Config['type'] | null;
  contactName: string | null;
} {
  let name: string | null = null;
  let description: string | null = null;
  let type: Config['type'] | null = null;
  let contactName: string | null = null;

  // ── Meta tags ──

  // og:site_name (both attribute orderings)
  const siteNameMatch =
    body.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
    body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  if (siteNameMatch) {
    name = decodeHtmlEntities(siteNameMatch[1]);
  }

  // og:description
  const ogDescMatch =
    body.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
  if (ogDescMatch) {
    description = decodeHtmlEntities(ogDescMatch[1]);
  }

  // fallback: meta name="description"
  if (!description) {
    const descMatch =
      body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (descMatch) {
      description = decodeHtmlEntities(descMatch[1]);
    }
  }

  // fallback: <title> tag for name
  if (!name) {
    const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      name = decodeHtmlEntities(titleMatch[1]).split(/[|\-–—]/)[0].trim();
    }
  }

  // ── JSON-LD ──

  const jsonLdRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;

  while ((jsonLdMatch = jsonLdRegex.exec(body)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const entities: Record<string, unknown>[] = data['@graph'] || [data];

      for (const entity of entities) {
        const entityType = entity['@type'] as string | undefined;
        if (!entityType) continue;

        if (entityType === 'SoftwareApplication' || entityType === 'WebAPI') {
          type = 'api';
          if (!name && typeof entity.name === 'string') name = entity.name;
          if (!description && typeof entity.description === 'string')
            description = entity.description;
        } else if (entityType === 'Blog') {
          if (!type) type = 'blog';
          if (!name && typeof entity.name === 'string') name = entity.name;
        } else if (entityType === 'Person') {
          if (!type) type = 'personal';
          if (!contactName && typeof entity.name === 'string') contactName = entity.name;
        } else if (entityType === 'Organization') {
          if (!type) type = 'business';
          if (!contactName && typeof entity.name === 'string') contactName = entity.name;
          if (!name && typeof entity.name === 'string') name = entity.name;
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return { name, description, type, contactName };
}

// ── Main detect function ───────────────────────────────

export async function detect(inputUrl: string): Promise<DetectedInfo> {
  const url = inputUrl.replace(/\/+$/, '');

  const info: DetectedInfo = {
    url,
    name: null,
    type: null,
    description: null,
    contactName: null,
    contactEmail: null,
    languages: null,
    crawlerPolicy: null,
    existingFiles: [],
  };

  // Fire all fetches in parallel
  const [head, html, llmsTxt, llmsFullTxt, robotsTxt, agentJson, mcpJson, securityTxt, openapiYaml, openapiJson] =
    await Promise.all([
      safeFetch(url, 'HEAD'),
      safeFetch(url),
      safeFetch(`${url}/llms.txt`),
      safeFetch(`${url}/llms-full.txt`, 'HEAD'),
      safeFetch(`${url}/robots.txt`),
      safeFetch(`${url}/.well-known/agent.json`),
      safeFetch(`${url}/.well-known/mcp.json`, 'HEAD'),
      safeFetch(`${url}/.well-known/security.txt`),
      safeFetch(`${url}/openapi.yaml`, 'HEAD'),
      safeFetch(`${url}/openapi.json`, 'HEAD'),
    ]);

  const hasOpenapi = !!openapiYaml?.ok || !!openapiJson?.ok;

  // ── Build existingFiles ──

  // Check HTML-based detections
  let hasJsonLd = false;
  let hasAiMeta = false;
  let hasLinkHeader = false;

  if (html?.ok) {
    hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html.body);
    hasAiMeta =
      /<meta[^>]+name=["']ai:/i.test(html.body) ||
      /<link[^>]+rel=["']alternate["'][^>]+llms\.txt/i.test(html.body);
  }

  if (head?.ok) {
    const linkHeader = head.headers.get('link');
    if (linkHeader && (linkHeader.includes('llms.txt') || linkHeader.includes('agent.json'))) {
      hasLinkHeader = true;
    }
  }

  info.existingFiles = [
    { id: 'llms-txt', label: 'llms.txt', found: !!llmsTxt?.ok },
    { id: 'llms-full-txt', label: 'llms-full.txt', found: !!llmsFullTxt?.ok },
    { id: 'robots-txt', label: 'robots.txt', found: !!robotsTxt?.ok },
    { id: 'agent-json', label: 'agent.json', found: !!agentJson?.ok },
    { id: 'mcp-json', label: 'mcp.json', found: !!mcpJson?.ok },
    { id: 'security-txt', label: 'security.txt', found: !!securityTxt?.ok },
    { id: 'openapi-yaml', label: 'openapi.yaml', found: hasOpenapi },
    { id: 'structured-data', label: 'Structured Data', found: hasJsonLd },
    { id: 'meta-tags', label: 'AI Meta Tags', found: hasAiMeta },
    { id: 'http-headers', label: 'HTTP Headers', found: hasLinkHeader },
  ];

  // ── Extract metadata (priority order) ──

  // Priority 1: agent.json
  if (agentJson?.ok) {
    const parsed = parseAgentJson(agentJson.body);
    info.name = parsed.name;
    info.description = parsed.description;
    info.contactEmail = parsed.contactEmail;
  }

  // Priority 2: security.txt
  if (securityTxt?.ok) {
    const parsed = parseSecurityTxt(securityTxt.body);
    if (!info.contactEmail && parsed.contactEmail) info.contactEmail = parsed.contactEmail;
    if (parsed.languages) info.languages = parsed.languages;
  }

  // Priority 3: llms.txt
  if (llmsTxt?.ok) {
    const parsed = parseLlmsTxt(llmsTxt.body);
    if (!info.name && parsed.name) info.name = parsed.name;
    if (!info.description && parsed.description) info.description = parsed.description;
  }

  // Priority 4: HTML (meta tags + JSON-LD)
  if (html?.ok) {
    const parsed = parseHtml(html.body);
    if (!info.name && parsed.name) info.name = parsed.name;
    if (!info.description && parsed.description) info.description = parsed.description;
    if (!info.type && parsed.type) info.type = parsed.type;
    if (!info.contactName && parsed.contactName) info.contactName = parsed.contactName;
  }

  // Priority 5: robots.txt
  if (robotsTxt?.ok) {
    const parsed = parseRobotsTxt(robotsTxt.body);
    if (parsed.crawlerPolicy) {
      info.crawlerPolicy = parsed.crawlerPolicy;
      const rtFile = info.existingFiles.find((f) => f.id === 'robots-txt')!;
      rtFile.detail = `policy: ${parsed.crawlerPolicy}`;
    }
  }

  // Type inference from openapi
  if (!info.type && hasOpenapi) {
    info.type = 'api';
  }

  return info;
}
