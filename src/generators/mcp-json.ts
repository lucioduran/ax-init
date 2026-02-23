import { Config } from '../types';

export function generateMcpJson(config: Config): string {
  const capabilities: Record<string, unknown> = {};

  switch (config.type) {
    case 'api':
      capabilities.tools = [
        {
          name: 'query',
          description: `Query the ${config.name} API`,
        },
      ];
      capabilities.resources = [
        {
          name: 'documentation',
          description: 'API documentation and reference',
          uri: `${config.url}/docs`,
        },
      ];
      break;

    case 'blog':
      capabilities.resources = [
        {
          name: 'articles',
          description: `Blog posts and articles from ${config.name}`,
          uri: `${config.url}/archive`,
        },
      ];
      break;

    case 'business':
      capabilities.resources = [
        {
          name: 'info',
          description: `Information about ${config.name}`,
          uri: config.url,
        },
      ];
      break;

    case 'personal':
      capabilities.resources = [
        {
          name: 'portfolio',
          description: `Portfolio and work by ${config.contactName}`,
          uri: config.url,
        },
      ];
      break;
  }

  const mcpConfig = {
    mcpServers: {
      [config.name.toLowerCase().replace(/\s+/g, '-')]: {
        url: `${config.url}/mcp`,
        name: config.name,
        description: config.description,
        provider: {
          name: config.type === 'personal' ? config.contactName : config.name,
          url: config.url,
        },
        capabilities,
        version: '1.0.0',
      },
    },
  };

  return JSON.stringify(mcpConfig, null, 2) + '\n';
}
