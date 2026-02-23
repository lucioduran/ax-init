import { Config, aboutLine } from '../types';

export function generateLlmsFullTxt(config: Config): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push('');
  lines.push(`> ${config.description}`);
  lines.push('');

  // ── About ──

  lines.push('## About');
  lines.push('');
  lines.push(aboutLine(config));
  lines.push('');

  switch (config.type) {
    case 'personal':
      lines.push(`This site showcases the work, projects, and ideas of ${config.contactName}. ` +
        `Visitors can learn more about their background, skills, and interests.`);
      break;
    case 'business':
      lines.push(`${config.contactName} provides products and services described at ${config.url}. ` +
        `The site contains information about the company, its offerings, and how to get in touch.`);
      break;
    case 'api':
      lines.push(`Developers can integrate with ${config.name} using the REST API. ` +
        `Full documentation, authentication details, and endpoint references are available on the site.`);
      break;
    case 'blog':
      lines.push(`This blog covers topics of interest to ${config.contactName} and their audience. ` +
        `New content is published regularly and can be browsed by category or date.`);
      break;
  }

  lines.push('');

  // ── Home ──

  lines.push('## Home');
  lines.push('');
  lines.push(`The home page of ${config.name} is located at ${config.url}.`);
  lines.push('');
  lines.push(`${config.description}`);
  lines.push('');

  // ── Type-specific sections ──

  if (config.type === 'personal') {
    lines.push('## Portfolio');
    lines.push('');
    lines.push(`${config.contactName} maintains a portfolio of work and projects. ` +
      `Visit ${config.url}/about for background information and ${config.url}/projects for project details.`);
    lines.push('');
  }

  if (config.type === 'business') {
    lines.push('## Services');
    lines.push('');
    lines.push(`${config.contactName} offers products and services through ${config.name}. ` +
      `Visit ${config.url}/about for company information.`);
    lines.push('');
  }

  if (config.type === 'api') {
    lines.push('## API Documentation');
    lines.push('');
    lines.push(`${config.name} exposes a REST API for developers. ` +
      `The API documentation is available at ${config.url}/docs.`);
    lines.push('');
    lines.push('### Authentication');
    lines.push('');
    lines.push('API access requires authentication. Refer to the documentation for details on obtaining and using API keys.');
    lines.push('');
    lines.push('### Endpoints');
    lines.push('');
    lines.push('See the full endpoint reference at the API documentation page. ' +
      'An OpenAPI specification may be available at /openapi.yaml.');
    lines.push('');
  }

  if (config.type === 'blog') {
    lines.push('## Archive');
    lines.push('');
    lines.push(`All posts are available at ${config.url}/archive. ` +
      `Content is organized by date and topic for easy browsing.`);
    lines.push('');
  }

  // ── Contact ──

  lines.push('## Contact');
  lines.push('');
  lines.push(`- Name: ${config.contactName}`);
  lines.push(`- Email: ${config.contactEmail}`);
  lines.push(`- Website: ${config.url}`);
  lines.push('');

  // ── Languages ──

  if (config.languages.length > 0) {
    lines.push('## Languages');
    lines.push('');
    lines.push(`This site is available in: ${config.languages.join(', ')}.`);
    lines.push('');
  }

  return lines.join('\n');
}
