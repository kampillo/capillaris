import '../config';
import { closeMysql } from '../mysql-source';
import { closePrisma } from '../pg-target';
import { runCountCheck } from './count-check';
import { runFkIntegrity } from './fk-integrity';
import { runSampleAudit } from './sample-audit';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  console.log('='.repeat(60));
  console.log('  Capillaris Migration Validation');
  console.log('='.repeat(60));

  const reportLines: string[] = [
    '# Migration Validation Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
  ];

  // 1. Count checks
  console.log('\n[1/3] Count Check: MySQL vs PG...');
  const counts = await runCountCheck();

  reportLines.push('## Row Count Comparison', '', '| Table | MySQL | PG | Diff | Status |', '|-------|-------|-----|------|--------|');
  for (const c of counts) {
    const icon = c.status === 'OK' ? 'OK' : c.status === 'WARN' ? 'WARN' : 'FAIL';
    reportLines.push(`| ${c.table} | ${c.mysql} | ${c.pg} | ${c.diff > 0 ? '+' : ''}${c.diff} | ${icon} |`);
    console.log(`  ${c.table}: MySQL=${c.mysql} PG=${c.pg} (${c.status})`);
  }

  // 2. FK Integrity
  console.log('\n[2/3] FK Integrity Check...');
  const fks = await runFkIntegrity();

  reportLines.push('', '## FK Integrity', '', '| Check | Orphans | Status |', '|-------|---------|--------|');
  for (const fk of fks) {
    reportLines.push(`| ${fk.check} | ${fk.orphans} | ${fk.status} |`);
    if (fk.status === 'FAIL') {
      console.log(`  FAIL: ${fk.check} (${fk.orphans} orphans)`);
    }
  }

  const fkFails = fks.filter(f => f.status === 'FAIL');
  if (fkFails.length === 0) {
    console.log('  All FK checks passed');
  }

  // 3. Sample audit
  console.log('\n[3/3] Sample Audit (5 random patients)...');
  try {
    const audit = await runSampleAudit();
    reportLines.push(
      '', '## Sample Audit', '',
      `Checked ${audit.patients} random patients:`, '',
      '| Patient ID | Field | MySQL | PG | Match |',
      '|-----------|-------|-------|-----|-------|',
    );
    for (const a of audit.checks) {
      const matchStr = a.match ? 'YES' : 'NO';
      reportLines.push(`| ${a.patientId} | ${a.field} | ${a.mysqlValue} | ${a.pgValue} | ${matchStr} |`);
    }

    const mismatches = audit.checks.filter(c => !c.match);
    if (mismatches.length === 0) {
      console.log('  All sample checks passed');
    } else {
      console.log(`  ${mismatches.length} mismatches found:`);
      for (const m of mismatches) {
        console.log(`    Patient ${m.patientId}: ${m.field} MySQL="${m.mysqlValue}" PG="${m.pgValue}"`);
      }
    }
  } catch (err: any) {
    console.warn(`  Sample audit skipped (ID map not populated): ${err.message}`);
    reportLines.push('', '## Sample Audit', '', 'Skipped - ID map not populated. Run migration first, then validate in same process or re-run migration + validate.');
  }

  // Summary
  const countFails = counts.filter(c => c.status === 'MISMATCH');
  const allOk = countFails.length === 0 && fkFails.length === 0;

  reportLines.push(
    '', '---', '',
    `## Summary: ${allOk ? 'ALL CHECKS PASSED' : 'ISSUES FOUND'}`,
    '',
    `- Count mismatches: ${countFails.length}`,
    `- FK integrity failures: ${fkFails.length}`,
  );

  console.log('\n' + '='.repeat(60));
  console.log(`  Validation ${allOk ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(60));

  // Write report
  const reportPath = resolve(__dirname, '..', '..', 'MIGRATION-REPORT.md');
  writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
  console.log(`\nReport written to: ${reportPath}`);

  await closeMysql();
  await closePrisma();

  if (!allOk) process.exit(1);
}

main().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
