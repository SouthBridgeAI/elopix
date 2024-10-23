// src/app/api/datasets/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const datasetsPath = path.join(process.cwd(), 'public', 'comparison-images');
    try {
      await fs.access(datasetsPath);
    } catch {
      await fs.mkdir(datasetsPath, { recursive: true });
    }
    
    const datasets = await fs.readdir(datasetsPath);
    
    // Filter out any files, only return directories
    const filteredDatasets = await Promise.all(
      datasets.map(async (dataset) => {
        const stats = await fs.stat(path.join(datasetsPath, dataset));
        return stats.isDirectory() ? dataset : null;
      })
    );

    return NextResponse.json({
      datasets: filteredDatasets.filter(Boolean)
    });
  } catch (error) {
    console.error('Error reading datasets:', error);
    return NextResponse.json({ datasets: [] });
  }
}