import { evaluateDecoratorNode, evaluateExpression, evaluateOfType } from '../src/evaluator';
import { expect } from 'chai';
import * as ts from 'typescript';
import 'mocha';

const { program, propertyDeclarations } = getProgramAndPropDeclarations();

describe('Actions returned as objects', () => {
  it('should find ReturnType with single return and non lettable operators', () => {
    const initializer = getInitializerAt(propertyDeclarations, 0);

    const result = evaluateExpression(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('LOGIN_SUCCESS');
  });

  it('should find ReturnType with lettable map operator', () => {
    const initializer = getInitializerAt(propertyDeclarations, 1);

    const result = evaluateExpression(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('LOGIN_SUCCESS');
  });

  it('should find ReturnTypes with lettable map + catchError operators', () => {
    const initializer = getInitializerAt(propertyDeclarations, 2);

    const result = evaluateExpression(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('LOGIN_SUCCESS');
    expect(result[1]).to.equal('LOGIN_FAILED');
  });
});

describe('Actions returned as class', () => {
  it('should find ReturnType with single class returned, containing readonly type', () => {
    const initializer = getInitializerAt(propertyDeclarations, 4);

    const result = evaluateExpression(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('FETCH_EVENT');
  });

  it('should find ReturnType with single class returned, with param type as const', () => {
    const initializer = getInitializerAt(propertyDeclarations, 8);

    const result = evaluateExpression(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('LOL');
  });
});

describe('Input actions', () => {
  it('should find InputTypes when passed as strings', () => {
    const initializer = getInitializerAt(propertyDeclarations, 0);

    const result = evaluateOfType(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('LOGIN');
  });

  it('should find InputTypes when passed as const', () => {
    const initializer = getInitializerAt(propertyDeclarations, 8);

    const result = evaluateOfType(initializer, program.getTypeChecker());
    expect(result[0]).to.equal('TEST');
  });
});

function getInitializerAt(propertyDeclarations, index: number): ts.Expression {
  return (propertyDeclarations[index] as ts.PropertyDeclaration).initializer;
}

function getProgramAndPropDeclarations() {
  // Use demo file for tests
  const sourceFileName = './demo/file.ts';

  const program = ts.createProgram([sourceFileName], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
  });

  const propertyDeclarations = [];
  function visit(node: ts.Node) {
    const nodeDecoratorEvaluation = evaluateDecoratorNode(node);
    if (
      ts.isPropertyDeclaration(node) &&
      isDecoratedWithEffect(nodeDecoratorEvaluation)
    ) {
      propertyDeclarations.push(node);
    }

    ts.forEachChild(node, node => visit(node));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, node => visit(node));
    }
  }

  return { program, propertyDeclarations };
}

function isDecoratedWithEffect(nodeDecoratorEvaluation: any): boolean {
  return (
    nodeDecoratorEvaluation &&
    nodeDecoratorEvaluation.some(e => e.expression === 'Effect')
  );
}
