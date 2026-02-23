import { Config } from './types';

export interface ValidationResult {
  generator: string;
  label: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGenerated(
  generatorId: string,
  label: string,
  content: string,
  config: Config,
): ValidationResult {
  const result: ValidationResult = {
    generator: generatorId,
    label,
    ok: true,
    errors: [],
    warnings: [],
  };

  switch (generatorId) {
    case 'llms-txt':
    case 'llms-full-txt':
      validateLlmsTxt(content, config, result);
      break;
    case 'robots-txt':
      validateRobotsTxt(content, config, result);
      break;
    case 'agent-json':
      validateAgentJson(content, result);
      break;
    case 'mcp-json':
      validateMcpJson(content, result);
      break;
    case 'security-txt':
      validateSecurityTxt(content, result);
      break;
    case 'openapi-yaml':
      validateOpenApiYaml(content, result);
      break;
    case 'structured-data':
      validateStructuredData(content, result);
      break;
    case 'meta-tags':
      validateMetaTags(content, result);
      break;
    case 'http-headers':
      validateHttpHeaders(content, result);
      break;
  }

  result.ok = result.errors.length === 0;
  return result;
}

// ── Validators ──────────────────────────────────────────

function validateLlmsTxt(content: string, config: Config, r: ValidationResult): void {
  if (!content.startsWith('# ')) {
    r.errors.push('Must start with an H1 heading (# Title)');
  }

  if (!content.includes('> ')) {
    r.warnings.push('Missing blockquote description (> ...)');
  }

  if (!content.includes(config.url)) {
    r.warnings.push('Does not reference the site URL');
  }
}

function validateRobotsTxt(content: string, _config: Config, r: ValidationResult): void {
  if (!content.includes('User-agent:')) {
    r.errors.push('Missing User-agent directive');
  }

  const hasAllow = content.includes('Allow: /');
  const hasDisallow = content.includes('Disallow: /');

  if (!hasAllow && !hasDisallow) {
    r.errors.push('Missing Allow or Disallow directive');
  }

  if (!content.includes('Sitemap:')) {
    r.warnings.push('Missing Sitemap directive');
  }
}

function validateAgentJson(content: string, r: ValidationResult): void {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    r.errors.push('Invalid JSON');
    return;
  }

  const required = ['name', 'description', 'url', 'version'];
  for (const field of required) {
    if (!data[field]) {
      r.errors.push(`Missing required field: ${field}`);
    }
  }

  if (!data.provider || typeof data.provider !== 'object') {
    r.warnings.push('Missing provider object');
  }

  if (!data.contact) {
    r.warnings.push('Missing contact field');
  }
}

function validateMcpJson(content: string, r: ValidationResult): void {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    r.errors.push('Invalid JSON');
    return;
  }

  if (!data.mcpServers || typeof data.mcpServers !== 'object') {
    r.errors.push('Missing mcpServers object');
    return;
  }

  const servers = data.mcpServers as Record<string, unknown>;
  const keys = Object.keys(servers);

  if (keys.length === 0) {
    r.errors.push('mcpServers is empty');
    return;
  }

  const first = servers[keys[0]] as Record<string, unknown>;
  if (!first.url) r.warnings.push('Server entry missing url');
  if (!first.name) r.warnings.push('Server entry missing name');
  if (!first.description) r.warnings.push('Server entry missing description');
}

function validateSecurityTxt(content: string, r: ValidationResult): void {
  if (!content.includes('Contact:')) {
    r.errors.push('Missing required Contact field (RFC 9116)');
  }

  if (!content.includes('Expires:')) {
    r.errors.push('Missing required Expires field (RFC 9116)');
  }

  // Validate Expires date is in the future
  const expiresMatch = content.match(/Expires:\s*(.+)/);
  if (expiresMatch) {
    const expiresDate = new Date(expiresMatch[1].trim());
    if (isNaN(expiresDate.getTime())) {
      r.errors.push('Expires field has an invalid date format');
    } else if (expiresDate <= new Date()) {
      r.warnings.push('Expires date is in the past');
    }
  }

  if (!content.includes('Canonical:')) {
    r.warnings.push('Missing Canonical field');
  }
}

function validateOpenApiYaml(content: string, r: ValidationResult): void {
  if (!content.includes('openapi:')) {
    r.errors.push('Missing openapi version field');
  }

  if (!content.includes('info:')) {
    r.errors.push('Missing info section');
  }

  if (!content.includes('paths:')) {
    r.errors.push('Missing paths section');
  }

  if (!content.includes('servers:')) {
    r.warnings.push('Missing servers section');
  }
}

function validateStructuredData(content: string, r: ValidationResult): void {
  if (!content.includes('<script type="application/ld+json">')) {
    r.errors.push('Missing <script type="application/ld+json"> wrapper');
    return;
  }

  // Extract JSON from script tag
  const jsonMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!jsonMatch) {
    r.errors.push('Could not extract JSON-LD content');
    return;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch {
    r.errors.push('Invalid JSON inside script tag');
    return;
  }

  if (data['@context'] !== 'https://schema.org') {
    r.errors.push('Missing or incorrect @context (expected https://schema.org)');
  }

  if (!data['@graph'] || !Array.isArray(data['@graph'])) {
    r.warnings.push('Missing @graph array');
  }
}

function validateMetaTags(content: string, r: ValidationResult): void {
  if (!content.includes('name="ai:site"')) {
    r.errors.push('Missing ai:site meta tag');
  }

  if (!content.includes('name="ai:purpose"')) {
    r.warnings.push('Missing ai:purpose meta tag');
  }

  if (!content.includes('rel="alternate"') || !content.includes('llms.txt')) {
    r.warnings.push('Missing llms.txt alternate link');
  }
}

function validateHttpHeaders(content: string, r: ValidationResult): void {
  if (!content.includes('X-Robots-Tag')) {
    r.warnings.push('Missing X-Robots-Tag header');
  }

  if (!content.includes('Link')) {
    r.warnings.push('Missing Link header');
  }

  if (!content.includes('Nginx') && !content.includes('Apache') && !content.includes('Vercel') && !content.includes('Netlify')) {
    r.warnings.push('Missing server configuration sections');
  }
}
