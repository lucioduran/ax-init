import prompts from 'prompts';
import pc from 'picocolors';
import { Config } from './types';
import { DetectedInfo } from './detect';

const GENERATORS = [
  { title: 'llms.txt', value: 'llms-txt', description: 'LLM-readable site description' },
  { title: 'llms-full.txt', value: 'llms-full-txt', description: 'Extended LLM-readable site content' },
  { title: 'robots.txt (AI rules)', value: 'robots-txt', description: 'AI crawler allow/block rules' },
  { title: 'agent.json', value: 'agent-json', description: 'A2A Agent Card at /.well-known/' },
  { title: 'mcp.json', value: 'mcp-json', description: 'MCP server config at /.well-known/' },
  { title: 'security.txt', value: 'security-txt', description: 'RFC 9116 at /.well-known/' },
  { title: 'Structured Data (JSON-LD)', value: 'structured-data', description: 'HTML snippet for <head>' },
  { title: 'AI Meta Tags', value: 'meta-tags', description: 'HTML snippet for <head>' },
  { title: 'HTTP Headers', value: 'http-headers', description: 'Nginx/Apache/Vercel/Netlify config' },
];

const TYPE_CHOICES = [
  { title: 'Personal', value: 'personal' },
  { title: 'Business', value: 'business' },
  { title: 'API / Developer Tool', value: 'api' },
  { title: 'Blog', value: 'blog' },
];

const POLICY_CHOICES = [
  { title: 'Allow — let AI crawlers index your site', value: 'allow' },
  { title: 'Block — disallow AI crawlers', value: 'block' },
];

export async function runPrompts(detected?: DetectedInfo): Promise<Config | null> {
  const response = await prompts(
    [
      {
        type: detected ? null : 'text',
        name: 'url',
        message: 'Site URL',
        validate: (v: string) => {
          if (!v.trim()) return 'URL is required';
          if (!v.startsWith('http')) return 'URL must start with http:// or https://';
          return true;
        },
        format: (v: string) => v.replace(/\/+$/, ''),
      },
      {
        type: 'text',
        name: 'name',
        message: 'Site name',
        initial: detected?.name || undefined,
        validate: (v: string) => (v.trim() ? true : 'Name is required'),
      },
      {
        type: 'select',
        name: 'type',
        message: 'Site type',
        choices: TYPE_CHOICES,
        initial: detected?.type
          ? TYPE_CHOICES.findIndex((c) => c.value === detected.type)
          : 0,
      },
      {
        type: 'text',
        name: 'description',
        message: 'Brief description (one line)',
        initial: detected?.description || undefined,
        validate: (v: string) => (v.trim() ? true : 'Description is required'),
      },
      {
        type: 'text',
        name: 'contactName',
        message: 'Your name or organization',
        initial: detected?.contactName || undefined,
        validate: (v: string) => (v.trim() ? true : 'Name is required'),
      },
      {
        type: 'text',
        name: 'contactEmail',
        message: 'Contact email',
        initial: detected?.contactEmail || undefined,
        validate: (v: string) => {
          if (!v.trim()) return 'Email is required';
          if (!v.includes('@')) return 'Enter a valid email';
          return true;
        },
      },
      {
        type: 'text',
        name: 'languages',
        message: 'Languages (comma-separated)',
        initial: detected?.languages ? detected.languages.join(', ') : 'en',
      },
      {
        type: 'select',
        name: 'crawlerPolicy',
        message: 'AI crawler policy',
        choices: POLICY_CHOICES,
        initial: detected?.crawlerPolicy === 'block' ? 1 : 0,
      },
      {
        type: 'text',
        name: 'outputDir',
        message: 'Output directory',
        initial: '.',
      },
      {
        type: 'multiselect',
        name: 'generators',
        message: 'Files to generate',
        choices: GENERATORS.map((g) => {
          const existing = detected?.existingFiles.find((f) => f.id === g.value);
          const alreadyExists = existing?.found === true;
          return {
            ...g,
            selected: !alreadyExists,
            description: alreadyExists
              ? `${g.description} ${pc.yellow('(exists)')}`
              : g.description,
          };
        }),
        min: 1,
        hint: detected
          ? '- Space to toggle, Enter to confirm. Existing files are deselected.'
          : '- Space to toggle, Enter to confirm',
      },
    ],
    {
      onCancel: () => {
        process.exit(0);
      },
    },
  );

  // Inject URL when --from was used (prompt was skipped)
  if (detected) {
    response.url = detected.url;
  }

  if (!response.url) return null;

  return {
    ...response,
    languages: response.languages
      .split(',')
      .map((l: string) => l.trim())
      .filter(Boolean),
  } as Config;
}
