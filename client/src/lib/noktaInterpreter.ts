/**
 * Nokta Studio / Atölye Defteri — dil çekirdeği.
 * Bu modül, tarayıcıda çalışan güvenli bir Nokta v0.1 yorumlayıcısıdır.
 * Tasarım sorusu: Bu seçim Atölye Defteri yaklaşımını güçlendiriyor mu?
 */

export type ConsoleTone = "output" | "step" | "success" | "error" | "info";

export interface ConsoleEntry {
  tone: ConsoleTone;
  line?: number;
  text: string;
}

export interface RunResult {
  entries: ConsoleEntry[];
  ok: boolean;
  duration: number;
}

type Primitive = string | number | boolean | null;
type RuntimeValue = Primitive | RuntimeValue[] | RuntimeRecord | NativeFunction | NoktaFunction;
type RuntimeRecord = { [key: string]: RuntimeValue };
type NativeFunction = (...args: RuntimeValue[]) => RuntimeValue;

interface SourceLine {
  content: string;
  indent: number;
  line: number;
}

interface Token {
  type: "number" | "string" | "identifier" | "operator" | "punctuation" | "eof";
  value: string;
  column: number;
}

type Expression =
  | { type: "literal"; value: Primitive }
  | { type: "variable"; name: string }
  | { type: "list"; items: Expression[] }
  | { type: "record"; entries: { key: string; value: Expression }[] }
  | { type: "binary"; operator: string; left: Expression; right: Expression }
  | { type: "unary"; operator: string; value: Expression }
  | { type: "member"; object: Expression; property: string }
  | { type: "call"; callee: Expression; args: Expression[] };

type Statement =
  | { type: "output"; expression: Expression; line: number }
  | { type: "assign"; name: string; expression: Expression; line: number }
  | { type: "if"; condition: Expression; yes: Statement[]; no: Statement[]; line: number }
  | { type: "loop"; name: string; collection: Expression; body: Statement[]; line: number }
  | { type: "flow"; title: Expression; body: Statement[]; line: number }
  | { type: "step"; title: Expression; body: Statement[]; line: number }
  | { type: "function"; name: string; parameters: string[]; body: Statement[]; line: number }
  | { type: "return"; expression: Expression; line: number }
  | { type: "stop"; expression?: Expression; line: number }
  | { type: "expression"; expression: Expression; line: number };

class NoktaError extends Error {
  constructor(
    public readonly line: number,
    message: string,
  ) {
    super(message);
    this.name = "NoktaError";
  }
}

class Environment {
  private readonly values = new Map<string, RuntimeValue>();

  constructor(private readonly parent?: Environment) {}

  define(name: string, value: RuntimeValue) {
    this.values.set(name, value);
  }

  get(name: string, line: number): RuntimeValue {
    if (this.values.has(name)) return this.values.get(name)!;
    if (this.parent) return this.parent.get(name, line);
    throw new NoktaError(line, `“${name}” adında bir değer bulunamadı.`);
  }

  assign(name: string, value: RuntimeValue) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent && this.parent.has(name)) {
      this.parent.assign(name, value);
      return;
    }
    this.values.set(name, value);
  }

  private has(name: string): boolean {
    return this.values.has(name) || Boolean(this.parent?.has(name));
  }
}

class NoktaFunction {
  constructor(
    readonly parameters: string[],
    readonly body: Statement[],
    readonly closure: Environment,
  ) {}
}

class Lexer {
  private index = 0;

  constructor(private readonly source: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.index < this.source.length) {
      const current = this.source[this.index];
      if (/\s/.test(current)) {
        this.index += 1;
        continue;
      }
      const column = this.index + 1;
      if (current === '"' || current === "'") {
        tokens.push(this.readString(current, column));
        continue;
      }
      if (/[0-9]/.test(current)) {
        tokens.push(this.readNumber(column));
        continue;
      }
      if (isIdentifierStart(current)) {
        tokens.push(this.readIdentifier(column));
        continue;
      }
      const pair = this.source.slice(this.index, this.index + 2);
      if (["==", "!=", ">=", "<=", "|>"].includes(pair)) {
        tokens.push({ type: "operator", value: pair, column });
        this.index += 2;
        continue;
      }
      if (["+", "-", "*", "/", "%", ">", "<", "="].includes(current)) {
        tokens.push({ type: "operator", value: current, column });
        this.index += 1;
        continue;
      }
      if (["(", ")", "[", "]", "{", "}", ",", ".", ":"].includes(current)) {
        tokens.push({ type: "punctuation", value: current, column });
        this.index += 1;
        continue;
      }
      throw new NoktaError(0, `İfade içindeki “${current}” karakteri tanınmıyor.`);
    }
    tokens.push({ type: "eof", value: "", column: this.source.length + 1 });
    return tokens;
  }

  private readString(quote: string, column: number): Token {
    this.index += 1;
    let value = "";
    while (this.index < this.source.length && this.source[this.index] !== quote) {
      if (this.source[this.index] === "\\") {
        const next = this.source[this.index + 1];
        const escapes: Record<string, string> = { n: "\n", t: "\t", '"': '"', "'": "'", "\\": "\\" };
        value += escapes[next] ?? next;
        this.index += 2;
      } else {
        value += this.source[this.index];
        this.index += 1;
      }
    }
    if (this.source[this.index] !== quote) {
      throw new NoktaError(0, "Metin ifadesi kapanış tırnağı olmadan bitiyor.");
    }
    this.index += 1;
    return { type: "string", value, column };
  }

  private readNumber(column: number): Token {
    const start = this.index;
    while (/[0-9_.]/.test(this.source[this.index] ?? "")) this.index += 1;
    return { type: "number", value: this.source.slice(start, this.index).replaceAll("_", ""), column };
  }

  private readIdentifier(column: number): Token {
    const start = this.index;
    while (isIdentifierPart(this.source[this.index] ?? "")) this.index += 1;
    return { type: "identifier", value: this.source.slice(start, this.index), column };
  }
}

class ExpressionParser {
  private position = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly line: number,
  ) {}

  parse(): Expression {
    const expression = this.parsePipe();
    if (!this.check("eof")) {
      throw this.error(`“${this.peek().value}” ifadesi burada beklenmiyor.`);
    }
    return expression;
  }

  private parsePipe(): Expression {
    let expression = this.parseOr();
    while (this.matchOperator("|>")) {
      const target = this.parsePostfix();
      expression = target.type === "call"
        ? { ...target, args: [expression, ...target.args] }
        : { type: "call", callee: target, args: [expression] };
    }
    return expression;
  }

  private parseOr(): Expression {
    let expression = this.parseAnd();
    while (this.matchWord("veya")) {
      expression = { type: "binary", operator: "veya", left: expression, right: this.parseAnd() };
    }
    return expression;
  }

  private parseAnd(): Expression {
    let expression = this.parseEquality();
    while (this.matchWord("ve")) {
      expression = { type: "binary", operator: "ve", left: expression, right: this.parseEquality() };
    }
    return expression;
  }

  private parseEquality(): Expression {
    let expression = this.parseComparison();
    while (this.matchOperator("==", "!=")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseComparison() };
    }
    return expression;
  }

  private parseComparison(): Expression {
    let expression = this.parseTerm();
    while (this.matchOperator(">", ">=", "<", "<=")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseTerm() };
    }
    return expression;
  }

  private parseTerm(): Expression {
    let expression = this.parseFactor();
    while (this.matchOperator("+", "-")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseFactor() };
    }
    return expression;
  }

  private parseFactor(): Expression {
    let expression = this.parseUnary();
    while (this.matchOperator("*", "/", "%")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseUnary() };
    }
    return expression;
  }

  private parseUnary(): Expression {
    if (this.matchOperator("-")) return { type: "unary", operator: "-", value: this.parseUnary() };
    if (this.matchWord("degil")) return { type: "unary", operator: "degil", value: this.parseUnary() };
    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expression = this.parsePrimary();
    while (true) {
      if (this.matchPunctuation(".")) {
        const property = this.consume("identifier", "Nokta işaretinden sonra bir alan adı bekleniyor.").value;
        expression = { type: "member", object: expression, property };
      } else if (this.matchPunctuation("(")) {
        const args: Expression[] = [];
        if (!this.checkPunctuation(")")) {
          do args.push(this.parsePipe()); while (this.matchPunctuation(","));
        }
        this.consumePunctuation(")", "Çağrı kapanış parantezi eksik.");
        expression = { type: "call", callee: expression, args };
      } else {
        break;
      }
    }
    return expression;
  }

  private parsePrimary(): Expression {
    if (this.match("number")) return { type: "literal", value: Number(this.previous().value) };
    if (this.match("string")) return { type: "literal", value: this.previous().value };
    if (this.matchWord("dogru")) return { type: "literal", value: true };
    if (this.matchWord("yanlis")) return { type: "literal", value: false };
    if (this.matchWord("bos")) return { type: "literal", value: null };
    if (this.match("identifier")) return { type: "variable", name: this.previous().value };
    if (this.matchPunctuation("(")) {
      const value = this.parsePipe();
      this.consumePunctuation(")", "Kapanış parantezi eksik.");
      return value;
    }
    if (this.matchPunctuation("[")) {
      const items: Expression[] = [];
      if (!this.checkPunctuation("]")) {
        do items.push(this.parsePipe()); while (this.matchPunctuation(","));
      }
      this.consumePunctuation("]", "Liste kapanış köşeli parantezi eksik.");
      return { type: "list", items };
    }
    if (this.matchPunctuation("{")) {
      const entries: { key: string; value: Expression }[] = [];
      if (!this.checkPunctuation("}")) {
        do {
          const keyToken = this.peek();
          if (!["identifier", "string"].includes(keyToken.type)) throw this.error("Kayıt alan adı bekleniyor.");
          this.position += 1;
          this.consumePunctuation(":", "Kayıt alanından sonra iki nokta bekleniyor.");
          entries.push({ key: keyToken.value, value: this.parsePipe() });
        } while (this.matchPunctuation(","));
      }
      this.consumePunctuation("}", "Kayıt kapanış süslü parantezi eksik.");
      return { type: "record", entries };
    }
    throw this.error("Değer veya ifade bekleniyor.");
  }

  private match(type: Token["type"]): boolean {
    if (!this.check(type)) return false;
    this.position += 1;
    return true;
  }

  private matchWord(...words: string[]) {
    if (this.peek().type !== "identifier" || !words.includes(this.peek().value)) return false;
    this.position += 1;
    return true;
  }

  private matchOperator(...operators: string[]) {
    if (this.peek().type !== "operator" || !operators.includes(this.peek().value)) return false;
    this.position += 1;
    return true;
  }

  private matchPunctuation(value: string) {
    if (!this.checkPunctuation(value)) return false;
    this.position += 1;
    return true;
  }

  private consume(type: Token["type"], message: string): Token {
    if (this.check(type)) return this.tokens[this.position++];
    throw this.error(message);
  }

  private consumePunctuation(value: string, message: string) {
    if (this.checkPunctuation(value)) return this.tokens[this.position++];
    throw this.error(message);
  }

  private check(type: Token["type"]) { return this.peek().type === type; }
  private checkPunctuation(value: string) { return this.peek().type === "punctuation" && this.peek().value === value; }
  private peek() { return this.tokens[this.position]; }
  private previous() { return this.tokens[this.position - 1]; }
  private error(message: string) { return new NoktaError(this.line, `${message} (sütun ${this.peek().column})`); }
}

class ProgramParser {
  private index = 0;

  constructor(private readonly lines: SourceLine[]) {}

  parse(): Statement[] {
    if (this.lines.length === 0) return [];
    return this.parseBlock(this.lines[0].indent);
  }

  private parseBlock(indent: number): Statement[] {
    const body: Statement[] = [];
    while (this.index < this.lines.length) {
      const source = this.lines[this.index];
      if (source.indent < indent) break;
      if (source.indent > indent) throw new NoktaError(source.line, "Bu satır beklenenden fazla girintili.");
      if (source.content === "degilse:") break;
      body.push(this.parseStatement());
    }
    return body;
  }

  private parseStatement(): Statement {
    const source = this.lines[this.index];
    const { content, line } = source;
    if (content.startsWith("yaz ")) {
      this.index += 1;
      return { type: "output", expression: parseExpression(content.slice(4), line), line };
    }
    if (content.startsWith("dondur ")) {
      this.index += 1;
      return { type: "return", expression: parseExpression(content.slice(7), line), line };
    }
    if (content === "dur" || content.startsWith("dur ")) {
      this.index += 1;
      return { type: "stop", expression: content.length > 3 ? parseExpression(content.slice(4), line) : undefined, line };
    }
    if (content.startsWith("eger ") && content.endsWith(":")) {
      const condition = parseExpression(content.slice(5, -1), line);
      this.index += 1;
      const yes = this.parseChildBlock(source);
      let no: Statement[] = [];
      if (this.index < this.lines.length && this.lines[this.index].indent === source.indent && this.lines[this.index].content === "degilse:") {
        const elseLine = this.lines[this.index];
        this.index += 1;
        no = this.parseChildBlock(elseLine);
      }
      return { type: "if", condition, yes, no, line };
    }
    const loop = content.match(/^her\s+([A-Za-z_ÇĞİÖŞÜçğıöşü][A-Za-z0-9_ÇĞİÖŞÜçğıöşü]*)\s+icin\s+(.+):$/);
    if (loop) {
      this.index += 1;
      return { type: "loop", name: loop[1], collection: parseExpression(loop[2], line), body: this.parseChildBlock(source), line };
    }
    const flow = content.match(/^akis\s+(.+):$/);
    if (flow) {
      this.index += 1;
      return { type: "flow", title: parseExpression(flow[1], line), body: this.parseChildBlock(source), line };
    }
    const step = content.match(/^adim\s+(.+):$/);
    if (step) {
      this.index += 1;
      return { type: "step", title: parseExpression(step[1], line), body: this.parseChildBlock(source), line };
    }
    const fn = content.match(/^islev\s+([A-Za-z_ÇĞİÖŞÜçğıöşü][A-Za-z0-9_ÇĞİÖŞÜçğıöşü]*)\s*\((.*)\)\s*:\s*$/);
    if (fn) {
      const parameters = fn[2].trim() === "" ? [] : fn[2].split(",").map((parameter) => parameter.trim());
      if (parameters.some((parameter) => !/^[A-Za-z_ÇĞİÖŞÜçğıöşü][A-Za-z0-9_ÇĞİÖŞÜçğıöşü]*$/.test(parameter))) {
        throw new NoktaError(line, "İşlev parametreleri virgülle ayrılmış geçerli isimler olmalı.");
      }
      this.index += 1;
      return { type: "function", name: fn[1], parameters, body: this.parseChildBlock(source), line };
    }
    const assignment = content.match(/^([A-Za-z_ÇĞİÖŞÜçğıöşü][A-Za-z0-9_ÇĞİÖŞÜçğıöşü]*)\s*=\s*(.+)$/);
    if (assignment) {
      this.index += 1;
      return { type: "assign", name: assignment[1], expression: parseExpression(assignment[2], line), line };
    }
    this.index += 1;
    return { type: "expression", expression: parseExpression(content, line), line };
  }

  private parseChildBlock(parent: SourceLine): Statement[] {
    const next = this.lines[this.index];
    if (!next || next.indent <= parent.indent) {
      throw new NoktaError(parent.line, "Bu başlıktan sonra girintili bir blok bekleniyor.");
    }
    return this.parseBlock(next.indent);
  }
}

class Runtime {
  readonly entries: ConsoleEntry[] = [];
  private operations = 0;

  tick(line: number) {
    this.operations += 1;
    if (this.operations > 12_000) throw new NoktaError(line, "Program güvenlik sınırını aştı; olası sonsuz döngü durduruldu.");
  }

  executeBlock(statements: Statement[], environment: Environment): { kind: "normal" | "return" | "stop"; value?: RuntimeValue } {
    for (const statement of statements) {
      this.tick(statement.line);
      const signal = this.execute(statement, environment);
      if (signal.kind !== "normal") return signal;
    }
    return { kind: "normal" };
  }

  private execute(statement: Statement, environment: Environment): { kind: "normal" | "return" | "stop"; value?: RuntimeValue } {
    switch (statement.type) {
      case "output":
        this.entries.push({ tone: "output", line: statement.line, text: formatValue(this.evaluate(statement.expression, environment, statement.line)) });
        return { kind: "normal" };
      case "assign":
        environment.assign(statement.name, this.evaluate(statement.expression, environment, statement.line));
        return { kind: "normal" };
      case "expression":
        this.evaluate(statement.expression, environment, statement.line);
        return { kind: "normal" };
      case "if":
        return this.executeBlock(isTruthy(this.evaluate(statement.condition, environment, statement.line)) ? statement.yes : statement.no, environment);
      case "loop": {
        const collection = this.evaluate(statement.collection, environment, statement.line);
        if (!Array.isArray(collection)) throw new NoktaError(statement.line, "“her” döngüsü bir liste üzerinde çalışır.");
        for (const item of collection) {
          const inner = new Environment(environment);
          inner.define(statement.name, item);
          const signal = this.executeBlock(statement.body, inner);
          if (signal.kind !== "normal") return signal;
        }
        return { kind: "normal" };
      }
      case "flow": {
        const title = formatValue(this.evaluate(statement.title, environment, statement.line));
        this.entries.push({ tone: "info", line: statement.line, text: `Akış başladı — ${title}` });
        const result = this.executeBlock(statement.body, environment);
        if (result.kind === "normal") this.entries.push({ tone: "success", line: statement.line, text: `Akış tamamlandı — ${title}` });
        return result;
      }
      case "step": {
        const title = formatValue(this.evaluate(statement.title, environment, statement.line));
        this.entries.push({ tone: "step", line: statement.line, text: title });
        const result = this.executeBlock(statement.body, environment);
        if (result.kind === "normal") this.entries.push({ tone: "success", line: statement.line, text: `Adım tamamlandı — ${title}` });
        return result;
      }
      case "function":
        environment.define(statement.name, new NoktaFunction(statement.parameters, statement.body, environment));
        return { kind: "normal" };
      case "return":
        return { kind: "return", value: this.evaluate(statement.expression, environment, statement.line) };
      case "stop":
        return { kind: "stop", value: statement.expression ? this.evaluate(statement.expression, environment, statement.line) : undefined };
    }
  }

  private evaluate(expression: Expression, environment: Environment, line: number): RuntimeValue {
    switch (expression.type) {
      case "literal": return expression.value;
      case "variable": return environment.get(expression.name, line);
      case "list": return expression.items.map((item) => this.evaluate(item, environment, line));
      case "record": return Object.fromEntries(expression.entries.map((entry) => [entry.key, this.evaluate(entry.value, environment, line)]));
      case "member": return getMember(this.evaluate(expression.object, environment, line), expression.property, line);
      case "unary": {
        const value = this.evaluate(expression.value, environment, line);
        return expression.operator === "-" ? -asNumber(value, line) : !isTruthy(value);
      }
      case "binary": return this.binary(expression, environment, line);
      case "call": {
        const callable = this.evaluate(expression.callee, environment, line);
        const args = expression.args.map((arg) => this.evaluate(arg, environment, line));
        return this.call(callable, args, line);
      }
    }
  }

  private binary(expression: Extract<Expression, { type: "binary" }>, environment: Environment, line: number): RuntimeValue {
    if (expression.operator === "ve") {
      const left = this.evaluate(expression.left, environment, line);
      return isTruthy(left) && isTruthy(this.evaluate(expression.right, environment, line));
    }
    if (expression.operator === "veya") {
      const left = this.evaluate(expression.left, environment, line);
      return isTruthy(left) || isTruthy(this.evaluate(expression.right, environment, line));
    }
    const left = this.evaluate(expression.left, environment, line);
    const right = this.evaluate(expression.right, environment, line);
    switch (expression.operator) {
      case "+": return typeof left === "string" || typeof right === "string" ? formatValue(left) + formatValue(right) : asNumber(left, line) + asNumber(right, line);
      case "-": return asNumber(left, line) - asNumber(right, line);
      case "*": return asNumber(left, line) * asNumber(right, line);
      case "/": {
        const divisor = asNumber(right, line);
        if (divisor === 0) throw new NoktaError(line, "Sıfıra bölme yapılamaz.");
        return asNumber(left, line) / divisor;
      }
      case "%": return asNumber(left, line) % asNumber(right, line);
      case "==": return areEqual(left, right);
      case "!=": return !areEqual(left, right);
      case ">": return asNumber(left, line) > asNumber(right, line);
      case ">=": return asNumber(left, line) >= asNumber(right, line);
      case "<": return asNumber(left, line) < asNumber(right, line);
      case "<=": return asNumber(left, line) <= asNumber(right, line);
      default: throw new NoktaError(line, `“${expression.operator}” işleci desteklenmiyor.`);
    }
  }

  private call(callable: RuntimeValue, args: RuntimeValue[], line: number): RuntimeValue {
    if (typeof callable === "function") return callable(...args);
    if (callable instanceof NoktaFunction) {
      if (args.length !== callable.parameters.length) {
        throw new NoktaError(line, `İşlev ${callable.parameters.length} değer bekliyor; ${args.length} değer verildi.`);
      }
      const local = new Environment(callable.closure);
      callable.parameters.forEach((parameter, index) => local.define(parameter, args[index]));
      const signal = this.executeBlock(callable.body, local);
      return signal.value ?? null;
    }
    throw new NoktaError(line, "Bu değer çağrılamaz; işlev adı veya işlev bekleniyordu.");
  }
}

function parseExpression(source: string, line: number) {
  try {
    return new ExpressionParser(new Lexer(source).tokenize(), line).parse();
  } catch (error) {
    if (error instanceof NoktaError && error.line === 0) throw new NoktaError(line, error.message);
    throw error;
  }
}

function normalizeSource(source: string): SourceLine[] {
  return source.replaceAll("\r", "").split("\n").flatMap((raw, index) => {
    const withoutTrailing = raw.replace(/\s+$/, "");
    if (/^\s*(#.*)?$/.test(withoutTrailing)) return [];
    if (/\t/.test(withoutTrailing)) throw new NoktaError(index + 1, "Girinti için sekme değil, boşluk kullanın.");
    const match = withoutTrailing.match(/^( *)/);
    return [{ content: withoutTrailing.trimStart(), indent: match?.[1].length ?? 0, line: index + 1 }];
  });
}

function getMember(object: RuntimeValue, property: string, line: number): RuntimeValue {
  if (Array.isArray(object) && property === "uzunluk") return object.length;
  if (typeof object === "string" && property === "uzunluk") return object.length;
  if (isRecord(object) && property in object) return object[property];
  throw new NoktaError(line, `Bu değerde “${property}” alanı bulunamadı.`);
}

function createGlobals(): Environment {
  const globals = new Environment();
  const onlyList = (value: RuntimeValue): RuntimeValue[] => {
    if (!Array.isArray(value)) throw new NoktaError(0, "Bu işlem bir liste bekliyor.");
    return value;
  };
  const onlyText = (value: RuntimeValue): string => {
    if (typeof value !== "string") throw new NoktaError(0, "Bu işlem bir metin bekliyor.");
    return value;
  };
  globals.define("liste", {
    uzunluk: ((value) => onlyList(value).length) as NativeFunction,
    toplam: ((value) => onlyList(value).reduce<number>((total, item) => total + asNumber(item, 0), 0)) as NativeFunction,
    ortalama: ((value) => {
      const list = onlyList(value);
      return list.length === 0 ? 0 : list.reduce<number>((total, item) => total + asNumber(item, 0), 0) / list.length;
    }) as NativeFunction,
    ters_cevir: ((value) => [...onlyList(value)].reverse()) as NativeFunction,
    sirala: ((value) => [...onlyList(value)].sort((a, b) => formatValue(a).localeCompare(formatValue(b), "tr"))) as NativeFunction,
  });
  globals.define("metin", {
    buyuk: ((value) => onlyText(value).toLocaleUpperCase("tr")) as NativeFunction,
    kucuk: ((value) => onlyText(value).toLocaleLowerCase("tr")) as NativeFunction,
    uzunluk: ((value) => onlyText(value).length) as NativeFunction,
    birlestir: ((value, ayirac = "") => onlyList(value).map(formatValue).join(onlyText(ayirac))) as NativeFunction,
  });
  globals.define("sayi", {
    yuvarla: ((value) => Math.round(asNumber(value, 0))) as NativeFunction,
    mutlak: ((value) => Math.abs(asNumber(value, 0))) as NativeFunction,
  });
  globals.define("ornek_satislar", [
    { sehir: "Ankara", tutar: 1200, durum: "tamam" },
    { sehir: "İzmir", tutar: 850, durum: "bekliyor" },
    { sehir: "İstanbul", tutar: 2400, durum: "tamam" },
    { sehir: "Ankara", tutar: 675, durum: "tamam" },
  ]);
  return globals;
}

function isIdentifierStart(value: string) { return /^[A-Za-z_ÇĞİÖŞÜçğıöşü]$/.test(value); }
function isIdentifierPart(value: string) { return /^[A-Za-z0-9_ÇĞİÖŞÜçğıöşü]$/.test(value); }
function isTruthy(value: RuntimeValue) { return value !== false && value !== null && value !== 0 && value !== ""; }
function isRecord(value: RuntimeValue): value is RuntimeRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function asNumber(value: RuntimeValue, line: number): number {
  if (typeof value !== "number") throw new NoktaError(line, `Sayı bekleniyordu; “${formatValue(value)}” verildi.`);
  return value;
}
function areEqual(left: RuntimeValue, right: RuntimeValue) { return left === right; }

export function formatValue(value: RuntimeValue): string {
  if (value === null) return "boş";
  if (value === true) return "doğru";
  if (value === false) return "yanlış";
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (isRecord(value)) return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item)}`).join(", ")} }`;
  if (typeof value === "function" || value instanceof NoktaFunction) return "<işlev>";
  return String(value);
}

export function runNokta(source: string): RunResult {
  const started = performance.now();
  const runtime = new Runtime();
  try {
    const program = new ProgramParser(normalizeSource(source)).parse();
    const signal = runtime.executeBlock(program, createGlobals());
    if (signal.kind === "stop") runtime.entries.push({ tone: "info", text: signal.value ? `Akış durdu — ${formatValue(signal.value)}` : "Akış durdu." });
    return { entries: runtime.entries, ok: true, duration: performance.now() - started };
  } catch (error) {
    const details = error instanceof NoktaError ? error : new NoktaError(0, "Bilinmeyen bir çalışma hatası oluştu.");
    runtime.entries.push({ tone: "error", line: details.line || undefined, text: details.message });
    return { entries: runtime.entries, ok: false, duration: performance.now() - started };
  }
}

export interface NoktaExample {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  code: string;
}

export const NOKTA_EXAMPLES: NoktaExample[] = [
  {
    id: "merhaba",
    title: "İlk Nokta",
    subtitle: "Metin, değişken ve çıktı",
    tags: ["başlangıç", "yaz"],
    code: `# Nokta'da ilk programın
isim = "Dünya"
mesaj = "Merhaba, " + isim + "!"

yaz mesaj
yaz "İlk akışın hazır."`,
  },
  {
    id: "hesap",
    title: "Hesap ve işlev",
    subtitle: "İşlev tanımı ve dönüş değeri",
    tags: ["islev", "dondur"],
    code: `islev indirimli_fiyat(tutar, oran):
  eger oran < 0 veya oran > 1:
    dur "Oran 0 ile 1 arasında olmalı"
  dondur tutar * (1 - oran)

normal_fiyat = 1250
indirim = 0.20
sonuc = indirimli_fiyat(normal_fiyat, indirim)

yaz "İndirimli fiyat: " + sonuc`,
  },
  {
    id: "liste",
    title: "Liste akışı",
    subtitle: "Döngü, koşul ve yerleşik modüller",
    tags: ["her", "liste"],
    code: `notlar = [82, 91, 67, 95, 74]
toplam = liste.toplam(notlar)
ortalama = liste.ortalama(notlar)

yaz "Notlar: " + notlar
yaz "Toplam: " + toplam
yaz "Ortalama: " + ortalama

her not icin notlar:
  eger not >= 90:
    yaz "Öne çıkan not: " + not`,
  },
  {
    id: "satis",
    title: "Satış özeti",
    subtitle: "Akış, adım ve kayıtlarla çalışma",
    tags: ["akis", "adim"],
    code: `akis "Günlük satış özeti":
  adim "Siparişleri incele":
    satislar = ornek_satislar
    tamamlanan = 0
    ciro = 0

    her siparis icin satislar:
      eger siparis.durum == "tamam":
        tamamlanan = tamamlanan + 1
        ciro = ciro + siparis.tutar

  adim "Raporu göster":
    yaz "Tamamlanan sipariş: " + tamamlanan
    yaz "Toplam ciro: " + ciro`,
  },
];

export const DEFAULT_CODE = NOKTA_EXAMPLES[3].code;
