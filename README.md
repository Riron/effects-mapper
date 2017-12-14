# Effects Mapper

Using `@ngrx/effects` ? Ever had trouble following the flow of effects in your
app ? Easily generate a map of whats action causes what.

## Usage

Install the library from npm.

```
npm install -g effects-mapper
```

Use the CLI by providing the folder your app is in, or by directly passing
typescript files:

```
effects-mapper ./demo // Pass entire folder
effects-mapper ./file1.ts ./file2.ts // Pass individual files
```

The output outputed to the console for now.

## How does it work ?

This tool statically analyze your code. It uses the Typescript compiler
to grab all properties decorated with the `@Effect()` decorator and then perform its work on it's `ofType()` and return call.

## Edges cases

Some edge cases are not fully supported yet. If the library is not able to
determine the return type of an effect, it will consider the return type is
null.

Example of unhandled cases:

```typescript
// If the type
@Effect() effect = this.ofType('A_TYPE')
	.map(action => { type: action.type })

// if you reference imports that are not part of the analysis, it won't be possible to guess the action type
import { AnAction } from 'unloadedNpmModule'
@Effect() effect = this.ofType('A_TYPE')
	.map(_ => AnAction)
```

And probably others... As people use the library, more and more cases
will be implemented. Feel free to create an issue if one of your effects is not
handled properly !
