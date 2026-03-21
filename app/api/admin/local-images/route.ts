import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const BASE_DIR = path.join(process.cwd(), 'public', 'images');

function scanDir(dir: string, relBase: string): { name: string; path: string; url: string; size: number }[] {
    const result: { name: string; path: string; url: string; size: number }[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return result;
    }
    for (const entry of entries) {
        if (entry.isFile() && IMAGE_EXT.test(entry.name)) {
            const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
            const stat = fs.statSync(path.join(dir, entry.name));
            result.push({
                name: entry.name,
                path: relPath,
                url: `/images/${relPath}`,
                size: stat.size,
            });
        }
    }
    return result;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') ?? '';

    if (folder === '__folders__') {
        // Return list of top-level sub-directories
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(BASE_DIR, { withFileTypes: true });
        } catch {
            return NextResponse.json({ folders: [] });
        }
        const folders = entries
            .filter(e => e.isDirectory())
            .map(e => e.name);
        // Also check for root-level image files
        const hasRoot = entries.some(e => e.isFile() && IMAGE_EXT.test(e.name));
        if (hasRoot) folders.unshift('(根目錄)');
        return NextResponse.json({ folders });
    }

    // Return files in the specified folder
    const targetDir = folder && folder !== '(根目錄)'
        ? path.join(BASE_DIR, folder)
        : BASE_DIR;
    const files = scanDir(targetDir, folder && folder !== '(根目錄)' ? folder : '');
    return NextResponse.json({ files });
}
