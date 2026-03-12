import './config'; // Load env first
import { closeMysql } from './mysql-source';
import { closePrisma } from './pg-target';
import { getMapStats } from './id-map';
import { getPhoneWarnings } from './phone-normalizer';
import { runClean } from './steps/00-clean';
import { runRolesPermissions } from './steps/01-roles-permissions';
import { runUsers } from './steps/02-users';
import { runPatients } from './steps/03-patients';
import { runAppointments } from './steps/04-appointments';
import { runClinicalHistories } from './steps/05-clinical-histories';
import { runConsultations } from './steps/06-consultations';
import { runPrescriptions } from './steps/07-prescriptions';
import { runProcedures } from './steps/08-procedures';
import { runMicropigmentations } from './steps/09-micropigmentations';
import { runHairmedicines } from './steps/09b-hairmedicines';
import { runImages } from './steps/10-images';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface StepDef {
  name: string;
  fn: () => Promise<void>;
}

const ALL_STEPS: StepDef[] = [
  { name: '00-clean', fn: runClean },
  { name: '01-roles-permissions', fn: runRolesPermissions },
  { name: '02-users', fn: runUsers },
  { name: '03-patients', fn: runPatients },
  { name: '04-appointments', fn: runAppointments },
  { name: '05-clinical-histories', fn: runClinicalHistories },
  { name: '06-consultations', fn: runConsultations },
  { name: '07-prescriptions', fn: runPrescriptions },
  { name: '08-procedures', fn: runProcedures },
  { name: '09-micropigmentations', fn: runMicropigmentations },
  { name: '09b-hairmedicines', fn: runHairmedicines },
  { name: '10-images', fn: runImages },
];

async function runStep(step: StepDef): Promise<{ name: string; durationMs: number; error?: string }> {
  const start = Date.now();
  console.log(`\n[Step ${step.name}]`);
  try {
    await step.fn();
    const durationMs = Date.now() - start;
    console.log(`  Done in ${durationMs}ms`);
    return { name: step.name, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    console.error(`  FAILED after ${durationMs}ms: ${err.message}`);
    return { name: step.name, durationMs, error: err.message };
  }
}

function generateReport(
  results: { name: string; durationMs: number; error?: string }[],
  totalMs: number,
): string {
  const stats = getMapStats();
  const phoneWarnings = getPhoneWarnings();

  const lines: string[] = [
    '# Migration Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Total Duration:** ${(totalMs / 1000).toFixed(1)}s`,
    '',
    '## Step Results',
    '',
    '| Step | Duration | Status |',
    '|------|----------|--------|',
  ];

  for (const r of results) {
    const status = r.error ? `FAILED: ${r.error}` : 'OK';
    lines.push(`| ${r.name} | ${r.durationMs}ms | ${status} |`);
  }

  lines.push('', '## ID Mapping Stats', '', '| Table | Records |', '|-------|---------|');
  for (const [table, count] of Object.entries(stats).sort()) {
    lines.push(`| ${table} | ${count} |`);
  }

  if (phoneWarnings.length > 0) {
    lines.push('', '## Phone Normalization Warnings', '', `Total: ${phoneWarnings.length}`, '');
    for (const w of phoneWarnings.slice(0, 20)) {
      lines.push(`- ${w}`);
    }
    if (phoneWarnings.length > 20) {
      lines.push(`- ... and ${phoneWarnings.length - 20} more`);
    }
  }

  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    lines.push('', '## ERRORS', '');
    for (const f of failed) {
      lines.push(`### ${f.name}`, '', '```', f.error!, '```', '');
    }
  }

  return lines.join('\n');
}

async function main() {
  const totalStart = Date.now();

  // Parse --step argument for single-step execution
  const stepArg = process.argv.find(a => a.startsWith('--step'));
  const stepName = stepArg ? process.argv[process.argv.indexOf(stepArg) + 1] : null;

  let stepsToRun = ALL_STEPS;
  if (stepName) {
    const found = ALL_STEPS.filter(s => s.name.includes(stepName));
    if (found.length === 0) {
      console.error(`Step not found: "${stepName}". Available: ${ALL_STEPS.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
    stepsToRun = found;
    console.log(`Running single step: ${found.map(s => s.name).join(', ')}`);
  }

  console.log('='.repeat(60));
  console.log('  Capillaris Migration: MySQL → PostgreSQL');
  console.log('='.repeat(60));

  const results: { name: string; durationMs: number; error?: string }[] = [];

  for (const step of stepsToRun) {
    const result = await runStep(step);
    results.push(result);

    // Stop on error (each step depends on previous ones)
    if (result.error) {
      console.error(`\nMigration aborted at step ${step.name}`);
      break;
    }
  }

  const totalMs = Date.now() - totalStart;

  console.log('\n' + '='.repeat(60));
  console.log(`  Migration completed in ${(totalMs / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  // Generate report
  const report = generateReport(results, totalMs);
  const reportPath = resolve(__dirname, '..', 'MIGRATION-REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nReport written to: ${reportPath}`);

  // Cleanup connections
  await closeMysql();
  await closePrisma();

  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
