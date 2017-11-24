import * as fs from 'fs';
import { Mapping } from './parser';

const fileContent = fs.readFileSync('mapping.json', 'utf8');
const json: Mapping[] = JSON.parse(fileContent);

export function getActionMap(actionName: string): Mapping[] {
  const effects = json.filter(v => v.inputTypes.some(t => t === actionName));

  if (effects.length == 0) {
    return [];
  }

  return effects;
}

const getDots = (dotNumber: number) => {
  const dots = [];
  for (let i = 0; i < dotNumber; i++) {
    dots.push('-');
  }
  return dots.join('');
};

function format(actionName: string, dotNumbers: number = 1): string {
  const effects = getActionMap(actionName);

  if (effects.length === 0) {
    return `${getDots(dotNumbers)}> ${actionName}`;
  }

  const children = effects.map(effect =>
    effect.returnType.map(an => format(an, dotNumbers + 1))
  );

  return effects
    .map(e => `${getDots(dotNumbers)}> ${actionName}\n${children}`)
    .join('\n\n');
}

console.log(format('FetchEvents'));
