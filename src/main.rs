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

use indoc::indoc;
use std::{collections::HashMap, fs::File, io::Read, process::exit, rc::Rc, str::Chars, char};

// Based on ck.c

fn print_help_and_exit() {
    println!(
        indoc! {
        "
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

// Arguments

struct CliArgs {
    interactive: bool,
    code: String,
    init_filename: String,
}

fn parse_args() -> CliArgs {
    let mut cli = CliArgs {
        interactive: false,
        code: String::new(),
        init_filename: String::new(),
    };

    let mut i = 1;
    let mut args = std::env::args();
    while i < args.len() {
        match args.nth(i).unwrap().as_ref() {
            "-i" => cli.interactive = true,
            "-c" => {
                i += 1;
                cli.code.push('\n');
                cli.code.push_str(args.nth(i).unwrap().as_ref());
            }
            "-f" => {
                i += 1;
                cli.init_filename = args.nth(i).unwrap().clone();
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
                cli.code.push('\n');
                file.read_to_string(&mut cli.code).unwrap();
            }
        }
        i += 1;
    }

    cli
}

// Symbol Table

type SymbolId = u32;

// Value

enum Literal {
    Nil,
    Int(i64),
    Float(f64),
    Str(String),
}

enum Value {
    Lit(Literal),
    Cons(Rc<Value>, Rc<Value>),
    Magic(Magic),
    Func(Func),
}

enum Instr {
    Load(SymbolId), // Load from global table
    App(SymbolId),  // Load function from global table and apply
    Set(SymbolId),  // Pop and set to global table
}

struct Func {
    instrs: Vec<Instr>,
}

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

    fn run(&mut self) {}
}

// Parse

struct Parser<'vm> {
    vm: &'vm mut VM, // Destination VM
    partial: String, // Partial code
    partial_f: Vec<Vec<Instr>>, // Partial function
}

fn is_special_char(c: char) -> bool {
    match c {
        '(' | ')' | '\'' | '"' | '`' | '#' => true,
        _ => c.is_whitespace(),
    }
}

fn skip_whitespace(chars: &mut Chars) {
    chars.find(|c| !c.is_whitespace());
}

fn parse_string(chars: &mut Chars) -> Result<String, Option<String>> {
    // Check open
    let open = chars.next().unwrap();
    let mut open_n = 1;
    while let Some(c) = chars.nth(0) {
        if c != open { break; }
        open_n += 1;
        chars.next();
    }
    // Parse string until close
    let mut s = String::new();
    while let Some(c) = chars.next() {
        if c == open {
            // Check close
            let mut close_n = 1;
            while let Some(c) = chars.nth(0) {
                if c != open { break; }
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

    fn parse_all(&mut self) {
        let mut chars = self.partial.chars();
        let mut f = Vec::new();
        loop {
            skip_whitespace(&mut chars);
            if let Some(c) = chars.nth(0) {
                match c {
                    // Comment
                    '#' => {
                        // Skip until newline
                        chars.find(|c| *c == '\n');
                    }
                    // String
                    '\'' | '"' | '`' => {
                        // Save position
                        let nchars = chars.clone();
                        match parse_string(&mut chars) {
                            Ok(s) => {
                                // Push string into global
                                let id = self.vm.alloc_id();
                                self.vm.global[id as usize] = Value::Lit(Literal::Str(s));
                                f.push(Instr::Load(id));
                            }
                            Err(None) => {
                                // No closing
                                chars = nchars;
                                break;
                            }
                            Err(Some(s)) => {
                                // Error occurred
                                panic!("ParsingError: {}", s);
                            }
                        }
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
                        f = self.partial_f.pop()
                            .unwrap_or_else(|| panic!("ParsingError: Unexpected ')'"));
                        let id = self.vm.alloc_id();
                        self.vm.global[id as usize] = Value::Func(func);
                        f.push(Instr::Load(id));
                    }
                    _ => {
                        // Otherwise, gather until special character
                        let mut s = String::new();
                        s.push(c);
                        while let Some(c) = chars.nth(0) {
                            if is_special_char(c) {
                                break;
                            }
                            s.push(c);
                        }
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
                            f.push(Instr::Load(id));
                        } else if let Ok(n) = s.parse::<f64>() {
                            // Push number into global
                            let id = self.vm.alloc_id();
                            self.vm.global[id as usize] = Value::Lit(Literal::Float(n));
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
    }

    fn parse(&mut self, code: &str) -> bool {
        // Create new string from partial code and code
        self.partial.push_str(code);
        self.parse_all();
        false
    }
}

fn main() {
    let cli = parse_args();
    println!("Interactive: {}", cli.interactive);
    let mut vm = VM::new();
    let mut parser = Parser::new(&mut vm);
    if !cli.code.is_empty() {
        parser.parse(&cli.code);
    }
}
