import * as ts from 'typescript';
import * as fs from 'fs';

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

interface DecoratorEvaluation {
  expression: string;
  arguments: {name: string, value: any}[];
}

export interface Mapping {
  name: string;
  inputTypes: string[];
  returnType: string[];
}

function generateEffectsMapping(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  // Build a program using the set of root file names in fileNames
  const program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker();

  const output: any = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit);
    }
  }

  // print out the doc
  fs.writeFileSync('mapping.json', JSON.stringify(output, undefined, 4));

  return;

  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {
    const nodeDecoratorEvaluation = evaluateNode(node);

    if (ts.isPropertyDeclaration(node) && isDecoratedWithEffect(nodeDecoratorEvaluation)) {
      const symbol = checker.getSymbolAtLocation(node.name);
      const name = symbol!.getName();

      const returnType = getSymbolType(nodeDecoratorEvaluation, symbol!);

      const inputTypes = getOfType(node)
        .split('|')
        .map(s => s.trim());

      output.push({ name, returnType, inputTypes });
      console.log({ name, returnType, inputTypes });
    }

    ts.forEachChild(node, visit);
  }

  function getSymbolType(nodeDecoratorEvaluation: DecoratorEvaluation[], symbol: ts.Symbol) {
    if (isEffectDecoratorWithoutDispatch(nodeDecoratorEvaluation)) {
      return ['void'];
    }

    const type = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );

    const genericType = type as ts.GenericType;
    if (genericType.typeArguments && genericType.typeArguments.length) {
      return genericType.typeArguments.map(t => checker.typeToString(t));
    }

    return checker.typeToString(
      checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
    );
  }

  function getOfType(node: ts.PropertyDeclaration) {
    if (!node.initializer) {
      return '';
    }

    // Foireux ! todo sur des vrais méthodes & approfondir
    // this.action$.ofType<TYPE>...
    return node.initializer
      .getChildAt(0)
      .getChildAt(0)
      .getChildAt(2)
      .getText();
  }

  function isDecoratedWithEffect(nodeDecoratorEvaluation: DecoratorEvaluation[]): boolean {
    return nodeDecoratorEvaluation && nodeDecoratorEvaluation.some(e => e.expression === 'Effect');
  }

  function isEffectDecoratorWithoutDispatch(nodeDecoratorEvaluation: DecoratorEvaluation[]): boolean {
    return nodeDecoratorEvaluation.some(e => e.arguments.some(e => e.name === 'dispatch' && e.value === false));
  }

  function evaluateNode(node: ts.Node): any {
    switch (node.kind) {
      case ts.SyntaxKind.PropertyDeclaration:
        if (!node.decorators) {
          return null;
        }
        return node.decorators.map(d => evaluateNode(d));
      case ts.SyntaxKind.CallExpression:
        const callExpression = node as ts.CallExpression;
        return {
          expression: evaluateNode(callExpression.expression),
          arguments: callExpression.arguments.map(arg => evaluateNode(arg)).reduce((a, b) => a.concat(b), [])
        };
      case ts.SyntaxKind.Decorator:
        const decorator = node as ts.Decorator;
        return evaluateNode(decorator.expression);

      case ts.SyntaxKind.Identifier:
        const identifier = node as ts.Identifier;
        return identifier.text;
      case ts.SyntaxKind.ObjectLiteralExpression:
        const objectLiteralExpression = node as ts.ObjectLiteralExpression;
        return objectLiteralExpression.properties.map(p => evaluateNode(p));
      case ts.SyntaxKind.PropertyAssignment:
        const propertyAssignment = node as ts.PropertyAssignment;
        return {
          name: evaluateNode(propertyAssignment.name),
          value: evaluateNode(propertyAssignment.initializer)
        };
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.TrueKeyword:
        return true;
      default:
        return node.kind;
    }
  }
}

generateEffectsMapping(process.argv.slice(2), {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS
});

