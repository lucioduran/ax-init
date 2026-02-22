import prompts from 'prompts';
import { Config } from './types';

const GENERATORS = [
  { title: 'llms.txt', value: 'llms-txt', description: 'LLM-readable site description' },
  { title: 'robots.txt (AI rules)', value: 'robots-txt', description: 'AI crawler allow/block rules' },
  { title: 'agent.json', value: 'agent-json', description: 'A2A Agent Card at /.well-known/' },
  { title: 'security.txt', value: 'security-txt', description: 'RFC 9116 at /.well-known/' },
  { title: 'Structured Data (JSON-LD)', value: 'structured-data', description: 'HTML snippet for <head>' },
  { title: 'AI Meta Tags', value: 'meta-tags', description: 'HTML snippet for <head>' },
];

export async function runPrompts(): Promise<Config | null> {
  const response = await prompts(
    [
      {
        type: 'text',
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
        validate: (v: string) => (v.trim() ? true : 'Name is required'),
      },
      {
        type: 'select',
        name: 'type',
        message: 'Site type',
        choices: [
          { title: 'Personal', value: 'personal' },
          { title: 'Business', value: 'business' },
          { title: 'API / Developer Tool', value: 'api' },
          { title: 'Blog', value: 'blog' },
        ],
      },
      {
        type: 'text',
        name: 'description',
        message: 'Brief description (one line)',
        validate: (v: string) => (v.trim() ? true : 'Description is required'),
      },
      {
        type: 'text',
        name: 'contactName',
        message: 'Your name or organization',
        validate: (v: string) => (v.trim() ? true : 'Name is required'),
      },
      {
        type: 'text',
        name: 'contactEmail',
        message: 'Contact email',
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
        initial: 'en',
      },
      {
        type: 'select',
        name: 'crawlerPolicy',
        message: 'AI crawler policy',
        choices: [
          { title: 'Allow — let AI crawlers index your site', value: 'allow' },
          { title: 'Block — disallow AI crawlers', value: 'block' },
        ],
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
        choices: GENERATORS.map((g) => ({ ...g, selected: true })),
        min: 1,
        hint: '- Space to toggle, Enter to confirm',
      },
    ],
    {
      onCancel: () => {
        process.exit(0);
      },
    }
  );

  if (!response.url) return null;

  return {
    ...response,
    languages: response.languages
      .split(',')
      .map((l: string) => l.trim())
      .filter(Boolean),
  } as Config;
}
