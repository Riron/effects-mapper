import * as console from 'console';
import * as ts from 'typescript';

export function evaluateExpression(
  node: ts.Node,
  checker: ts.TypeChecker
): any {
  switch (node.kind) {
    case ts.SyntaxKind.CallExpression:
      const callExpression = node as ts.CallExpression;
      return callExpression.arguments
        .map(arg => evaluateExpression(arg, checker))
        .reduce((a, b) => a.concat(b), []);

    case ts.SyntaxKind.ArrowFunction:
      const arrowFunction = node as ts.ArrowFunction;
      return evaluateExpression(arrowFunction.body, checker);

    case ts.SyntaxKind.NewExpression:
      const newExpression = node as ts.NewExpression;

      const classIdentifier = newExpression.expression as ts.Identifier;
      const type = checker.getTypeAtLocation(newExpression);
      const propertiesOfType = checker
        .getPropertiesOfType(type)
        .filter(p => p.name === 'type');

      if (propertiesOfType.length === 0) {
        return undefined;
      }

      // type prop can be declared or passed as a constructor param
      const result = evaluateExpression(
        propertiesOfType[0].valueDeclaration!,
        checker
      );
      if (result !== 'DECLARED_CONSTRUCT') {
        return result;
      }

      // Look for a param called `type` in the constructor
      const classConstructorParams = evaluateClass(
        type.symbol!.valueDeclaration!
      );
      const indexOfType = classConstructorParams.indexOf('type');

      // Get new type() params
      const args = newExpression.arguments;
      // if there is no args, or there is no type prop in the constructor,
      // we cannot guess. Return undefined
      if (!args || indexOfType === -1) {
        return undefined;
      }
      // Otherwise, we got a match. Evaluate arg and return it
      const argValues = args.map(a => evaluateExpression(a, checker));
      return argValues[indexOfType];

    case ts.SyntaxKind.Parameter:
      const parameter = node as ts.ParameterDeclaration;
      return 'DECLARED_CONSTRUCT';

    case ts.SyntaxKind.PropertyDeclaration:
      const propertyDeclaration = node as ts.PropertyDeclaration;
      if (propertyDeclaration.initializer) {
        return evaluateExpression(propertyDeclaration.initializer, checker);
      }
      return 'DECLARED_CONSTRUCT';

    case ts.SyntaxKind.ParenthesizedExpression:
      const parenthesizedExpression = node as ts.ParenthesizedExpression;
      return evaluateExpression(parenthesizedExpression.expression, checker);

    case ts.SyntaxKind.ArrayLiteralExpression:
      const arrayLiteralExpression = node as ts.ArrayLiteralExpression;
      return arrayLiteralExpression.elements.map(e =>
        evaluateExpression(e, checker)
      );

    case ts.SyntaxKind.ObjectLiteralExpression:
      const objectLiteralExpression = node as ts.ObjectLiteralExpression;
      const typeProperties = objectLiteralExpression.properties.filter(
        v =>
          ts.isIdentifier(v.name!) && (v.name! as ts.Identifier).text === 'type'
      );
      if (typeProperties.length > 0) {
        const typeProperty = typeProperties.pop();
        return evaluateExpression(typeProperty!, checker);
      }

      return undefined;

    case ts.SyntaxKind.PropertyAssignment:
      const propertyAssignment = node as ts.PropertyAssignment;
      return evaluateExpression(propertyAssignment.initializer, checker);

    case ts.SyntaxKind.StringLiteral:
      const stringLiteral = node as ts.StringLiteral;
      return stringLiteral.text;

    case ts.SyntaxKind.Identifier:
      const identifier = node as ts.Identifier;
      const symbol = checker.getSymbolAtLocation(identifier);
      if (!symbol) {
        return identifier.text;
      }

      if (!symbol.valueDeclaration) {
        const aliasedSymbol = checker.getAliasedSymbol(symbol);

        if (!aliasedSymbol.valueDeclaration) {
          return undefined;
        }
        return evaluateExpression(aliasedSymbol.valueDeclaration!, checker);
      }

      return evaluateExpression(symbol.valueDeclaration, checker);

    case ts.SyntaxKind.VariableDeclaration:
      const variableDeclaration = node as ts.VariableDeclaration;
      if (!variableDeclaration.initializer) {
        return undefined;
      }

      return evaluateExpression(variableDeclaration.initializer, checker);

    case ts.SyntaxKind.Block:
      const block = node as ts.Block;
      return block.statements
        .filter(s => s.kind === ts.SyntaxKind.ReturnStatement)
        .map(s => evaluateExpression(s, checker));

    case ts.SyntaxKind.ReturnStatement:
      const returnStatement = node as ts.ReturnStatement;
      return evaluateExpression(returnStatement.expression!, checker);

    default:
      return undefined;
  }
}

function evaluateClass(node: ts.Node): any {
  switch (node.kind) {
    case ts.SyntaxKind.ClassDeclaration:
      const classDeclaration = node as ts.ClassDeclaration;
      return classDeclaration.members
        .map(member => evaluateClass(member))
        .reduce((a, b) => a.concat(b), []);

    case ts.SyntaxKind.Constructor:
      const constructor = node as ts.ConstructorDeclaration;
      return constructor.parameters.map(parameter => evaluateClass(parameter));

    case ts.SyntaxKind.Parameter:
      const parameter = node as ts.ParameterDeclaration;
      return evaluateClass(parameter.name);

    case ts.SyntaxKind.Identifier:
      const identifier = node as ts.Identifier;
      return identifier.text;

    case ts.SyntaxKind.PropertyDeclaration:
      const propertyDeclaration = node as ts.PropertyDeclaration;
      return evaluateClass(propertyDeclaration.name);

    default:
      return undefined;
  }
}

export function evaluateOfType(node: ts.Node, checker: ts.TypeChecker): any {
  switch (node.kind) {
    case ts.SyntaxKind.CallExpression:
      const callExpression = node as ts.CallExpression;
      if (
        callExpression.arguments.every(
          a =>
            [ts.SyntaxKind.StringLiteral, ts.SyntaxKind.Identifier].indexOf(
              a.kind
            ) > -1
        )
      ) {
        return callExpression.arguments.map(arg =>
          evaluateOfType(arg, checker)
        );
      }

      return evaluateOfType(callExpression.expression, checker);

    case ts.SyntaxKind.PropertyAccessExpression:
      const propertyAccessExpression = node as ts.PropertyAccessExpression;
      return evaluateOfType(propertyAccessExpression.expression, checker);

    case ts.SyntaxKind.StringLiteral:
      const stringLiteral = node as ts.StringLiteral;
      return stringLiteral.text;

    case ts.SyntaxKind.Identifier:
      const identifier = node as ts.Identifier;
      const symbol = checker.getSymbolAtLocation(identifier);
      if (!symbol) {
        return identifier.text;
      }

      if (!symbol.valueDeclaration) {
        const aliasedSymbol = checker.getAliasedSymbol(symbol);

        if (!aliasedSymbol.valueDeclaration) {
          return undefined;
        }
        return evaluateExpression(aliasedSymbol.valueDeclaration!, checker);
      }

      return evaluateExpression(symbol.valueDeclaration, checker);

    case ts.SyntaxKind.VariableDeclaration:
      const variableDeclaration = node as ts.VariableDeclaration;
      if (!variableDeclaration.initializer) {
        return undefined;
      }

      return evaluateExpression(variableDeclaration.initializer, checker);

    default:
      return undefined;
  }
}

export function evaluateDecoratorNode(node: ts.Node): any {
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
