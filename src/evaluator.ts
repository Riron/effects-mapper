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
      const propertiesOfType = checker
        .getPropertiesOfType(checker.getTypeAtLocation(newExpression))
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

      const args = newExpression.arguments;
      if (!args) {
        return undefined;
      }
      // TODO: quel argument choisir ?
      const argValues = args.map(a => evaluateExpression(a, checker));
      return argValues[0];

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
