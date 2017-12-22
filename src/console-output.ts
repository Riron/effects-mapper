import { Output } from './tree-maker';
import chalk from 'chalk';

const bulletPoints = ['-', '+', '•'];

function getEffectText(node: Output, indent: number) {
  let dashes = '';
  for (let i = 0; i < indent - 1; i++) {
    dashes += '   ';
  }
  dashes += `${bulletPoints[indent % bulletPoints.length]} >`;

  return `${dashes} ${chalk.bold(node.name)} from ${chalk.yellow(
    node.object.from
  )} [ ${chalk.blue.italic(node.object.fileInfo)} ]`;
}

function print(tree: Output[], indent: number = 1): string {
  return tree
    .map(node => {
      const title = getEffectText(node, indent);

      const children = print(node.children, indent + 1);
      return `${title}\n${children}`;
    })
    .join('');
}

export function output(effects: Output[][]) {
  const output = effects.map(et => print(et)).join('\n\n');

  console.log(`
////////////////////////////
Total number of effects: ${effects.length}
////////////////////////////

${output}
  `);
}
