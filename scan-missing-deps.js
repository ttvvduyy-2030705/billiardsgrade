const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = process.cwd();
const pkg = require(path.join(root, 'package.json'));

const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

const builtins = new Set([
  ...Module.builtinModules,
  ...Module.builtinModules.map(m => `node:${m}`),
]);

const internalAliases = new Set([
  'assets',
  'components',
  'constants',
  'data',
  'hooks',
  'i18n',
  'models',
  'navigation',
  'scenes',
  'services',
  'theme',
  'types',
  'utils',
]);

const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
const missing = new Set();

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      item.name === 'node_modules' ||
      item.name === '.git' ||
      item.name === 'android' ||
      item.name === 'ios' ||
      item.name === 'build'
    ) continue;

    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      walk(full);
    } else if (exts.has(path.extname(item.name))) {
      scanFile(full);
    }
  }
}

function getPkgName(spec) {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0];
}

function shouldIgnore(spec) {
  if (!spec) return true;
  if (spec.startsWith('.') || spec.startsWith('/')) return true;
  const top = spec.split('/')[0];
  if (internalAliases.has(top)) return true;
  if (builtins.has(spec) || builtins.has(top)) return true;
  return false;
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const patterns = [
    /import\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const regex of patterns) {
    let m;
    while ((m = regex.exec(text)) !== null) {
      const spec = m[1];
      if (shouldIgnore(spec)) continue;
      const dep = getPkgName(spec);
      if (!declared.has(dep)) {
        missing.add(dep);
      }
    }
  }
}

walk(path.join(root, 'src'));

const result = Array.from(missing).sort();
if (result.length === 0) {
  console.log('No missing external packages found.');
} else {
  console.log('Missing external packages:');
  console.log(result.join('\n'));
  console.log('\nInstall command:');
  console.log(`npm install ${result.join(' ')}`);
}