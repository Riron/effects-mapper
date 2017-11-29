Effects mapper for `@ngRx/Effects`

# Effects Mapper

Using `@ngRx/Effects` ? Ever had trouble following the flow of effects in your
app ? Easily generate a map of whats action causes what.

## Usage

Install the library from npm.

```
npm install -g effects-mapper
```

Use the CLI by providing the folder your app is in, or by directly passing
typescript files:

```
toname ./demo
toname ./file1.ts ./file2.ts
```

The output outputed to the console for now.

## How does it work ?

This tool does a static analysis of your code. It uses the Typescript compiler
to grab all properties decorated with `@Effect()` and perform an analysis of
their `ofType()` method to get the input types, and their return method to gues
what actions are emitted.

## Edges cases

There are edges cases that are not yet supported. If the library is not able to
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

And probably others... As people use the library, probably more and more cases
will be implemented. Feel free to create an issue if one of you effects is not
handled properly !
