import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { Config } from './types';
import { validateGenerated, ValidationResult } from './validate';

export interface GeneratorEntry {
  id: string;
  label: string;
  filePath: string | null;
  generate: (config: Config) => string;
  condition?: (config: Config) => boolean;
}

export interface FileStatus {
  id: string;
  label: string;
  filePath: string | null;
  status: 'unchanged' | 'updated' | 'new' | 'skipped';
  diff?: string; // Human-readable summary of changes
}

/**
 * Run --update mode: regenerate files from config, compare with existing,
 * and write only changed/new files.
 */
export function runUpdate(
  config: Config,
  generators: GeneratorEntry[],
  dryRun: boolean,
): void {
  const statuses: FileStatus[] = [];
  const validations: ValidationResult[] = [];
  const snippetGenerators: GeneratorEntry[] = [];

  for (const gen of generators) {
    if (!config.generators.includes(gen.id)) continue;
    if (gen.condition && !gen.condition(config)) continue;

    const newContent = gen.generate(config);
    validations.push(validateGenerated(gen.id, gen.label, newContent, config));

    // Snippet generators (no file path) — always regenerate
    if (!gen.filePath) {
      snippetGenerators.push(gen);
      statuses.push({
        id: gen.id,
        label: gen.label,
        filePath: null,
        status: 'updated',
        diff: 'Snippet regenerated',
      });
      continue;
    }

    const fullPath = path.join(config.outputDir, gen.filePath);
    const relativePath = path.join(config.outputDir, gen.filePath);

    if (!fs.existsSync(fullPath)) {
      // File doesn't exist — will be created
      statuses.push({
        id: gen.id,
        label: gen.label,
        filePath: gen.filePath,
        status: 'new',
      });

      if (!dryRun) {
        writeFileWithDirs(fullPath, newContent);
        console.log(`  ${pc.green('+')} ${relativePath} ${pc.dim('(new)')}`);
      } else {
        console.log(`  ${pc.green('+')} ${relativePath} ${pc.dim('(new — dry run)')}`);
      }
      continue;
    }

    // File exists — compare
    const existing = fs.readFileSync(fullPath, 'utf-8');

    // For robots.txt, compare only the ax-init block
    const normalizedExisting = normalizeForComparison(gen.id, existing);
    const normalizedNew = normalizeForComparison(gen.id, newContent);

    if (normalizedExisting === normalizedNew) {
      statuses.push({
        id: gen.id,
        label: gen.label,
        filePath: gen.filePath,
        status: 'unchanged',
      });
      console.log(`  ${pc.dim('─')} ${relativePath} ${pc.dim('(unchanged)')}`);
      continue;
    }

    // Compute a human-readable diff summary
    const diff = describeDiff(gen.id, existing, newContent);

    statuses.push({
      id: gen.id,
      label: gen.label,
      filePath: gen.filePath,
      status: 'updated',
      diff,
    });

    if (!dryRun) {
      writeFileForUpdate(gen.id, fullPath, newContent, existing);
      console.log(`  ${pc.yellow('~')} ${relativePath} ${pc.dim('(updated)')}`);
    } else {
      console.log(`  ${pc.yellow('~')} ${relativePath} ${pc.dim('(would update — dry run)')}`);
    }

    if (diff) {
      console.log(`    ${pc.dim(diff)}`);
    }
  }

  // Print snippets
  if (snippetGenerators.length > 0) {
    console.log('');
    console.log(pc.bold('  Snippets') + pc.dim(' — regenerated:'));
    for (const gen of snippetGenerators) {
      const content = gen.generate(config);
      console.log('');
      console.log(pc.dim(`  ── ${gen.label} ──`));
      console.log('');
      for (const line of content.split('\n')) {
        console.log(`  ${line}`);
      }
    }
  }

  // Summary
  console.log('');

  const newFiles = statuses.filter((s) => s.status === 'new').length;
  const updated = statuses.filter((s) => s.status === 'updated' && s.filePath).length;
  const unchanged = statuses.filter((s) => s.status === 'unchanged').length;

  const parts: string[] = [];
  if (newFiles > 0) parts.push(pc.green(`${newFiles} new`));
  if (updated > 0) parts.push(pc.yellow(`${updated} updated`));
  if (unchanged > 0) parts.push(pc.dim(`${unchanged} unchanged`));

  if (parts.length > 0) {
    console.log(`  ${parts.join(', ')}`);
  }

  // Validation
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
}

// ── Helpers ──────────────────────────────────────────────

function writeFileWithDirs(fullPath: string, content: string): void {
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
}

/**
 * Write file, using merge strategy for robots.txt.
 */
function writeFileForUpdate(
  genId: string,
  fullPath: string,
  newContent: string,
  existingContent: string,
): void {
  if (genId === 'robots-txt') {
    // Replace only the ax-init block, preserve user's custom rules
    const marker = '# ══════════════════════════════════════════';
    const start = existingContent.indexOf(marker);
    if (start !== -1) {
      const prefix = existingContent.slice(0, start).trimEnd();
      writeFileWithDirs(fullPath, prefix ? prefix + '\n\n' + newContent : newContent);
    } else {
      // No ax-init block found — append
      writeFileWithDirs(fullPath, existingContent.trimEnd() + '\n\n' + newContent);
    }
  } else {
    writeFileWithDirs(fullPath, newContent);
  }
}

/**
 * Normalize content for comparison, handling special cases per generator.
 */
function normalizeForComparison(genId: string, content: string): string {
  if (genId === 'robots-txt') {
    // Extract only the ax-init block for comparison
    const marker = '# ══════════════════════════════════════════';
    const start = content.indexOf(marker);
    if (start !== -1) {
      return content.slice(start).trim();
    }
    return content.trim();
  }

  if (genId === 'security-txt') {
    // Ignore the Expires date when comparing (it changes on each generation)
    return content.replace(/Expires:\s*.+/, 'Expires: <ignored>').trim();
  }

  return content.trim();
}

/**
 * Produce a concise human-readable description of what changed.
 */
function describeDiff(genId: string, existing: string, generated: string): string {
  if (genId === 'robots-txt') {
    return describeRobotsDiff(existing, generated);
  }

  if (genId === 'security-txt') {
    // Check if only the Expires date changed
    const existingNoExpires = existing.replace(/Expires:\s*.+/, '').trim();
    const generatedNoExpires = generated.replace(/Expires:\s*.+/, '').trim();
    if (existingNoExpires === generatedNoExpires) {
      return 'Expires date renewed';
    }
    return 'Content updated';
  }

  if (genId === 'agent-json' || genId === 'mcp-json') {
    return describeJsonDiff(existing, generated);
  }

  // Generic: count line additions/removals
  const existingLines = existing.trim().split('\n').length;
  const generatedLines = generated.trim().split('\n').length;
  const delta = generatedLines - existingLines;
  if (delta > 0) return `+${delta} lines`;
  if (delta < 0) return `${delta} lines`;
  return 'Content changed';
}

function describeRobotsDiff(existing: string, generated: string): string {
  // Count User-agent directives in each
  const existingCrawlers = new Set(
    [...existing.matchAll(/User-agent:\s*(\S+)/gi)].map((m) => m[1].toLowerCase()),
  );
  const generatedCrawlers = new Set(
    [...generated.matchAll(/User-agent:\s*(\S+)/gi)].map((m) => m[1].toLowerCase()),
  );

  const added = [...generatedCrawlers].filter((c) => !existingCrawlers.has(c));
  const removed = [...existingCrawlers].filter((c) => !generatedCrawlers.has(c));

  const parts: string[] = [];
  if (added.length > 0) parts.push(`+${added.length} crawler${added.length > 1 ? 's' : ''}`);
  if (removed.length > 0) parts.push(`-${removed.length} crawler${removed.length > 1 ? 's' : ''}`);

  return parts.length > 0 ? parts.join(', ') : 'Rules updated';
}

function describeJsonDiff(existing: string, generated: string): string {
  try {
    const oldObj = JSON.parse(existing) as Record<string, unknown>;
    const newObj = JSON.parse(generated) as Record<string, unknown>;

    const oldKeys = new Set(Object.keys(oldObj));
    const newKeys = new Set(Object.keys(newObj));

    const added = [...newKeys].filter((k) => !oldKeys.has(k));
    const removed = [...oldKeys].filter((k) => !newKeys.has(k));
    const changed = [...newKeys].filter(
      (k) => oldKeys.has(k) && JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]),
    );

    const parts: string[] = [];
    if (added.length > 0) parts.push(`+${added.join(', ')}`);
    if (removed.length > 0) parts.push(`-${removed.join(', ')}`);
    if (changed.length > 0) parts.push(`~${changed.join(', ')}`);

    return parts.join('; ') || 'Content changed';
  } catch {
    return 'Content changed';
  }
}
