import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * One declaration per name, per file.
 *
 * TypeScript merges two identical `interface` declarations without a word, so
 * `BoardDirectoryEntry` existed twice, byte for byte, in `types/clover.ts` and
 * compiled cleanly for weeks. Identical copies are harmless right up until
 * someone edits one of them, at which point the merge silently produces a
 * shape neither author wrote.
 *
 * This reads declarations rather than types: it cannot tell a legitimate
 * overload from a duplicate, so it counts only the exported `interface` and
 * `type` names a file declares at its top level.
 */
const TYPES_ROOT = join(process.cwd(), 'resources/js/types');

function typeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            return typeFiles(path);
        }

        return /\.ts$/.test(path) && !/\.test\.ts$/.test(path) ? [path] : [];
    });
}

function declaredNames(source: string): string[] {
    return [
        ...source.matchAll(/^export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/gm),
    ].map((match) => match[1]);
}

describe('type declarations', () => {
    const files = typeFiles(TYPES_ROOT);

    it('finds the type files to scan', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)('declares each exported name once in %s', (file) => {
        const names = declaredNames(readFileSync(file, 'utf8'));
        const seen = new Set<string>();
        const duplicated = names.filter((name) => {
            if (seen.has(name)) {
                return true;
            }

            seen.add(name);

            return false;
        });

        expect(duplicated).toEqual([]);
    });
});
