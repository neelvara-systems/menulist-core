import { readFile } from 'fs/promises';
import path from 'path';
import { ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL } from '@lib/answerlattice/installContract/constants';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
    const widgetPath = path.join(process.cwd(), 'public', 'widget', 'answerlattice-widget.js');
    const script = await readFile(widgetPath, 'utf8');

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL,
            'X-Answerlattice-Widget-Contract': 'answerlattice-widget-v1',
        },
    });
}
