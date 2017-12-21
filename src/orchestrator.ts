import * as glob from 'glob';
import { promisify } from 'util';
import { resolve } from 'path';
import { generateEffectsMapping } from './parser';
import { getEffectsTrees } from './tree-maker';
import { lstat } from 'fs';

export function convertFilesToEffectTrees() {
	return getFiles().then(files => {
	  const effectsMapping = generateEffectsMapping(files);
	  return getEffectsTrees(effectsMapping);
	});
  }

  export function getFiles() {
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

	return Promise.all(filesPromises).then(filesData =>
	  filesData.reduce((a, b) => a.concat(b), [])
	);
  }