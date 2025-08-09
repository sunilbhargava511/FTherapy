import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Storage directory for notebooks
const STORAGE_DIR = path.join(process.cwd(), 'data', 'notebooks');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureStorageDir();
    
    const body = await request.json();
    const { action, key, data } = body;

    if (action !== 'save') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Create date-based subdirectory
    const date = new Date().toISOString().split('T')[0];
    const dateDir = path.join(STORAGE_DIR, date);
    await fs.mkdir(dateDir, { recursive: true });

    // Save file
    const filePath = path.join(dateDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // Also save a "latest" symlink for quick access
    const latestPath = path.join(STORAGE_DIR, 'latest.json');
    try {
      await fs.unlink(latestPath); // Remove old symlink if exists
    } catch {}
    await fs.writeFile(latestPath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true,
      path: filePath 
    });
  } catch (error) {
    console.error('Storage save error:', error);
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    );
  }
}

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

    // Try to find the file in today's directory first
    const date = new Date().toISOString().split('T')[0];
    let filePath = path.join(STORAGE_DIR, date, `${key}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ 
        data: JSON.parse(data) 
      });
    } catch {
      // If not found in today's directory, search all directories
      const dirs = await fs.readdir(STORAGE_DIR);
      
      for (const dir of dirs.reverse()) { // Search from newest to oldest
        if (dir === 'latest.json') continue;
        
        filePath = path.join(STORAGE_DIR, dir, `${key}.json`);
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          return NextResponse.json({ 
            data: JSON.parse(data) 
          });
        } catch {
          // Continue searching
        }
      }
    }

    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Storage load error:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter required' },
        { status: 400 }
      );
    }

    // Search for the file
    const dirs = await fs.readdir(STORAGE_DIR);
    
    for (const dir of dirs) {
      if (dir === 'latest.json') continue;
      
      const filePath = path.join(STORAGE_DIR, dir, `${key}.json`);
      try {
        await fs.unlink(filePath);
        return NextResponse.json({ success: true });
      } catch {
        // Continue searching
      }
    }

    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Storage delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}