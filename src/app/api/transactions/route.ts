import { NextResponse } from 'next/server';
import { getTransactionsFromGAS } from '@/lib/gasApi';

export async function GET() {
    try {
        const data = await getTransactionsFromGAS();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
