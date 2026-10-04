// Internal read-only review evidence. Actual TS/TSX sources compiled in memory.
// Hooks, UI shells, services and transports are doubles. No API/Prisma client,
// browser, credentials, env files or application bootstrap are loaded.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '../..');
const local = createRequire(path.join(repo, 'package.json'));
const ts = local('typescript');
const React = local('react');
const sources = new Map();
const proofs = [];
let h;
const hooks = {
  ...React,
  useState(initial) {
    const i = h.cursor++;
    if (!(i in h.state)) h.state[i] = typeof initial === 'function' ? initial() : initial;
    return [h.state[i], value => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value; }];
  },
  useMemo: fn => fn(),
  useRef: initial => { const [ref] = hooks.useState(() => ({ current: initial })); return ref; },
  useEffect: fn => { if (h.effects) h.effects.push(fn); },
};
const shell = new Proxy({ __esModule: true, default: 'a' }, { get: (o,k) => k in o ? o[k] : String(k) });
const noopMutation = () => ({ isPending: false, isError: false, mutateAsync: async () => { throw Error('Unexpected mock mutation'); } });
const emptyQuery = () => ({ data: [], isLoading: false });
const nest = { Injectable: () => Class => Class, NotFoundException: Error, BadRequestException: Error, ConflictException: Error };
function load(relative, mocks = {}, extra = '') {
  const filename = path.join(repo, relative);
  const source = fs.readFileSync(filename, 'utf8');
  sources.set(relative, crypto.createHash('sha256').update(source).digest('hex'));
  const code = ts.transpileModule(source + '\n' + extra, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, experimentalDecorators: true,
  }, fileName: filename }).outputText;
  const exports = {};
  const safeRequire = request => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    if (request === 'react') return hooks;
    if (request === 'react/jsx-runtime') return local(request);
    if (request === '@nestjs/common') return nest;
    if (request === '@nestjs/swagger') return { ApiProperty: () => () => {}, ApiPropertyOptional: () => () => {} };
    if (request === 'class-validator' || request === 'class-transformer') return local(request);
    if (request === 'bcrypt') return { hash() { throw Error('Password operations excluded'); } };
    if (request === '@prisma/client') return { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } };
    if (request.includes('prisma.service') || request.includes('google-calendar.service')) return {};
    if (request.includes('user-select')) return { USER_PUBLIC_SELECT: { id: true } };
    if (request === 'date-fns' || request === 'date-fns/locale') return local(request);
    if (request === '@/lib/appointment-range') return load('apps/web/src/lib/appointment-range.ts');
    if (request === '@/components/clinic/form-layout') return load('apps/web/src/components/clinic/form-layout.tsx');
    if (request === './dates') return load('apps/web/src/lib/dates.ts');
    if (request === '@/lib/dates') return load('apps/web/src/lib/dates.ts');
    if (request === '@/lib/prescription-items') return load('apps/web/src/lib/prescription-items.ts');
    if (request === '@capillaris/shared') return load('packages/shared/src/enums.ts');
    if (request === '@/lib/utils') return { cn: (...args) => args.filter(Boolean).join(' ') };
    if (request === '@/lib/names') return { displayName: p => p ? `${p.nombre} ${p.apellido}` : '' };
    if (request === '@/components/clinic/scalp-zones') return { variantsToSeverity: () => ({}) };
    if (request === './scalp-zones') return load('apps/web/src/components/clinic/scalp-zones.ts');
    if (request === 'next/link' || request.startsWith('@/components/') || request === 'lucide-react' || request === 'recharts') return shell;
    if (request === '@/hooks/use-has-role') return { useRequireRole: () => true, useHasRole: () => true };
    throw Error(`Blocked import ${request} from ${relative}`);
  };
  vm.runInThisContext(`(function(require,exports,module){${code}\n})`, { filename })(safeRequire, exports, { exports });
  return exports;
}
function nodes(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
}
function find(tree, predicate) { const n = nodes(tree).find(predicate); assert.ok(n, 'Control exists'); return n; }
function setup(fn, props, state = []) {
  h = { cursor: 0, state: [...state], effects: [] };
  let tree = fn(props);
  const effects = h.effects;
  h.effects = null;
  effects.forEach(fn => fn());
  return { tree, rerender() { h.cursor = 0; tree = fn(props); return tree; }, state: h.state };
}

const event = { preventDefault() {} };

module.exports = { load, setup, nodes, find, emptyQuery, noopMutation, event };
