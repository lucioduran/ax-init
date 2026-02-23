import { Config, aboutLine } from '../types';

export function generateLlmsTxt(config: Config): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push('');
  lines.push(`> ${config.description}`);
  lines.push('');

  lines.push('## About');
  lines.push('');
  lines.push(aboutLine(config));

  lines.push('');
  lines.push('## Links');
  lines.push('');
  lines.push(`- [Home](${config.url}): Main page`);
  lines.push(`- [About](${config.url}/about): About page`);

  if (config.type === 'api') {
    lines.push(`- [API Documentation](${config.url}/docs): API reference`);
  }

  if (config.type === 'blog') {
    lines.push(`- [Archive](${config.url}/archive): All posts`);
  }

  lines.push('');
  lines.push('## Contact');
  lines.push('');
  lines.push(`- Email: ${config.contactEmail}`);
  lines.push(`- Website: ${config.url}`);
  lines.push('');

  return lines.join('\n');
}
