import { runTaskTimingValidation } from '../validation/taskTimingValidation.js';
import { setTaskTimingDebugMode } from '../modules/tasks/taskDeadline.utils.js';

function parseArgs(argv) {
  return {
    runMigrationCommands: argv.includes('--run-migration'),
    applyMigration: argv.includes('--apply-migration'),
    debug: argv.includes('--debug'),
    apiBaseUrl: process.env.HRMS_API_BASE_URL,
    authToken: process.env.HRMS_API_TOKEN,
    taskId: process.env.HRMS_VALIDATION_TASK_ID,
    requestId: process.env.HRMS_VALIDATION_REQUEST_ID,
  };
}

function printSummary(report) {
  console.log('\n=== HRMS Task Timing Validation Report ===');
  console.log('Generated At:', report.generatedAt);
  console.log('Passed:', report.passed);
  console.log('Failed:', report.failed);
  console.log('Skipped:', report.skipped);
  console.log('Production Ready:', report.productionReady ? 'YES' : 'NO');

  const failedChecks = report.checks.filter((c) => c.status === 'FAIL');
  if (failedChecks.length > 0) {
    console.log('\nFailed Checks:');
    for (const check of failedChecks) {
      console.log(`- ${check.id}: ${check.title}`);
      if (check.suggestion) console.log(`  Suggestion: ${check.suggestion}`);
    }
  }

  if (report.suggestions.length > 0) {
    console.log('\nSuggestions:');
    for (const suggestion of report.suggestions) {
      console.log(`- ${suggestion}`);
    }
  }

  console.log('\nFull JSON Report:');
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  setTaskTimingDebugMode(options.debug);

  const report = await runTaskTimingValidation(options);
  printSummary(report);

  process.exit(report.productionReady ? 0 : 2);
}

main().catch((error) => {
  console.error('Validation runner crashed:', error);
  process.exit(1);
});
