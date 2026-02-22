import { Config } from '../types';

export function generateAgentJson(config: Config): string {
  const capabilities: string[] = ['web-browsing'];

  switch (config.type) {
    case 'api':
      capabilities.push('api-access', 'data-retrieval');
      break;
    case 'blog':
      capabilities.push('content-retrieval');
      break;
    case 'business':
      capabilities.push('data-retrieval', 'content-retrieval');
      break;
    case 'personal':
      capabilities.push('content-retrieval');
      break;
  }

  const agentCard = {
    name: config.name,
    description: config.description,
    url: config.url,
    provider: {
      organization: config.type === 'personal' ? config.contactName : config.name,
      url: config.url,
    },
    version: '1.0.0',
    capabilities,
    documentationUrl: config.type === 'api' ? `${config.url}/docs` : config.url,
    contact: config.contactEmail,
  };

  return JSON.stringify(agentCard, null, 2) + '\n';
}
