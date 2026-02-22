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
