import * as ts from 'typescript';
import { writeFileSync } from 'fs';
import { evaluateExpression, evaluateDecoratorNode } from './evaluator';

interface DecoratorEvaluation {
  expression: string;
  arguments: { name: string; value: any }[];
}

export interface Mapping {
  name: string;
  inputTypes: string[];
  returnType: string[];
  fileInfo: string;
}

export function printEffectsMapping(fileNames: string[]): void {
  const output = generateEffectsMapping(fileNames);
  // print out the doc
  writeFileSync('mapping.json', JSON.stringify(output, undefined, 4));
}

export function generateEffectsMapping(fileNames: string[]): Mapping[] {
  // Build a program using the set of root file names in fileNames
  const program = ts.createProgram(fileNames, {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
  });

  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker();

  const output: Mapping[] = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, node => visit(node, sourceFile));
    }
  }

  return output;

  function visit(node: ts.Node, sourceFile: ts.SourceFile) {
    const nodeDecoratorEvaluation = evaluateDecoratorNode(node);

    if (
      ts.isPropertyDeclaration(node) &&
      isDecoratedWithEffect(nodeDecoratorEvaluation)
    ) {
      const symbol = checker.getSymbolAtLocation(node.name);
      const name = symbol!.getName();

      const { fileInfo } = report(node, sourceFile);

      const returnType = getSymbolType(nodeDecoratorEvaluation, symbol!);

      const inputTypes = getOfType(node)
        .split('|')
        .map(s => s.trim());

      output.push({ name, returnType, inputTypes, fileInfo });
    }

    ts.forEachChild(node, node => visit(node, sourceFile));
  }

  function report(node: ts.Node, sourceFile: ts.SourceFile) {
    let { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    return {
      fileInfo: `${sourceFile.fileName} (${line + 1},${character + 1})`
    };
  }

  function getSymbolType(
    nodeDecoratorEvaluation: DecoratorEvaluation[],
    symbol: ts.Symbol
  ) {
    if (isEffectDecoratorWithoutDispatch(nodeDecoratorEvaluation)) {
      return ['void'];
    }

    const type = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );

    // Is generic ?
    const genericType = type as ts.GenericType;

    if (genericType.typeArguments && genericType.typeArguments.length) {
      return genericType.typeArguments.map(t => checker.typeToString(t));
    }

    // If not, weird but still return type
    return [checker.typeToString(type)];
  }

  function getOfType(node: ts.PropertyDeclaration) {
    if (!node.initializer) {
      return '';
    }

    const extractedType = evaluateExpression(node.initializer, checker);

    // TODO Look at when no typings info is specified
    // this.action$.ofType<TYPE>...
    return node.initializer
      .getChildAt(0)
      .getChildAt(0)
      .getChildAt(2)
      .getText();
  }

  function isDecoratedWithEffect(
    nodeDecoratorEvaluation: DecoratorEvaluation[]
  ): boolean {
    return (
      nodeDecoratorEvaluation &&
      nodeDecoratorEvaluation.some(e => e.expression === 'Effect')
    );
  }

  function isEffectDecoratorWithoutDispatch(
    nodeDecoratorEvaluation: DecoratorEvaluation[]
  ): boolean {
    return nodeDecoratorEvaluation.some(e =>
      e.arguments.some(e => e.name === 'dispatch' && e.value === false)
    );
  }
}

const empty = ts.createNodeArray<any>();

function arrayOrEmpty<T extends ts.Node>(
  v: ts.NodeArray<T> | undefined
): ts.NodeArray<T> {
  return v || empty;
}
