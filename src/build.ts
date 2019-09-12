import { createWriteStream } from 'fs';

const MediaInfoLib = require('../lib/MediaInfoWasm.js');

let MediaInfoModule: any = false;

async function Init() {
  return new Promise((resolve) => {
    MediaInfoModule = MediaInfoLib({
      postRun: () => {
        resolve();
      },
    });
  });
}

async function main() {
  if (!MediaInfoModule) {
    await Init();
  }
  const file = createWriteStream('./src/types.ts');

  const parameters: string[] = MediaInfoModule.MediaInfo.Option_Static('Info_Parameters').split(/\r?\n/);
  const lines = parameters.map((line) => line.split(':')[0].trim().replace(/[()]/g, ''));

  while (lines.length) {
    const index = lines.findIndex((line) => line === '');
    const category = lines.splice(0, (index === -1) ? lines.length : index + 1);
    const type = category.shift();
    const filtered = Array.from(new Set(category.filter((line) => !line.match(/[/\-*]/g) && line.length > 0)));

    file.write(`export type ${type} = {\n`);
    file.write(`  '@type': '${type}'\n`);
    file.write('  [key: string]: string\n');
    filtered.forEach((line) => {
      file.write(`  ${line}: string\n`);
    });
    file.write(`}\n${lines.length ? '\n' : ''}`);
  }

  file.end();
}

main();
