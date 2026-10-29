import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { livingSofas } from '../src/living-layout.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidates = [
  process.env.BLENDER_BIN,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs/Blender/blender-5.2.3-windows-x64/blender.exe'),
  'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe',
].filter(Boolean);
const executable = candidates.find(existsSync) || 'blender';
const master = path.join(root, 'assets-src/living/west-sofa.blend');
const rebuild = process.argv.includes('--rebuild');
const preview = process.argv.includes('--preview');
// Re-running the normal command exports saved artist edits instead of erasing them.
const exportOnly = process.argv.includes('--export-only') || (existsSync(master) && !rebuild);
const config = path.join(root, '.cache/blender/west-sofa-layout.json');
mkdirSync(path.dirname(config), { recursive: true });
if (rebuild && existsSync(master)) {
  const backup = path.join(root, '.cache/blender', `west-sofa-before-rebuild-${Date.now()}.blend`);
  copyFileSync(master, backup);
  console.log(`Saved editable-source backup: ${backup}`);
}
writeFileSync(config, JSON.stringify(livingSofas.find(s => s.id === 'west-sofa'), null, 2));
const result = spawnSync(executable, [
  '--background', '--factory-startup', '--python-exit-code', '1',
  '--python', path.join(root, `scripts/blender/${preview ? 'preview-sofa' : 'sofa'}.py`),
  '--', ...(preview ? [root] : ['--root', root, '--layout', config, ...(exportOnly ? ['--export-only'] : [])]),
], { stdio: 'inherit' });
if (result.error) {
  console.error('Blender could not start. Set BLENDER_BIN to your Blender executable.', result.error.message);
}
process.exit(result.status ?? 1);
