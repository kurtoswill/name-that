import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const contract = url.searchParams.get('contract');
    if (!contract) {
      return NextResponse.json({ error: 'Missing contract query parameter' }, { status: 400 });
    }

    // Resolve possible artifact locations
    const workspaceRoot = process.cwd();
    // common Hardhat/Forge/build locations
    const candidates = [
      path.join(workspaceRoot, 'artifacts', 'contracts', `${contract}.sol`, `${contract}.json`),
      path.join(workspaceRoot, 'artifacts', `${contract}.json`),
      path.join(workspaceRoot, 'out', `${contract}.json`),
      path.join(workspaceRoot, 'build', `${contract}.json`),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          const json = JSON.parse(raw);
          // Try common shapes: { bytecode } or { evm: { bytecode: { object } } }
          const bytecode = json.bytecode || (json.evm && json.evm.bytecode && json.evm.bytecode.object) || json.data?.bytecode?.object;
          if (!bytecode) continue;
          return NextResponse.json({ bytecode });
        } catch (e) {
          console.error('Failed to read/parse artifact', p, e);
          return NextResponse.json({ error: 'Failed to read artifact file' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: 'Bytecode artifact not found. Place compiled contract JSON in artifacts/ or build/' }, { status: 404 });
  } catch (err) {
    console.error('Bytecode route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
