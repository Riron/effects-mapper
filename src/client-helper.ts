import { writeFileSync } from 'fs';
import { Output } from './tree-maker';
import { convertFilesToEffectTrees } from './orchestrator';

getEffectTreesAndWriteThemInFile()
	.then(_ => console.log('Trees written in JSON file'))
	.catch(err => console.log('ERROR !', err));

async function getEffectTreesAndWriteThemInFile() {
  const effectTrees = await convertFilesToEffectTrees();

  const treesToWrite = effectTrees.map(tree => {
    if (tree.length > 1) {
      return {
        name: `${tree[0].name}`,
        children: tree.map(t => outputToMap2Tree(t))
      };
    }

    return outputToMap2Tree(tree[0]);
  });

  writeFileSync(
    './dist/trees.json',
    JSON.stringify(treesToWrite, undefined, 4)
  );
}

function outputToMap2Tree(output: Output): any {
  if (output == null) {
    return;
  }

  return {
    name: output.name,
    object: {
      from: output.object.from,
      fileInfo: output.object.fileInfo
    },
    children: output.children.map(o => outputToMap2Tree(o))
  };
}
