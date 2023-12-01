# Chicken Knife Spec

## VM Structure

Chicken-knife's VM is a stack machine with a single buffer.
Every operation is performed on the stack machine, and some instructions read or modify the buffer.

VM contains the following components:

- Stack
  - Stack of values.
- Buffer
  - Buffer is a kind of editing file.
	- Buffer has 'buffer name' which is a path of the file, and 'content' which is a string.
- Markers
  - Markers is a list of marker, which pointing a position in the buffer.

## Value

Chicken knife has very few types.

- Nil: Not-in-list value. Falsy.
- Sep: Separator. Just a mark to separate values.
- Int: Integer value. (64bit signed)
- Flt: Floating point value. (64bit)
- Str: String value.
- Cons: Pair of two values.
- Func: Function. Internally, it is just a list of instructions.

## Code

Almost every string is a correct chicken-knife code.

See the below examples:

```chicken-knife
# <- This hash mark starts a line comment.
# You can write literal as below:
42
-3.14
"Hello, world!"
# Note that you may need spaces or newlines to separate expression.
1 2 3 # In this case, 1, 2, 3 are three different expressions.

# You can use one of ", ', ` to quote a string.
'This is a string.'
"This is a string too.
even if it contains newlines."
`This is a string too.`

# If the string starts with a single quote mark (one of ', ", `), you can escape the quote mark by doubling it.
'Single quoted word is: ''hello''.'

# Also, you can use multiple quote marks
''This is a string.''
``In this case, you can use ` in the string``
""""Any number of quote marks is allowed!""""

# For double-quotation mark, you can use \ to escape the quotation mark.
"For example, tab is \t and newline is \n."

# All other words without special characters such as space, newline, tab, (, ), ", ', `, # are treated as symbols.
hello world # There are two symbol 'hello' and 'world'
3 2 ++ remove-this_underscore # There are three symbols '3', '2', '++', 'remove-this_underscore'

# If expression's value is not function, it is pushed to the stack.
3 1.5 "hello" # From the top, ["hello", 1.5, 3]
# If expression's value is function, it is executed.
"hello" print # Push "hello" to the stack, and print it.
# To avoid calling function, add prefix $ to just push the function.
"hello" $print app # Push "hello", push print function and use app to call print.
# Also, you can define a new value using prefix $=
"Hello, world!" $=my-string # Push "Hello, world!" and pop it and assign it to my-string.
my-string print # Print "Hello, world!"

# To define a function, group them with ( and ).
# Note that (, ) does not modifiy stacks.
(1 2 +) $=three # This function push 1 2 and call +. As a result, it pushes 3.

# This is all! Any other features can be implemented by mixing aboves!

nil # This is also a global, which is a nil value.
3 nil cons # Push [3]
2 3 4 nil cons cons cons # Push [2, 3, 4]
# To conveiniently push a list, there is bracket syntax.
[ 1 2 3 ] # Push [1, 2, 3]
# This is nothing special! [ jush push a Sep, and ] pop items and cons until Sep is found!
# Notice that spaces between [, ] and other expression is required!
# [[ or [1 is not [ [ or [ 1.

# Passing function to function is also possible.
[ 1 2 3 ] $print map pop

1 10 range 0 $+ fold print # Print 55

# Let's define a function to calculate fibonacci
(
	# Check if the argument is 0 or 1
	dup 2 <
	# If it is 0 or 1, just return an argument
	()
	# Otherwise, calculate fib(n-1) and fib(n-2) and add them
	(
		dup 1 - fib
		swap 2 - fib
		+
	)
	# Execute if-the-else statement
	?
) $=fib
10 fib print # Print 55
```

## Cli

Chicken-knife's main purpose is to edit text interactively.
Many commands are provided to edit text in buffer.

### Argument

When starts chicken-knife, you can pass arguments to it.

- `-i`: forcely enable interactive mode.
- `-c <CODE>`: pass inline code.
- `-f <FILE>`: load the file in the buffer.

An argument without `-` is treated as a script file name.
Each code/load-file/script-file is executed in order.

If there was no code or file, or `-i` is passed, chicken-knife starts interactive mode.
It'll takes a code from stdin and execute it.

Note that every information messages are printed on stderr (including prompt, error messages, etc). You may want to redirect stdin to input script file, stdout to output file, and stderr to terminal or `/dev/null`.

For example,

```
# a.ck
(dup *) $=square
(square swap square +) $=norm

# a.sh

ck a.ck -c "3 4 norm print" # Print 25
ck -i a.ck -c "4 5 norm print" # Print 41 and start interactive mode
ck -f a.txt # Load a.txt and start interactive mode
```
