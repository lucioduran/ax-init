import { Config } from '../types';

export function generateOpenApiYaml(config: Config): string {
  const lines: string[] = [];

  lines.push('openapi: 3.0.3');
  lines.push('info:');
  lines.push(`  title: ${config.name}`);
  lines.push(`  description: ${config.description}`);
  lines.push('  version: 1.0.0');
  lines.push('  contact:');
  lines.push(`    name: ${config.contactName}`);
  lines.push(`    email: ${config.contactEmail}`);
  lines.push(`    url: ${config.url}`);
  lines.push('  license:');
  lines.push('    name: Apache 2.0');
  lines.push('    url: https://www.apache.org/licenses/LICENSE-2.0');
  lines.push('');
  lines.push('servers:');
  lines.push(`  - url: ${config.url}`);
  lines.push(`    description: Production`);
  lines.push('');
  lines.push('paths:');
  lines.push('  /:');
  lines.push('    get:');
  lines.push(`      summary: ${config.name} root endpoint`);
  lines.push(`      description: Returns information about the ${config.name} API`);
  lines.push('      responses:');
  lines.push("        '200':");
  lines.push('          description: OK');
  lines.push('          content:');
  lines.push('            application/json:');
  lines.push('              schema:');
  lines.push('                type: object');
  lines.push('                properties:');
  lines.push('                  name:');
  lines.push('                    type: string');
  lines.push('                  version:');
  lines.push('                    type: string');
  lines.push('');
  lines.push('  # TODO: Add your API endpoints here');
  lines.push('  # Example:');
  lines.push('  # /api/resource:');
  lines.push('  #   get:');
  lines.push('  #     summary: List resources');
  lines.push('  #     responses:');
  lines.push("  #       '200':");
  lines.push('  #         description: OK');
  lines.push('');

  return lines.join('\n');
}
