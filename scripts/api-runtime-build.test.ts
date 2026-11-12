import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ts from 'typescript';

const run = promisify(execFile);
test('emitted Vercel API graph starts in plain Node and reads its bundled fallback', async () => {
  const root = new URL('../', import.meta.url);
  const target = await mkdtemp(join(tmpdir(), 'dlt-api-runtime-'));
  try {
    const config = JSON.parse(await readFile(new URL('tsconfig.json', root), 'utf8'));
    const { options, errors } = ts.convertCompilerOptionsFromJson(config.compilerOptions, process.cwd());
    assert.equal(errors.length, 0);
    const sources = ['api/official-draws.ts', 'server/official-draws.ts', 'scripts/fetch-draws.ts', 'src/lib/draws.ts'];
    for (const name of sources) {
      const input = await readFile(new URL(name, root), 'utf8');
      const compiled = ts.transpileModule(input, { fileName: name, compilerOptions: { ...options, noEmit: false } });
      const output = join(target, name.replace(/\.ts$/, '.js'));
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, compiled.outputText);
    }
    await writeFile(join(target, 'package.json'), JSON.stringify({ type: 'module' }));
    await mkdir(join(target, 'src/data'), { recursive: true });
    await writeFile(join(target, 'src/data/official-draws.json'), await readFile(new URL('src/data/official-draws.json', root)));
    const { stdout } = await run(process.execPath, ['--input-type=module', '-e', `
      import { OPTIONS } from './api/official-draws.js';
      const response = await OPTIONS(new Request('http://localhost/api/official-draws', {method:'OPTIONS'}));
      if (response.status !== 204 || response.headers.get('access-control-allow-origin') !== '*') throw new Error('Invalid runtime response');
      console.log('compiled API ready');
    `], { cwd: target, timeout: 5000 });
    assert.match(stdout, /compiled API ready/);
  } finally { await rm(target, { recursive: true, force: true }); }
});
