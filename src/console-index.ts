import { convertFilesToEffectTrees } from './orchestrator';
import { output } from './console-output';

convertFilesToEffectTrees()
  .then(effectTrees => output(effectTrees))
  .catch(err => console.log('ERROR !', err));


