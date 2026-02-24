import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return NextResponse.json({ cardSettings: [], monthlyUsageData: [] });
        }
        const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return NextResponse.json(JSON.parse(fileContent));
    } catch (error) {
        console.error('Error reading settings:', error);
        return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cardSettings, monthlyUsageData } = body;

        ensureDataDir();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ cardSettings, monthlyUsageData }, null, 2));

        return NextResponse.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
