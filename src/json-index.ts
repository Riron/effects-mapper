import { printEffectsTrees } from './tree-maker';
import { generateEffectsMapping } from './parser';
import { getFiles } from './orchestrator';

convertFilesToEffectTrees()
  .then(fileName => console.log(`Done ! Trees written to ./${fileName}`))
  .catch(err => console.log('ERROR !', err));

function convertFilesToEffectTrees() {
  return getFiles().then(files => {
    const effectsMapping = generateEffectsMapping(files);
    return printEffectsTrees(effectsMapping);
  });
}
