import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setDefaultResultOrder } from 'node:dns';
import { setDefaultAutoSelectFamily } from 'node:net';
import { parseSnapshot } from '../src/lib/draws.ts';
import { officialDrawResponse } from '../server/official-draws.ts';

// Match the collector's verified connection settings for provincial official hosts.
setDefaultResultOrder('ipv4first');
setDefaultAutoSelectFamily(false);

function fallback() {
  return parseSnapshot(JSON.parse(readFileSync(join(process.cwd(), 'src/data/official-draws.json'), 'utf8')));
}
export async function GET(request: Request) { return officialDrawResponse(request, fallback()); }
export async function HEAD(request: Request) { return officialDrawResponse(request, fallback()); }
export async function OPTIONS(request: Request) { return officialDrawResponse(request, fallback()); }
