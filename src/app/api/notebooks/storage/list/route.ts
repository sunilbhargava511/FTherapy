import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Storage directory for notebooks
const STORAGE_DIR = path.join(process.cwd(), 'data', 'notebooks');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';

    // Get all directories (dates)
    const dirs = await fs.readdir(STORAGE_DIR);
    const keys: string[] = [];

    for (const dir of dirs) {
      if (dir === 'latest.json') continue;
      
      try {
        const dirPath = path.join(STORAGE_DIR, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory()) {
          // List files in this directory
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const key = file.replace('.json', '');
              if (!prefix || key.startsWith(prefix)) {
                keys.push(key);
              }
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        continue;
      }
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Storage list error:', error);
    return NextResponse.json(
      { error: 'Failed to list storage keys' },
      { status: 500 }
    );
  }
}