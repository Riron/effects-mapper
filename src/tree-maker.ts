import { Mapping } from './parser';

export interface Output {
  actionName: string;
  from: string;
  fileInfo: string;
  children: Output[];
}

function getActionMap(actionName: string, mappings: Mapping[]): Mapping[] {
  const effects = mappings.filter(v =>
    v.inputTypes.some(t => !!actionName && t === actionName)
  );

  if (effects.length == 0) {
    return [{ name: 'action with no or unhandled side effect', inputTypes: [], returnType: [], fileInfo: '-'}];
  }

  return effects;
}

export function getEffectTree(actionName: string, mappings: Mapping[]): Output[] {
  const effects = getActionMap(actionName, mappings);

  return effects.map(effect => {
    return {
      actionName,
      from: effect.name,
      fileInfo: effect.fileInfo,
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
