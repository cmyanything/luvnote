import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Run only after both builds. Existing customer files must stay byte-for-byte unchanged.
async function snapshot(dir) {
  const files = new Map();
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [file, hash] of await snapshot(path)) files.set(file, hash);
    } else {
      if (!entry.isFile()) throw new Error(`Unsupported output entry: ${path}`);
      files.set(path, createHash('sha256').update(await readFile(path)).digest('hex'));
    }
  }
  return files;
}
await readFile('dist/index.html');
const html = await readFile('dist-lab/template-lab/index.html', 'utf8');
if (!html.includes('/mylab/assets/') || !html.includes('/mylab/fonts/'))
  throw new Error('Build the Lab with LAB_BASE_PATH=/mylab/ before packaging.');
const before = await snapshot('dist');
await mkdir('dist/mylab'); // Refuse to overwrite an existing Lab or unrelated output.
for (const entry of await readdir('dist-lab', { withFileTypes: true })) {
  if (entry.name === 'template-lab') continue;
  await cp(join('dist-lab', entry.name), join('dist/mylab', entry.name), {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
}
await writeFile('dist/mylab/index.html', html);
const after = await snapshot('dist');
for (const [file, hash] of before) {
  if (after.get(file) !== hash) throw new Error(`Customer output changed: ${file}`);
}
console.log(`PASS: added /mylab; all ${before.size} existing customer files unchanged.`);
