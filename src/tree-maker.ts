import { writeFileSync } from 'fs';
import { Mapping } from './parser';

export interface Output {
  name: string;
  object: OutputParams;
  children: Output[];
}

interface OutputParams {
  from: string;
  fileInfo: string;
}

function getActionMap(actionName: string, mappings: Mapping[]): Mapping[] {
  const effects = mappings.filter(v =>
    v.inputTypes.some(t => !!actionName && t === actionName)
  );

  if (effects.length == 0) {
    return [
      {
        name: 'action with no or unhandled side effect',
        inputTypes: [],
        returnType: [],
        fileInfo: '-'
      }
    ];
  }

  return effects;
}

export function printEffectsTrees(mappings: Mapping[]): string {
  const output = getEffectsTrees(mappings);
  const fileName = `tree-${Math.floor(Date.now() / 1000)}.json`;
  // print out the doc
  writeFileSync(fileName, JSON.stringify(output, undefined, 4));

  return fileName;
}

export function getEffectTree(name: string, mappings: Mapping[]): Output[] {
  const effects = getActionMap(name, mappings);

  return effects.map(effect => {
    return {
      name,
      object: {
        from: effect.name,
        fileInfo: effect.fileInfo
      },
      children: effect.returnType
        .map(action => getEffectTree(action, mappings))
        .reduce((a, b) => a.concat(b), [])
    };
  });
}

export function getListOfEffects(mappings: Mapping[]) {
  const values = mappings
    .map(mapping => mapping.inputTypes)
    .reduce((a, b) => a.concat(b), []);

  return new Set(values);
}

export function getEffectsTrees(mappings: Mapping[]) {
  const effects = getListOfEffects(mappings);

  return Array.from(effects).map(effect => getEffectTree(effect, mappings));
}
