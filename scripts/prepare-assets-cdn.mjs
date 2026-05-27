import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceDirectory = path.join(projectRoot, 'assets');
const outputDirectory = path.join(projectRoot, 'dist', 'assets-cdn');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, {
  recursive: true,
  filter: (source) => !source.endsWith('.DS_Store') && !source.endsWith('.gitkeep'),
});

console.log(`已生成 CDN 发布目录：${outputDirectory}`);
