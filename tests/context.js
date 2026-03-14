import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// In Node.js VM, top-level const/class declarations are NOT automatically
// properties of the context object. We append explicit this['X'] = X assignments
// so tests can access them via ctx.X.
const FILE_EXPORTS = {
  'constants.js': [
    'ENTITY_TYPES', 'WORLD_CONSTANTS', 'ENTITY_CONSTANTS', 'DIRECTIONS', 'GAME_CONSTANTS',
  ],
  'entity.js': ['Entity'],
  'world.js': ['World'],
};

function loadFile(ctx, filename) {
  const code = readFileSync(join(ROOT, 'js', filename), 'utf-8');
  const exports = FILE_EXPORTS[filename];
  const exportStatements = exports.map(name => `this['${name}'] = ${name};`).join('\n');
  vm.runInContext(code + '\n' + exportStatements, ctx);
}

export function createContext() {
  // Inject the host Math so that mock.method(Math, 'random', ...) in tests
  // reaches the same object used by entity code running inside the VM.
  const ctx = vm.createContext({ Math, soundSystem: { playBite() {}, playShot() {} } });
  loadFile(ctx, 'constants.js');
  loadFile(ctx, 'entity.js');
  loadFile(ctx, 'world.js');
  return ctx;
}
