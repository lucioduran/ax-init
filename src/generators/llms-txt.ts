import { Config } from '../types';

export function generateLlmsTxt(config: Config): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push('');
  lines.push(`> ${config.description}`);
  lines.push('');

  lines.push('## About');
  lines.push('');

  switch (config.type) {
    case 'personal':
      lines.push(`${config.name} is a personal website and portfolio of ${config.contactName}.`);
      break;
    case 'business':
      lines.push(`${config.name} is the official website of ${config.contactName}.`);
      break;
    case 'api':
      lines.push(`${config.name} provides API services. ${config.description}`);
      break;
    case 'blog':
      lines.push(`${config.name} is a blog by ${config.contactName}.`);
      break;
  }

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
