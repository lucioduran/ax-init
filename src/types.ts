export interface Config {
  url: string;
  name: string;
  type: 'personal' | 'business' | 'api' | 'blog';
  description: string;
  contactName: string;
  contactEmail: string;
  languages: string[];
  crawlerPolicy: 'allow' | 'block';
  outputDir: string;
  generators: string[];
}

/** Return the one-line About summary for each site type. */
export function aboutLine(config: Config): string {
  switch (config.type) {
    case 'personal':
      return `${config.name} is a personal website and portfolio of ${config.contactName}.`;
    case 'business':
      return `${config.name} is the official website of ${config.contactName}.`;
    case 'api':
      return `${config.name} provides API services. ${config.description}`;
    case 'blog':
      return `${config.name} is a blog by ${config.contactName}.`;
  }
}

/** Escape special characters for safe HTML attribute embedding. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
