import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result;
}
await stat('dist/index.html');
const files = await walk('dist');
const forbidden = [
  'Creative Template Lab',
  'luvnote-lab-story',
  'luvnote-lab-ready',
  'Our little world.',
  'experimental-native-lab',
];
for (const file of files) {
  if (/template-lab|previews|verification\.json|hand-\d\.woff2/.test(file))
    throw new Error(`Lab asset in production output: ${file}`);
  if (/\.(?:html|js|css|json)$/.test(file)) {
    const text = await readFile(file, 'utf8');
    if (forbidden.some((marker) => text.includes(marker)))
      throw new Error(`Lab runtime in production output: ${file}`);
  }
}
console.log(
  `PASS: ${files.length} production output files checked; no lab runtime, previews or configuration.`,
);
