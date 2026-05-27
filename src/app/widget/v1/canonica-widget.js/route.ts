import { readFile } from 'fs/promises';
import path from 'path';
import { CANONICA_WIDGET_SCRIPT_CACHE_CONTROL } from '@lib/canonica/installContract/constants';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
    const widgetPath = path.join(process.cwd(), 'public', 'widget', 'canonica-widget.js');
    const script = await readFile(widgetPath, 'utf8');

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': CANONICA_WIDGET_SCRIPT_CACHE_CONTROL,
            'X-Canonica-Widget-Contract': 'canonica-widget-v1',
        },
    });
}
