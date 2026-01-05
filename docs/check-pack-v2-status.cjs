const { existsSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const skillsDir = 'C:/Users/HeinvanVuuren/.claude/skills';

// Recursively check for code files in a directory
function hasCodeFilesRecursive(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isFile()) {
        // Check if it's a code file
        if (
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.py') ||
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.yaml') ||
          entry.name.endsWith('.yml')
        ) {
          return true;
        }
      } else if (entry.isDirectory()) {
        // Recursively check subdirectories
        if (hasCodeFilesRecursive(fullPath)) {
          return true;
        }
      }
    }
  } catch (e) {
    return false;
  }

  return false;
}

// Automatically discover all skill directories
const skillsDirEntries = readdirSync(skillsDir, { withFileTypes: true });
const skills = skillsDirEntries
  .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
  .map(entry => entry.name)
  .sort();

console.log('\n=== Pack v2.0 Validation Summary ===\n');
console.log(`Discovered ${skills.length} skills in ${skillsDir}\n`);

let passCount = 0;
let failCount = 0;
const results = [];

skills.forEach(skill => {
  const skillPath = join(skillsDir, skill);

  const checks = {
    readme: existsSync(join(skillPath, 'README.md')),
    install: existsSync(join(skillPath, 'INSTALL.md')),
    verify: existsSync(join(skillPath, 'VERIFY.md')),
    src: existsSync(join(skillPath, 'src')),
    hasCode: false
  };

  // Check for code files in src/ recursively
  if (checks.src) {
    const srcPath = join(skillPath, 'src');
    checks.hasCode = hasCodeFilesRecursive(srcPath);
  }

  const passing = checks.readme && checks.install && checks.verify && checks.src && checks.hasCode;

  if (passing) {
    passCount++;
  } else {
    failCount++;
  }

  results.push({
    skill,
    passing,
    checks
  });
});

// Display summary table
console.log('Skill                              | README | INSTALL | VERIFY | src/ | Code | Status');
console.log('-----------------------------------|--------|---------|--------|------|------|--------');

results.forEach(({ skill, passing, checks }) => {
  const readme = checks.readme ? '✓' : '✗';
  const install = checks.install ? '✓' : '✗';
  const verify = checks.verify ? '✓' : '✗';
  const src = checks.src ? '✓' : '✗';
  const code = checks.hasCode ? '✓' : '✗';
  const status = passing ? 'PASS' : 'FAIL';

  console.log(
    `${skill.padEnd(35)}| ${readme.padEnd(7)}| ${install.padEnd(8)}| ${verify.padEnd(7)}| ${src.padEnd(5)}| ${code.padEnd(5)}| ${status}`
  );
});

console.log('\n=== Summary ===');
console.log(`Total skills: ${skills.length}`);
console.log(`Passing: ${passCount} (${Math.round(passCount/skills.length * 100)}%)`);
console.log(`Failing: ${failCount} (${Math.round(failCount/skills.length * 100)}%)`);

// Exit with error code if any failures
if (failCount > 0) {
  console.log('\n❌ Some skills are not Pack v2.0 compliant\n');
  process.exit(1);
} else {
  console.log('\n✅ All skills are Pack v2.0 compliant!\n');
  process.exit(0);
}
