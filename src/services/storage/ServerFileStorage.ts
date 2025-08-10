import { IStorage } from './IStorage';
import fs from 'fs/promises';
import path from 'path';

/**
 * Server-side file storage implementation for Phase 1
 * Directly interacts with filesystem without API calls
 */
export class ServerFileStorage implements IStorage {
  private storageDir = path.join(process.cwd(), 'data', 'notebooks');

  async save(key: string, data: any): Promise<void> {
    await this.ensureStorageDir();
    
    // Create date-based subdirectory for organization
    const date = new Date().toISOString().split('T')[0];
    const dateDir = path.join(this.storageDir, date);
    await fs.mkdir(dateDir, { recursive: true });

    // Save file
    const filePath = path.join(dateDir, `${key.replace(/\//g, '_')}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // Also save a "latest" version for quick access
    const latestPath = path.join(this.storageDir, `${key.replace(/\//g, '_')}_latest.json`);
    await fs.writeFile(latestPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(key: string): Promise<any | null> {
    try {
      // Try latest version first
      const latestPath = path.join(this.storageDir, `${key.replace(/\//g, '_')}_latest.json`);
      try {
        const data = await fs.readFile(latestPath, 'utf-8');
        return JSON.parse(data);
      } catch {
        // Fall back to date-based search
        const date = new Date().toISOString().split('T')[0];
        const filePath = path.join(this.storageDir, date, `${key.replace(/\//g, '_')}.json`);
        
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(data);
        } catch {
          // Search all date directories
          const dirs = await fs.readdir(this.storageDir);
          
          for (const dir of dirs.reverse()) { // Search newest first
            if (dir.includes('.json')) continue; // Skip files
            
            const searchPath = path.join(this.storageDir, dir, `${key.replace(/\//g, '_')}.json`);
            try {
              const data = await fs.readFile(searchPath, 'utf-8');
              return JSON.parse(data);
            } catch {
              continue;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error loading key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Delete latest version
      const latestPath = path.join(this.storageDir, `${key.replace(/\//g, '_')}_latest.json`);
      try {
        await fs.unlink(latestPath);
      } catch {}

      // Search and delete from date directories
      const dirs = await fs.readdir(this.storageDir);
      
      for (const dir of dirs) {
        if (dir.includes('.json')) continue; // Skip files
        
        const filePath = path.join(this.storageDir, dir, `${key.replace(/\//g, '_')}.json`);
        try {
          await fs.unlink(filePath);
        } catch {}
      }
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
    }
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    
    try {
      const dirs = await fs.readdir(this.storageDir);
      
      for (const dir of dirs) {
        if (dir.includes('.json')) continue; // Skip files
        
        const dirPath = path.join(this.storageDir, dir);
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const key = file.replace('.json', '').replace(/_/g, '/');
              if (key.startsWith(prefix)) {
                keys.push(key);
              }
            }
          }
        } catch {}
      }
    } catch (error) {
      console.error(`Error listing keys with prefix ${prefix}:`, error);
    }
    
    return [...new Set(keys)]; // Remove duplicates
  }

  async exists(key: string): Promise<boolean> {
    const data = await this.load(key);
    return data !== null;
  }

  private async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }
}