import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Storage directory for notebooks
const STORAGE_DIR = path.join(process.cwd(), 'data', 'notebooks');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter required' },
        { status: 400 }
      );
    }

    // Check today's directory first
    const date = new Date().toISOString().split('T')[0];
    let filePath = path.join(STORAGE_DIR, date, `${key}.json`);

    try {
      await fs.access(filePath);
      return NextResponse.json({ exists: true });
    } catch {
      // Check all directories
      const dirs = await fs.readdir(STORAGE_DIR);
      
      for (const dir of dirs.reverse()) { // Search from newest to oldest
        if (dir === 'latest.json') continue;
        
        filePath = path.join(STORAGE_DIR, dir, `${key}.json`);
        try {
          await fs.access(filePath);
          return NextResponse.json({ exists: true });
        } catch {
          // Continue searching
        }
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Storage exists error:', error);
    return NextResponse.json(
      { error: 'Failed to check if key exists' },
      { status: 500 }
    );
  }
}