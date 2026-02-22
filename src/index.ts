#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPrompts } from './prompts';
import { Config } from './types';
import { generateLlmsTxt } from './generators/llms-txt';
import { generateRobotsTxt } from './generators/robots-txt';
import { generateAgentJson } from './generators/agent-json';
import { generateSecurityTxt } from './generators/security-txt';
import { generateStructuredData } from './generators/structured-data';
import { generateMetaTags } from './generators/meta-tags';

interface GeneratorEntry {
  id: string;
  label: string;
  filePath: string | null; // null = console output only
  generate: (config: Config) => string;
}

const GENERATORS: GeneratorEntry[] = [
  {
    id: 'llms-txt',
    label: 'llms.txt',
    filePath: 'llms.txt',
    generate: generateLlmsTxt,
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
    id: 'security-txt',
    label: 'security.txt',
    filePath: '.well-known/security.txt',
    generate: generateSecurityTxt,
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
];

function writeFile(outputDir: string, filePath: string, content: string): void {
  const fullPath = path.join(outputDir, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // For robots.txt, append if file exists
  if (filePath === 'robots.txt' && fs.existsSync(fullPath)) {
    const existing = fs.readFileSync(fullPath, 'utf-8');
    fs.writeFileSync(fullPath, existing.trimEnd() + '\n\n' + content);
  } else {
    fs.writeFileSync(fullPath, content);
  }
}

async function main(): Promise<void> {
  console.log('');
  console.log(pc.bold('  ax-init') + pc.dim(' — Generate AI Agent Experience files'));
  console.log('');

  const config = await runPrompts();
  if (!config) return;

  console.log('');

  const snippets: { label: string; content: string }[] = [];
  let filesWritten = 0;

  for (const gen of GENERATORS) {
    if (!config.generators.includes(gen.id)) continue;

    const content = gen.generate(config);

    if (gen.filePath) {
      writeFile(config.outputDir, gen.filePath, content);
      const relativePath = path.join(config.outputDir, gen.filePath);
      console.log(`  ${pc.green('✓')} ${relativePath}`);
      filesWritten++;
    } else {
      snippets.push({ label: gen.label, content });
    }
  }

  if (filesWritten > 0) {
    console.log('');
    console.log(pc.dim(`  ${filesWritten} file${filesWritten > 1 ? 's' : ''} written`));
  }

  if (snippets.length > 0) {
    console.log('');
    console.log(pc.bold('  HTML snippets') + pc.dim(' — copy to your <head>:'));

    for (const snippet of snippets) {
      console.log('');
      console.log(pc.dim(`  ── ${snippet.label} ──`));
      console.log('');
      for (const line of snippet.content.split('\n')) {
        console.log(`  ${line}`);
      }
    }
  }

  console.log('');
  console.log(pc.dim('  ──────────────────────────────────────'));
  console.log('');
  console.log(`  Verify your score: ${pc.cyan(`npx ax-audit ${config.url}`)}`);
  console.log('');
}

main().catch((err) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
