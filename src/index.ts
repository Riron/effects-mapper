import * as glob from 'glob';
import { promisify } from 'util';
import { resolve } from 'path';
import { generateEffectsMapping } from './parser';
import { getEffectsTrees } from './tree-maker';
import { output } from './console-output';
import { lstat } from 'fs';

convertFilesToEffectTrees()
  .then(effectTrees =>  output(effectTrees))
  .catch(err => console.log('ERROR !', err));

export function convertFilesToEffectTrees() {
  const filesAndDirectory = process.argv.slice(2);
  const lstatAsync = promisify(lstat);

  const filesPromises = filesAndDirectory.map(fileOrDirectory => {
    const fullPath = resolve('.', fileOrDirectory);
    return lstatAsync(fullPath).then(stats => {
      if (stats.isDirectory()) {
        return glob.sync(`${fullPath}/**/*.ts`);
      }
      return [fileOrDirectory];
    });
  });

  return Promise.all(filesPromises)
    .then(filesData => {
      const files = filesData.reduce((a, b) => a.concat(b), []);
      const effectsMapping = generateEffectsMapping(files);
      return getEffectsTrees(effectsMapping);
    })
}
