/*
 * Chicken Knife
 * A simple & light-weight stack-based text processor
 *
 * Author: lumiknit <aasr4r4@gmail.com>
 * License: MIT
 * COPYRIGHT (C) 2023 lumiknit ALL RIGHTS RESERVED
 *
 * See README.md for more information!
 *
 */

use ctrlc;
use indoc::indoc;
use std::{char, collections::HashMap, fs::File, io::Read, iter::Peekable, process::exit, rc::Rc, str::Chars};
use std::io::{Write};

// Based on ck.c

fn print_help_and_exit() {
    println!(
        indoc! {"
            {} {}
            A simple & light-weight stack-based text processor

            Usage:
            ck [options] [script files]

            Options:
            -i       \tInteractive Mode
            -c <code>\tInline code
            -f <file>\tFile for initial buffer content
            -h       \tPrint this help message and exit
            -v       \tPrint version and exit
        "},
        env!("CARGO_PKG_VERSION"),
        env!("CARGO_PKG_NAME")
    );
    exit(0);
}

fn print_version_and_exit() {
    println!(
        indoc! {r#"
        {} {}
    "#},
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION")
    );
    exit(0);
}

// Symbol Table

type SymbolId = u32;

// Value

#[derive(Debug)]
enum Literal {
    Nil,
    Int(i64),
    Float(f64),
    Str(String),
}

#[derive(Debug)]
enum Value {
    Lit(Literal),
    Cons(Rc<Value>, Rc<Value>),
    Magic(Magic),
    Func(Func),
}

#[derive(Debug)]
enum Instr {
    Load(SymbolId), // Load from global table
    App(SymbolId),  // Load function from global table and apply
    Set(SymbolId),  // Pop and set to global table
}

#[derive(Debug)]
struct Func {
    instrs: Vec<Instr>,
}

#[derive(Debug)]
enum Magic {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Eq,
    Neq,
    Lt,
    Gt,
    Leq,
    Geq,
    And,
    Or,
    Not,
    Neg,
    Print,
    Println,
    Read,
    Readln,
    Exit,
}

// VM: Stack Machine

struct VM {
    // Symbol table
    sym_cnt: SymbolId,
    sym_map: HashMap<String, SymbolId>,
    // Stack
    stack: Vec<Value>,
    // Global table
    global: Vec<Value>,
    // Call Frame
    call_frame: Vec<Value>,
}

impl VM {
    fn new() -> Self {
        Self {
            sym_cnt: 0,
            sym_map: HashMap::new(),
            stack: Vec::new(),
            global: Vec::new(),
            call_frame: Vec::new(),
        }
    }

    fn extend_global_for_sym(&mut self) {
        let cnt = self.sym_cnt as usize;
        while self.global.len() <= cnt {
            self.global.push(Value::Lit(Literal::Nil));
        }
    }

    fn alloc_id(&mut self) -> SymbolId {
        let id = self.sym_cnt;
        self.sym_cnt += 1;
        self.extend_global_for_sym();
        id
    }

    fn get_id(&mut self, s: &str) -> SymbolId {
        // Get symbol ID from symbol table
        if let Some(id) = self.sym_map.get(s) {
            *id
        } else {
            let id = self.sym_cnt;
            self.sym_map.insert(s.to_string(), id);
            self.sym_cnt += 1;
            self.extend_global_for_sym();
            id
        }
    }

    fn load_buffer_file(&mut self, filename: &str) -> std::io::Result<()> {
		let mut f: File = File::open(filename)?;
		let mut s = String::new();
		f.read_to_string(&mut s).unwrap();
		Ok(())
	}

    fn run(&mut self) {}
}

// Parse

struct Parser<'vm> {
    vm: &'vm mut VM,            // Destination VM
    partial: String,            // Partial code
    partial_f: Vec<Vec<Instr>>, // Partial function
}

fn is_special_char(c: char) -> bool {
    match c {
        '(' | ')' | '\'' | '"' | '`' | '#' => true,
        _ => c.is_whitespace(),
    }
}

fn skip_whitespace(chars: &mut Peekable<Chars>) {
	while let Some(c) = chars.peek() {
		if !c.is_whitespace() {
			break;
		}
		chars.next();
	}
}

fn parse_string(chars: &mut Peekable<Chars>) -> Result<String, Option<String>> {
    // Check open
    let open = chars.next().unwrap();
    let mut open_n = 1;
    while let Some(c) = chars.peek() {
        if *c != open {
            break;
        }
        open_n += 1;
        chars.next();
    }
    // Parse string until close
    let mut s = String::new();
    while let Some(c) = chars.next() {
        if c == open {
            // Check close
            let mut close_n = 1;
            while let Some(c) = chars.peek() {
                if *c != open {
                    break;
                }
                close_n += 1;
                chars.next();
            }
            if close_n == open_n {
                return Ok(s);
            }
            // Otherwise, push open
            if open_n == 1 {
                close_n = (close_n + 1) / 2;
            }
            for _ in 0..close_n {
                s.push(open);
            }
        } else {
            s.push(c);
        }
    }
    Err(None)
}

impl Parser<'_> {
    fn new<'vm>(vm: &'vm mut VM) -> Parser<'vm> {
        Parser {
            vm,
            partial: String::new(),
            partial_f: Vec::new(),
        }
    }

    fn parse_all(&mut self) -> Result<Func, Option<String>> {
        let mut chars = self.partial.chars().peekable();
        let mut f = Vec::new();
        loop {
            skip_whitespace(&mut chars);
            if let Some(c) = chars.peek() {
                match *c {
                    // Comment
                    '#' => {
                        // Skip until newline
                        chars.find(|c| *c == '\n');
                    }
                    // String
                    '\'' | '"' | '`' => {
                        // Save position
                        let mut nchars = chars.clone();
                        let s = parse_string(&mut nchars)?;
                        println!("str: '{}'", s);
                        // Push string into global
                        let id = self.vm.alloc_id();
                        self.vm.global[id as usize] = Value::Lit(Literal::Str(s));
                        f.push(Instr::Load(id));
                        // Skip
                        chars = nchars;
                    }
                    '(' => {
                        // Parse function
                        self.partial_f.push(f);
                        f = Vec::new();
                    }
                    ')' => {
                        // End of function
                        // Pack function
                        let func = Func { instrs: f };
                        // Pop function
                        f = self
                            .partial_f
                            .pop()
                            .unwrap_or_else(|| panic!("ParsingError: Unexpected ')'"));
                        let id = self.vm.alloc_id();
                        self.vm.global[id as usize] = Value::Func(func);
                        f.push(Instr::Load(id));
                    }
                    _ => {
                        // Otherwise, gather until special character
                        let mut s = String::new();
                        while let Some(c) = chars.peek() {
                            if is_special_char(*c) {
                                break;
                            }
                            s.push(chars.next().unwrap());
                        }
                        println!("id: '{}'", s);
                        if s.starts_with("$=") {
                            // Set global
                            let id = self.vm.get_id(&s[2..]);
                            f.push(Instr::Set(id));
                        } else if s.starts_with("$") {
                            // Load global
                            let id = self.vm.get_id(&s[1..]);
                            f.push(Instr::Load(id));
                        } else if let Ok(n) = s.parse::<i64>() {
                            // Push number into global
                            let id = self.vm.alloc_id();
                            self.vm.global[id as usize] = Value::Lit(Literal::Int(n));
                            println!("int: {}", n);
                            f.push(Instr::Load(id));
                        } else if let Ok(n) = s.parse::<f64>() {
                            // Push number into global
                            let id = self.vm.alloc_id();
                            self.vm.global[id as usize] = Value::Lit(Literal::Float(n));
                            println!("float: {}", n);
                            f.push(Instr::Load(id));
                        } else {
                            // Push symbol into global
                            let id = self.vm.get_id(&s);
                            f.push(Instr::App(id));
                        }
                    }
                }
            } else {
                break;
            }
        }
        self.partial = chars.collect();
        Ok(Func { instrs: f })
    }

    fn parse(&mut self, code: &str) -> Result<Func, Option<String>> {
        // Create new string from partial code and code
        self.partial.push_str(code);
        println!("code: '{}'", self.partial);
        self.parse_all()
    }
}

// Parsing args and run

fn execute_code(vm: &mut VM, filename: String, code: String) {
	let mut parser = Parser::new(vm);
	parser.parse(&code);
	vm.run();
}

fn run_interactive(vm: &mut VM) {
	// Interactive mode
	loop {
		let mut parser = Parser::new(vm);
		let f = loop {
			eprint!("> ");
			std::io::stdout().flush().unwrap();
			let mut buf = String::new();
			std::io::stdin().read_line(&mut buf).unwrap();
			match parser.parse(buf.as_str()) {
				Ok(f) => { break f; }
				Err(None) => {
					// Incomplete
					eprintln!("Incomplete");
				}
				Err(Some(e)) => {
					eprintln!("{}", e);
				}
			}
		};
		println!("Run: {:?}", f);
		vm.run();
	}
}

fn run_with_args(vm: &mut VM, mut args: std::env::Args) {
	let mut code_executed = false;
	let mut interactive = false;
    args.next();
    let mut args = args.enumerate();
    while let Some(a) = args.next() {
        match a.1.as_ref() {
            "-i" => interactive = true,
            "-c" => {
            	let (i, filename) = args.next().expect("Filename missing");
                code_executed = true;
                execute_code(vm, format!("<arg-{}>", i), filename);
            }
            "-f" => {
           		let (i, filename) = args.next().expect("Filename missing");
                if let Err(_) = vm.load_buffer_file(filename.as_str()) {
                	eprintln!("Failed to load buffer file: {}", filename);
					exit(1);
                }
            }
            "-h" => print_help_and_exit(),
            "-v" => print_version_and_exit(),
            s => {
                if s.starts_with("-") {
                    eprintln!("Unknown option: {}", s);
                    exit(1);
                }
                // Read file, name s
                let mut file =
                    File::open(s).unwrap_or_else(|_| panic!("Failed to open file: {}", s));
                let mut code = String::new();
                file.read_to_string(&mut code).unwrap();
                code_executed = true;
                execute_code(vm, s.to_string(), code);
            }
        }
    }
    if !code_executed || interactive {
		run_interactive(vm);
	}
}

// Main

fn main() {
    ctrlc::set_handler(move || {
        println!("Interrupted");
        std::process::exit(0);
    })
    .expect("Cannot setting Ctrl-C Handler");

    let mut vm = VM::new();
    run_with_args(&mut vm, std::env::args());
}
