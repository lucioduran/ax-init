import { Config } from '../types';

export function generateStructuredData(config: Config): string {
  const graph: Record<string, unknown>[] = [];

  // WebSite entity (always present)
  graph.push({
    '@type': 'WebSite',
    '@id': `${config.url}/#website`,
    name: config.name,
    url: config.url,
    description: config.description,
    inLanguage: config.languages[0] || 'en',
  });

  // WebPage entity (always present)
  graph.push({
    '@type': 'WebPage',
    '@id': `${config.url}/#webpage`,
    url: config.url,
    name: config.name,
    isPartOf: { '@id': `${config.url}/#website` },
    inLanguage: config.languages[0] || 'en',
  });

  // Type-specific entities
  switch (config.type) {
    case 'personal':
      graph.push({
        '@type': 'Person',
        '@id': `${config.url}/#person`,
        name: config.contactName,
        url: config.url,
        email: config.contactEmail,
        sameAs: [],
      });
      break;

    case 'business':
      graph.push({
        '@type': 'Organization',
        '@id': `${config.url}/#organization`,
        name: config.name,
        url: config.url,
        email: config.contactEmail,
        description: config.description,
        sameAs: [],
      });
      break;

    case 'api':
      graph.push({
        '@type': 'SoftwareApplication',
        '@id': `${config.url}/#software`,
        name: config.name,
        url: config.url,
        applicationCategory: 'DeveloperApplication',
        description: config.description,
        author: {
          '@type': 'Organization',
          name: config.contactName,
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      });
      break;

    case 'blog':
      graph.push({
        '@type': 'Blog',
        '@id': `${config.url}/#blog`,
        name: config.name,
        url: config.url,
        description: config.description,
        inLanguage: config.languages[0] || 'en',
        author: {
          '@type': 'Person',
          name: config.contactName,
        },
      });
      break;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  const script = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;

  return script;
}
