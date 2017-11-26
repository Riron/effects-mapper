import * as ts from 'typescript';
import { writeFileSync } from 'fs';

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

    console.log(evaluateExpression(node.initializer));

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

  function evaluateDecoratorNode(node: ts.Node): any {
    switch (node.kind) {
      case ts.SyntaxKind.PropertyDeclaration:
        if (!node.decorators) {
          return null;
        }
        return node.decorators.map(d => evaluateDecoratorNode(d));
      case ts.SyntaxKind.CallExpression:
        const callExpression = node as ts.CallExpression;
        return {
          expression: evaluateDecoratorNode(callExpression.expression),
          arguments: callExpression.arguments
            .map(arg => evaluateDecoratorNode(arg))
            .reduce((a, b) => a.concat(b), [])
        };
      case ts.SyntaxKind.Decorator:
        const decorator = node as ts.Decorator;
        return evaluateDecoratorNode(decorator.expression);

      case ts.SyntaxKind.Identifier:
        const identifier = node as ts.Identifier;
        return identifier.text;
      case ts.SyntaxKind.ObjectLiteralExpression:
        const objectLiteralExpression = node as ts.ObjectLiteralExpression;
        return objectLiteralExpression.properties.map(p =>
          evaluateDecoratorNode(p)
        );
      case ts.SyntaxKind.PropertyAssignment:
        const propertyAssignment = node as ts.PropertyAssignment;
        return {
          name: evaluateDecoratorNode(propertyAssignment.name),
          value: evaluateDecoratorNode(propertyAssignment.initializer)
        };
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.TrueKeyword:
        return true;
      default:
        return null;
    }
  }

  function evaluateExpression(node: ts.Node): any {
    switch (node.kind) {
      case ts.SyntaxKind.CallExpression:
        const callExpression = node as ts.CallExpression;
        return evaluateExpression(callExpression.arguments[0]);

      case ts.SyntaxKind.ArrowFunction:
        const arrowFunction = node as ts.ArrowFunction;
        return evaluateExpression(arrowFunction.body);

      case ts.SyntaxKind.NewExpression:
        const newExpression = node as ts.NewExpression;

        const classIdentifier = newExpression.expression as ts.Identifier;
        const propertiesOfType = checker
          .getPropertiesOfType(checker.getTypeAtLocation(newExpression))
          .filter(p => p.name === 'type');

        if (propertiesOfType.length === 0) {
          return undefined;
        }

        // type prop can be declared or passed as a constructor param
        const result = evaluateExpression(
          propertiesOfType[0].valueDeclaration!
        );
        if (result !== 'DECLARED_CONSTRUCT') {
          return result;
        }

        const args = newExpression.arguments;
        if (!args) {
          return undefined;
        }
        // TODO: quel argument choisir ?
        const argValues = args.map(a => evaluateExpression(a));
        return argValues[0];

      case ts.SyntaxKind.Parameter:
        const parameter = node as ts.ParameterDeclaration;
        return 'DECLARED_CONSTRUCT'; // declared in constructor

      case ts.SyntaxKind.PropertyDeclaration:
        const propertyDeclaration = node as ts.PropertyDeclaration;
        if (propertyDeclaration.initializer) {
          return evaluateExpression(propertyDeclaration.initializer);
        }
        return 'DECLARED_CONSTRUCT'; // declared in constructor

      case ts.SyntaxKind.ParenthesizedExpression:
        const parenthesizedExpression = node as ts.ParenthesizedExpression;
        return evaluateExpression(parenthesizedExpression.expression);

      case ts.SyntaxKind.ObjectLiteralExpression:
        const objectLiteralExpression = node as ts.ObjectLiteralExpression;
        const typeProperties = objectLiteralExpression.properties.filter(
          v =>
            ts.isIdentifier(v.name!) &&
            (v.name! as ts.Identifier).text === 'type'
        );
        if (typeProperties.length > 0) {
          const typeProperty = typeProperties.pop();
          return evaluateExpression(typeProperty!);
        }
        return undefined;

      case ts.SyntaxKind.PropertyAssignment:
        const propertyAssignment = node as ts.PropertyAssignment;
        return evaluateExpression(propertyAssignment.initializer);

      case ts.SyntaxKind.StringLiteral:
        const stringLiteral = node as ts.StringLiteral;
        return stringLiteral.text;

      default:
        return undefined;
    }

    //checker.getConstantValue()
  }
}

const empty = ts.createNodeArray<any>();

function arrayOrEmpty<T extends ts.Node>(
  v: ts.NodeArray<T> | undefined
): ts.NodeArray<T> {
  return v || empty;
}
