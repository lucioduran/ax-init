import { Config, escapeHtml } from '../types';

export function generateMetaTags(config: Config): string {
  const tags: string[] = [];

  tags.push('<!-- AI Agent Experience meta tags -->');
  tags.push(`<meta name="ai:site" content="${escapeHtml(config.name)}">`);
  tags.push(`<meta name="ai:purpose" content="${escapeHtml(config.description)}">`);
  tags.push('');

  tags.push('<!-- llms.txt alternate link -->');
  tags.push(`<link rel="alternate" type="text/plain" href="${escapeHtml(config.url)}/llms.txt" title="LLM-readable version">`);
  tags.push('');

  tags.push('<!-- Identity links (add your profiles) -->');
  tags.push(`<!-- <link rel="me" href="https://github.com/YOUR_USERNAME"> -->`);
  tags.push(`<!-- <link rel="me" href="https://twitter.com/YOUR_USERNAME"> -->`);
  tags.push(`<!-- <link rel="me" href="https://linkedin.com/in/YOUR_USERNAME"> -->`);
  tags.push('');

  return tags.join('\n');
}
