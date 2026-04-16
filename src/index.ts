#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPrompts } from './prompts';
import { Config } from './types';
import { detect, DetectedInfo } from './detect';
import { generateLlmsTxt } from './generators/llms-txt';
import { generateRobotsTxt } from './generators/robots-txt';
import { generateAgentJson } from './generators/agent-json';
import { generateMcpJson } from './generators/mcp-json';
import { generateSecurityTxt } from './generators/security-txt';
import { generateStructuredData } from './generators/structured-data';
import { generateMetaTags } from './generators/meta-tags';
import { generateHttpHeaders } from './generators/http-headers';
import { generateOpenApiYaml } from './generators/openapi-yaml';
import { generateLlmsFullTxt } from './generators/llms-full-txt';
import { validateGenerated, ValidationResult } from './validate';
import { runUpdate } from './update';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: VERSION } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string };

import type { GeneratorEntry } from './update';

const GENERATORS: GeneratorEntry[] = [
  {
    id: 'llms-txt',
    label: 'llms.txt',
    filePath: 'llms.txt',
    generate: generateLlmsTxt,
  },
  {
    id: 'llms-full-txt',
    label: 'llms-full.txt',
    filePath: 'llms-full.txt',
    generate: generateLlmsFullTxt,
  },
  {
    id: 'robots-txt',
    label: 'robots.txt',
    filePath: 'robots.txt',
    generate: generateRobotsTxt,
  },
  {
    id: 'agent-json',
    label: 'agent.json',
    filePath: '.well-known/agent.json',
    generate: generateAgentJson,
  },
  {
    id: 'mcp-json',
    label: 'mcp.json',
    filePath: '.well-known/mcp.json',
    generate: generateMcpJson,
  },
  {
    id: 'security-txt',
    label: 'security.txt',
    filePath: '.well-known/security.txt',
    generate: generateSecurityTxt,
  },
  {
    id: 'openapi-yaml',
    label: 'openapi.yaml',
    filePath: 'openapi.yaml',
    generate: generateOpenApiYaml,
    condition: (config) => config.type === 'api',
  },
  {
    id: 'structured-data',
    label: 'Structured Data (JSON-LD)',
    filePath: null,
    generate: generateStructuredData,
  },
  {
    id: 'meta-tags',
    label: 'AI Meta Tags',
    filePath: null,
    generate: generateMetaTags,
  },
  {
    id: 'http-headers',
    label: 'HTTP Headers',
    filePath: null,
    generate: generateHttpHeaders,
  },
];

function printHelp(): void {
  console.log('');
  console.log(pc.bold('  ax-init') + pc.dim(` v${VERSION}`));
  console.log('');
  console.log('  Generate AI Agent Experience (AX) files for your website.');
  console.log('  Companion tool to ax-audit.');
  console.log('');
  console.log(pc.bold('  Usage:'));
  console.log('');
  console.log('    npx ax-init                        Interactive mode');
  console.log('    npx ax-init --from <url>            Detect existing files, pre-fill prompts');
  console.log('    npx ax-init --config ax.json        Non-interactive mode');
  console.log('    npx ax-init --dry-run               Preview without writing files');
  console.log('    npx ax-init --save-config            Save answers to ax.json after prompts');
  console.log('    npx ax-init --update --config ax.json  Re-generate and update existing files');
  console.log('    npx ax-init --help                  Show this help');
  console.log('    npx ax-init --version               Show version');
  console.log('');
  console.log(pc.bold('  Config file format (ax.json):'));
  console.log('');
  console.log(pc.dim('    {'));
  console.log(pc.dim('      "url": "https://example.com",'));
  console.log(pc.dim('      "name": "My Site",'));
  console.log(pc.dim('      "type": "business",'));
  console.log(pc.dim('      "description": "A great website",'));
  console.log(pc.dim('      "contactName": "Acme Inc",'));
  console.log(pc.dim('      "contactEmail": "hello@example.com",'));
  console.log(pc.dim('      "languages": ["en"],'));
  console.log(pc.dim('      "crawlerPolicy": "allow",'));
  console.log(pc.dim('      "outputDir": ".",'));
  console.log(pc.dim('      "generators": ["llms-txt", "llms-full-txt", "robots-txt",'));
  console.log(pc.dim('        "agent-json", "mcp-json", "security-txt",'));
  console.log(pc.dim('        "structured-data", "meta-tags", "http-headers"]'));
  console.log(pc.dim('    }'));
  console.log('');
  console.log(pc.bold('  Generators:'));
  console.log('');
  console.log('    llms-txt          LLM-readable site description');
  console.log('    llms-full-txt     Extended LLM-readable site content');
  console.log('    robots-txt        AI crawler allow/block rules');
  console.log('    agent-json        A2A Agent Card at /.well-known/');
  console.log('    mcp-json          MCP server config at /.well-known/');
  console.log('    security-txt      RFC 9116 at /.well-known/');
  console.log('    openapi-yaml      OpenAPI 3.0 stub (API type only)');
  console.log('    structured-data   JSON-LD snippet for <head>');
  console.log('    meta-tags         AI meta tags for <head>');
  console.log('    http-headers      Server header configuration');
  console.log('');
}

function printDetectionSummary(info: DetectedInfo): void {
  for (const file of info.existingFiles) {
    if (file.found) {
      const detail = file.detail ? pc.dim(` (${file.detail})`) : '';
      console.log(`  ${pc.green('✓')} ${file.label.padEnd(18)} ${pc.dim('found')}${detail}`);
    } else {
      console.log(`  ${pc.red('✗')} ${file.label.padEnd(18)} ${pc.dim('not found')}`);
    }
  }

  console.log('');

  const parts: string[] = [];
  if (info.name) parts.push(`"${info.name}"`);
  if (info.type) parts.push(`${info.type} site`);

  if (parts.length > 0) {
    console.log(`  Detected: ${parts.join(' — ')}`);
  }
  if (info.contactEmail) {
    console.log(`  Contact:  ${info.contactEmail}`);
  }
  if (info.languages && info.languages.length > 0) {
    console.log(`  Languages: ${info.languages.join(', ')}`);
  }
  if (info.crawlerPolicy) {
    console.log(`  Crawler policy: ${info.crawlerPolicy}`);
  }

  console.log('');
}

function loadConfigFile(filePath: string): Config {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, 'utf-8');

  let config: Config;
  try {
    config = JSON.parse(raw) as Config;
  } catch {
    throw new Error(`Invalid JSON in config file: ${absPath}`);
  }

  // Validate required fields
  const required: (keyof Config)[] = [
    'url', 'name', 'type', 'description',
    'contactName', 'contactEmail',
  ];

  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Missing required field in config: "${field}"`);
    }
  }

  // Defaults
  if (!config.languages) config.languages = ['en'];
  if (!config.crawlerPolicy) config.crawlerPolicy = 'allow';
  if (!config.outputDir) config.outputDir = '.';
  if (!config.generators) {
    config.generators = GENERATORS
      .filter((g) => !g.condition || g.condition(config))
      .map((g) => g.id);
  }

  // Normalize URL
  config.url = config.url.replace(/\/+$/, '');

  return config;
}

function writeFile(outputDir: string, filePath: string, content: string): void {
  const fullPath = path.join(outputDir, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // For robots.txt, append if file exists (skip if ax-init block already present)
  if (filePath === 'robots.txt' && fs.existsSync(fullPath)) {
    const existing = fs.readFileSync(fullPath, 'utf-8');
    if (existing.includes('Generated by ax-init')) {
      // Already has our block — replace it
      const marker = '# ══════════════════════════════════════════';
      const start = existing.indexOf(marker);
      if (start !== -1) {
        const prefix = existing.slice(0, start).trimEnd();
        fs.writeFileSync(fullPath, prefix ? prefix + '\n\n' + content : content);
      } else {
        fs.writeFileSync(fullPath, content);
      }
    } else {
      fs.writeFileSync(fullPath, existing.trimEnd() + '\n\n' + content);
    }
  } else {
    fs.writeFileSync(fullPath, content);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // --version
  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    return;
  }

  // --help
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const fromIdx = args.indexOf('--from');
  const configIdx = args.indexOf('--config');
  const dryRun = args.includes('--dry-run');
  const saveConfig = args.includes('--save-config');
  const updateMode = args.includes('--update');

  // Mutual exclusion
  if (fromIdx !== -1 && configIdx !== -1) {
    console.error(pc.red('  Error: --from and --config cannot be used together'));
    process.exit(1);
  }

  if (updateMode && configIdx === -1) {
    console.error(pc.red('  Error: --update requires --config <path>'));
    console.error(pc.dim('  Example: npx ax-init --update --config ax.json'));
    process.exit(1);
  }

  console.log('');
  console.log(pc.bold('  ax-init') + pc.dim(` v${VERSION}`) + pc.dim(' — Generate AI Agent Experience files'));
  console.log('');

  let config: Config | null;
  let detected: DetectedInfo | undefined;

  if (fromIdx !== -1) {
    // --from <url>
    const fromUrl = args[fromIdx + 1];
    if (!fromUrl || fromUrl.startsWith('--')) {
      console.error(pc.red('  Error: --from requires a URL'));
      process.exit(1);
    }

    let normalizedUrl = fromUrl;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');

    console.log(pc.dim(`  Scanning ${normalizedUrl}...`));
    console.log('');

    detected = await detect(normalizedUrl);
    printDetectionSummary(detected);

    config = await runPrompts(detected);
    if (!config) return;
  } else if (configIdx !== -1) {
    // --config <file>
    const configPath = args[configIdx + 1];
    if (!configPath) {
      console.error(pc.red('  Error: --config requires a file path'));
      process.exit(1);
    }
    config = loadConfigFile(configPath);
    console.log(pc.dim(`  Using config: ${path.resolve(configPath)}`));
    console.log('');
  } else {
    // Interactive mode
    config = await runPrompts();
    if (!config) return;
  }

  // --update mode: regenerate and compare existing files
  if (updateMode) {
    console.log(pc.bold('  Update mode') + pc.dim(` — comparing with existing files in ${config.outputDir}`));
    console.log('');
    runUpdate(config, GENERATORS, dryRun);
    console.log('');
    console.log(pc.dim('  ──────────────────────────────────────'));
    console.log('');
    console.log(`  Verify your score: ${pc.cyan(`npx ax-audit ${config.url}`)}`);
    console.log('');
    return;
  }

  // --save-config: write ax.json from the resolved config
  if (saveConfig && configIdx === -1) {
    const savePath = path.join(config.outputDir, 'ax.json');
    const configToSave = { ...config };
    delete (configToSave as Record<string, unknown>).outputDir;
    delete (configToSave as Record<string, unknown>).generators;
    fs.mkdirSync(path.dirname(path.resolve(savePath)), { recursive: true });
    fs.writeFileSync(path.resolve(savePath), JSON.stringify(configToSave, null, 2) + '\n');
    console.log('');
    console.log(`  ${pc.green('✓')} Saved config to ${savePath}`);
    console.log(pc.dim(`    Re-run with: npx ax-init --config ${savePath}`));
  }

  console.log('');

  if (dryRun) {
    console.log(pc.bold('  Dry run') + pc.dim(' — no files written'));
    console.log('');
  }

  const snippets: { label: string; content: string }[] = [];
  const validations: ValidationResult[] = [];
  let filesWritten = 0;

  for (const gen of GENERATORS) {
    if (!config.generators.includes(gen.id)) continue;

    // Skip generators that don't apply to this site type
    if (gen.condition && !gen.condition(config)) continue;

    const content = gen.generate(config);

    // Validate generated content
    validations.push(validateGenerated(gen.id, gen.label, content, config));

    if (gen.filePath) {
      const relativePath = path.join(config.outputDir, gen.filePath);
      if (dryRun) {
        // Show file content preview
        console.log(pc.dim(`  ── ${relativePath} ──`));
        console.log('');
        for (const line of content.split('\n')) {
          console.log(`  ${line}`);
        }
        console.log('');
        filesWritten++;
      } else {
        writeFile(config.outputDir, gen.filePath, content);
        console.log(`  ${pc.green('✓')} ${relativePath}`);
        filesWritten++;
      }
    } else {
      snippets.push({ label: gen.label, content });
    }
  }

  if (filesWritten > 0 && !dryRun) {
    console.log('');
    console.log(pc.dim(`  ${filesWritten} file${filesWritten > 1 ? 's' : ''} written`));
  }

  if (snippets.length > 0) {
    console.log('');
    console.log(pc.bold('  Snippets') + pc.dim(' — copy to your config:'));

    for (const snippet of snippets) {
      console.log('');
      console.log(pc.dim(`  ── ${snippet.label} ──`));
      console.log('');
      for (const line of snippet.content.split('\n')) {
        console.log(`  ${line}`);
      }
    }
  }

  // ── Validation summary ──
  const hasErrors = validations.some((v) => !v.ok);
  const hasWarnings = validations.some((v) => v.warnings.length > 0);

  if (hasErrors || hasWarnings) {
    console.log('');
    console.log(pc.bold('  Validation'));
    console.log('');

    for (const v of validations) {
      if (v.errors.length === 0 && v.warnings.length === 0) continue;

      for (const err of v.errors) {
        console.log(`  ${pc.red('✗')} ${v.label}: ${err}`);
      }
      for (const warn of v.warnings) {
        console.log(`  ${pc.yellow('⚠')} ${v.label}: ${warn}`);
      }
    }
  }

  if (!hasErrors && !hasWarnings) {
    console.log('');
    console.log(`  ${pc.green('✓')} All files validated`);
  }

  console.log('');
  console.log(pc.dim('  ──────────────────────────────────────'));
  console.log('');
  console.log(`  Verify your score: ${pc.cyan(`npx ax-audit ${config.url}`)}`);
  console.log(`  Show only issues:  ${pc.cyan(`npx ax-audit ${config.url} --only-failures`)}`);
  console.log('');
}

main().catch((err) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
