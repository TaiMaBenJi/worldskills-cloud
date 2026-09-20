# 第19章附录 · mini 编译器完整代码（可运行）

> 这是第 19 章 19.8 节用到的**完整版** mini 编译器：词法分析 → 语法分析(AST) → ① 直接解释执行 ② 编译成栈式字节码 → 虚拟机执行。
> **零依赖**：任何一台装了 Python 3 的电脑都能跑。用法：把下面整段代码保存为 `mini_lang.py`，命令行执行 `python3 mini_lang.py`。
> 实测输出：解释执行与字节码虚拟机输出完全一致（`[25, -75, -70]`），代码末尾自带断言校验。
>
> **建议玩法（每完成一步，你就多懂一层）**：
> ① 原样跑通 → ② 加一个 `%` 取余运算符（词法→语法→求值→字节码四处各改一行）→ ③ 加 `while` 循环（体会跳转回填）→ ④ 加字符串类型（体会类型系统是怎么"长"出来的）。

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mini 编译器教学示例（第19章配套）：
   源码 -> 词法分析 -> 语法分析(AST) -> ①直接求值 ②编译成栈式字节码 + 虚拟机执行
   玩具语言：x = 10;  print(x*2+1);  if x > 5 { print(1); } else { print(0); }
"""
import re
import sys

# ================= 1. 词法分析：源码 -> token 流 =================
TOKEN_RE = re.compile(r"""
    (?P<num>\d+)
  | (?P<id>[A-Za-z_]\w*)
  | (?P<op>==|<=|>=|[-+*/(){};=<>])
  | (?P<ws>\s+)
""", re.X)


def tokenize(src):
    tokens, pos = [], 0
    while pos < len(src):
        m = TOKEN_RE.match(src, pos)
        if not m:
            raise SyntaxError("无法识别的字符: %r" % src[pos])
        pos = m.end()
        if m.lastgroup == "ws":
            continue
        tokens.append((m.lastgroup, m.group()))
    tokens.append(("eof", ""))
    return tokens


# ================= 2. 语法分析：token 流 -> AST（递归下降） =================
# 文法（自顶向下）：
#   program := stmt*
#   stmt    := ident '=' expr ';'  |  'print' '(' expr ')' ';'
#            | 'if' '(' expr ')' block ('else' block)?
#   block   := '{' stmt* '}'
#   expr    := add (('<'|'>'|'<='|'>='|'==') add)?
#   add     := mul (('+'|'-') mul)*
#   mul     := unary (('*'|'/') unary)*
#   unary   := '-' unary | primary
#   primary := num | ident | '(' expr ')'
class Parser:
    def __init__(self, toks):
        self.toks, self.i = toks, 0

    def peek(self):
        return self.toks[self.i]

    def next(self):
        t = self.toks[self.i]
        self.i += 1
        return t

    def expect(self, val):
        t = self.next()
        if t[1] != val:
            raise SyntaxError("期望 %r 得到 %r" % (val, t[1]))
        return t

    def parse(self):
        stmts = []
        while self.peek()[0] != "eof":
            stmts.append(self.stmt())
        return ("program", stmts)

    def block(self):
        self.expect("{")
        stmts = []
        while self.peek()[1] != "}":
            if self.peek()[0] == "eof":
                raise SyntaxError("缺少 }")
            stmts.append(self.stmt())
        self.expect("}")
        return stmts

    def stmt(self):
        t = self.peek()
        if t[1] == "print":
            self.next(); self.expect("("); e = self.expr(); self.expect(")"); self.expect(";")
            return ("print", e)
        if t[1] == "if":
            self.next(); self.expect("("); c = self.expr(); self.expect(")")
            th = self.block()
            el = None
            if self.peek()[1] == "else":
                self.next(); el = self.block()
            return ("if", c, th, el)
        if t[0] == "id":
            name = self.next()[1]; self.expect("="); e = self.expr(); self.expect(";")
            return ("assign", name, e)
        raise SyntaxError("不认识的语句: %r" % (t,))

    def expr(self):
        left = self.add()
        if self.peek()[1] in ("<", ">", "<=", ">=", "=="):
            op = self.next()[1]
            return ("bin", op, left, self.add())
        return left

    def add(self):
        node = self.mul()
        while self.peek()[1] in ("+", "-"):
            op = self.next()[1]
            node = ("bin", op, node, self.mul())
        return node

    def mul(self):
        node = self.unary()
        while self.peek()[1] in ("*", "/"):
            op = self.next()[1]
            node = ("bin", op, node, self.unary())
        return node

    def unary(self):
        if self.peek()[1] == "-":
            self.next()
            return ("neg", self.unary())
        return self.primary()

    def primary(self):
        t = self.next()
        if t[0] == "num":
            return ("num", int(t[1]))
        if t[0] == "id":
            return ("var", t[1])
        if t[1] == "(":
            e = self.expr(); self.expect(")"); return e
        raise SyntaxError("表达式错误: %r" % (t,))


# ================= 3a. 方式一：直接解释 AST =================
def evaluate(node, env):
    k = node[0]
    if k == "num":
        return node[1]
    if k == "var":
        return env.get(node[1], 0)
    if k == "neg":
        return -evaluate(node[1], env)
    if k == "bin":
        a, b = evaluate(node[2], env), evaluate(node[3], env)
        op = node[1]
        if op == "+": return a + b
        if op == "-": return a - b
        if op == "*": return a * b
        if op == "/": return a // b if b else 0
        if op == "<": return 1 if a < b else 0
        if op == ">": return 1 if a > b else 0
        if op == "<=": return 1 if a <= b else 0
        if op == ">=": return 1 if a >= b else 0
        if op == "==": return 1 if a == b else 0
    raise ValueError("未知节点 %r" % (node,))


def execute(stmts, env, out):
    for s in stmts:
        if s[0] == "assign":
            env[s[1]] = evaluate(s[2], env)
        elif s[0] == "print":
            out.append(evaluate(s[1], env))
        elif s[0] == "if":
            if evaluate(s[1], env):
                execute(s[2], env, out)
            elif s[3]:
                execute(s[3], env, out)


def run_ast(ast, env=None, out=None):
    env = {} if env is None else env
    out = [] if out is None else out
    execute(ast[1], env, out)
    return out


# ================= 3b. 方式二：编译成栈式字节码，由虚拟机执行 =================
BINOPS = {"+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV",
          "<": "LT", ">": "GT", "<=": "LE", ">=": "GE", "==": "EQ"}


def compile_node(node, code):
    k = node[0]
    if k == "num":
        code.append(("PUSH", node[1]))
    elif k == "var":
        code.append(("LOAD", node[1]))
    elif k == "neg":
        compile_node(node[1], code); code.append(("NEG",))
    elif k == "bin":
        compile_node(node[2], code); compile_node(node[3], code)
        code.append((BINOPS[node[1]],))


def compile_stmts(stmts, code):
    for s in stmts:
        if s[0] == "assign":
            compile_node(s[2], code); code.append(("STORE", s[1]))
        elif s[0] == "print":
            compile_node(s[1], code); code.append(("PRINT",))
        elif s[0] == "if":
            compile_node(s[1], code)
            jz = len(code); code.append(("JZ", None))
            compile_stmts(s[2], code)
            if s[3]:
                jmp = len(code); code.append(("JMP", None))
                code[jz] = ("JZ", len(code))
                compile_stmts(s[3], code)
                code[jmp] = ("JMP", len(code))
            else:
                code[jz] = ("JZ", len(code))


def vm_run(code, env=None, out=None):
    env = {} if env is None else env
    out = [] if out is None else out
    stack, pc = [], 0
    while pc < len(code):
        ins = code[pc]; pc += 1
        op = ins[0]
        if op == "PUSH": stack.append(ins[1])
        elif op == "LOAD": stack.append(env.get(ins[1], 0))
        elif op == "STORE": env[ins[1]] = stack.pop()
        elif op == "NEG": stack[-1] = -stack[-1]
        elif op in ("ADD", "SUB", "MUL", "DIV"):
            b, a = stack.pop(), stack.pop()
            stack.append(a + b if op == "ADD" else a - b if op == "SUB"
                         else a * b if op == "MUL" else (a // b if b else 0))
        elif op in ("LT", "GT", "LE", "GE", "EQ"):
            b, a = stack.pop(), stack.pop()
            r = {"LT": a < b, "GT": a > b, "LE": a <= b, "GE": a >= b, "EQ": a == b}[op]
            stack.append(1 if r else 0)
        elif op == "JZ":
            if stack.pop() == 0: pc = ins[1]
        elif op == "JMP":
            pc = ins[1]
        elif op == "PRINT":
            out.append(stack.pop())
        elif op == "HALT":
            break
        else:
            raise ValueError("未知指令 " + op)
    return out


DEMO = """x = 10;
y = x * 2 + 5;
print(y);
if (y > 20) { print(y - 100); } else { print(0); }
z = (x + y) * -2;
print(z);
"""


def main():
    src = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else DEMO
    print("=== 源码 ===")
    print(src)
    toks = tokenize(src)
    print("=== token 流（前 18 个）===")
    print(toks[:18])
    ast = Parser(toks).parse()
    print("=== AST（前 3 条语句）===")
    for s in ast[1][:3]:
        print(" ", s)
    out1 = run_ast(ast)
    print("=== 方式一：解释执行输出 ===")
    print(out1)
    code = []
    compile_stmts(ast[1], code)
    code.append(("HALT",))
    print("=== 方式二：生成的字节码 ===")
    for i, ins in enumerate(code):
        print("  %02d  %s" % (i, ins))
    out2 = vm_run(code)
    print("=== 方式二：虚拟机输出 ===")
    print(out2)
    assert out1 == out2, "两种方式结果不一致！"
    print("OK: 解释执行 == 编译执行，结果一致 ✔")


if __name__ == "__main__":
    main()
```

---

> 🔧 **改代码遇到不懂的**：回到第 19 章对照「七阶段流水线」表，每个函数都对应其中一个阶段。
> 🎬 **想看真人讲解**：App 首页 →「🌐 全网学习资源库」→ 编译原理区。
