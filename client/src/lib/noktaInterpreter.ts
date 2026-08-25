/**
 * Nokta Studio / Atölye Defteri — dil çekirdeği.
 * Bu modül, tarayıcıda çalışan güvenli bir Nokta v0.1 yorumlayıcısıdır.
 * Tasarım sorusu: Bu seçim Atölye Defteri yaklaşımını güçlendiriyor mu?
 */

export type ConsoleTone = "output" | "step" | "success" | "error" | "info" | "permission" | "automation";

export interface ConsoleEntry {
  tone: ConsoleTone;
  line?: number;
  text: string;
}

export interface RunResult {
  entries: ConsoleEntry[];
  plans: AutomationPlan[];
  previews: DataPreview[];
  diagnostics: Diagnostic[];
  ok: boolean;
  duration: number;
}

export interface AutomationPlan {
  kind: "zamanlama" | "olay";
  title: string;
  line: number;
}

export interface DataPreview {
  title: string;
  columns: string[];
  rows: RuntimeRecord[];
}

export interface DatasetSource {
  name: string;
  format: "csv" | "json";
  content: string;
}

export interface RunOptions {
  datasets?: Record<string, DatasetSource>;
}

export interface Diagnostic {
  code: string;
  line?: number;
  message: string;
  suggestion: string;
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
  | { type: "permission"; domain: string; target: Expression; line: number }
  | { type: "schedule"; title: Expression; body: Statement[]; line: number }
  | { type: "event"; title: Expression; body: Statement[]; line: number }
  | { type: "function"; name: string; parameters: string[]; body: Statement[]; line: number }
  | { type: "return"; expression: Expression; line: number }
  | { type: "stop"; expression?: Expression; line: number }
  | { type: "expression"; expression: Expression; line: number };

class NoktaError extends Error {
  constructor(
    public readonly line: number,
    message: string,
    public readonly code = "NOKTA_100",
    public readonly suggestion = "İfadeyi ve ilgili satırdaki veri türünü kontrol edin.",
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
    throw new NoktaError(line, `“${name}” adında bir değer bulunamadı.`, "NOKTA_101", `“${name}” için önce bir atama yapın veya adı yazım hatasına karşı kontrol edin.`);
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
    const permission = content.match(/^izin\s+(uygulama|bildirim|dosya|ag)\s+(.+)$/);
    if (permission) {
      this.index += 1;
      return { type: "permission", domain: permission[1], target: parseExpression(permission[2], line), line };
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
    const schedule = content.match(/^zamanla\s+(.+):$/);
    if (schedule) {
      this.index += 1;
      return { type: "schedule", title: parseExpression(schedule[1], line), body: this.parseChildBlock(source), line };
    }
    const event = content.match(/^olay\s+(.+):$/);
    if (event) {
      this.index += 1;
      return { type: "event", title: parseExpression(event[1], line), body: this.parseChildBlock(source), line };
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
  readonly plans: AutomationPlan[] = [];
  readonly previews: DataPreview[] = [];
  private readonly permissions = new Set<string>();
  private operations = 0;

  grantPermission(domain: string, target: string, line: number) {
    this.permissions.add(`${domain}:${target}`);
    this.entries.push({ tone: "permission", line, text: `İzin verildi — ${domain}: ${target}` });
  }

  requirePermission(domain: string, target: string) {
    if (!this.permissions.has(`${domain}:${target}`)) {
      throw new NoktaError(0, `“${target}” için ${domain} izni yok. Önce izin ${domain} "${target}" bildirin.`);
    }
  }

  requireAnyPermission(domain: string) {
    if (!Array.from(this.permissions).some((item) => item.startsWith(`${domain}:`))) {
      throw new NoktaError(0, `Bu eylem için en az bir ${domain} izni bildirin.`);
    }
  }

  addPreview(title: string, table: RuntimeRecord[]) {
    const columns = Array.from(new Set(table.flatMap((row) => Object.keys(row))));
    this.previews.push({ title, columns, rows: table.slice(0, 6) });
    this.entries.push({ tone: "info", text: `Tablo önizlemesi hazır — ${title}: ${table.length} satır, ${columns.length} sütun` });
  }

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
      case "permission": {
        const target = this.evaluate(statement.target, environment, statement.line);
        if (typeof target !== "string") throw new NoktaError(statement.line, "İzin hedefi metin olmalı.");
        this.grantPermission(statement.domain, target, statement.line);
        return { kind: "normal" };
      }
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
      case "schedule": {
        const title = formatValue(this.evaluate(statement.title, environment, statement.line));
        this.plans.push({ kind: "zamanlama", title, line: statement.line });
        this.entries.push({ tone: "automation", line: statement.line, text: `Zamanlama planlandı — ${title}` });
        const result = this.executeBlock(statement.body, new Environment(environment));
        if (result.kind === "normal") this.entries.push({ tone: "success", line: statement.line, text: `Zamanlama önizlemesi tamamlandı — ${title}` });
        return result;
      }
      case "event": {
        const title = formatValue(this.evaluate(statement.title, environment, statement.line));
        this.plans.push({ kind: "olay", title, line: statement.line });
        this.entries.push({ tone: "automation", line: statement.line, text: `Olay dinleyicisi hazır — ${title}` });
        return { kind: "normal" };
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

function createGlobals(runtime: Runtime, datasets: Record<string, DatasetSource> = {}): Environment {
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
    ekle: ((value, item) => [...onlyList(value), item]) as NativeFunction,
    ilk: ((value) => onlyList(value)[0] ?? null) as NativeFunction,
    son: ((value) => onlyList(value).at(-1) ?? null) as NativeFunction,
    icerir_mi: ((value, item) => onlyList(value).some((candidate) => areEqual(candidate, item))) as NativeFunction,
  });
  globals.define("metin", {
    buyuk: ((value) => onlyText(value).toLocaleUpperCase("tr")) as NativeFunction,
    kucuk: ((value) => onlyText(value).toLocaleLowerCase("tr")) as NativeFunction,
    uzunluk: ((value) => onlyText(value).length) as NativeFunction,
    birlestir: ((value, ayirac = "") => onlyList(value).map(formatValue).join(onlyText(ayirac))) as NativeFunction,
    icerir_mi: ((value, parca) => onlyText(value).includes(onlyText(parca))) as NativeFunction,
    degistir: ((value, aranan, yeni) => onlyText(value).replaceAll(onlyText(aranan), onlyText(yeni))) as NativeFunction,
    bol: ((value, ayirac) => onlyText(value).split(onlyText(ayirac))) as NativeFunction,
  });
  globals.define("sayi", {
    yuvarla: ((value) => Math.round(asNumber(value, 0))) as NativeFunction,
    mutlak: ((value) => Math.abs(asNumber(value, 0))) as NativeFunction,
    sinirla: ((value, alt, ust) => Math.min(Math.max(asNumber(value, 0), asNumber(alt, 0)), asNumber(ust, 0))) as NativeFunction,
  });
  globals.define("json", {
    coz: ((value) => {
      try {
        return JSON.parse(onlyText(value)) as RuntimeValue;
      } catch {
        throw new NoktaError(0, "JSON metni çözülemedi. Tırnakları, virgülleri ve köşeli parantezleri kontrol edin.");
      }
    }) as NativeFunction,
    yaz: ((value) => JSON.stringify(value, null, 2)) as NativeFunction,
  });
  globals.define("csv", {
    coz: ((value) => parseCsv(onlyText(value))) as NativeFunction,
    yaz: ((value) => stringifyCsv(ensureTable(value))) as NativeFunction,
  });
  globals.define("veri", {
    dosyalar: (() => Object.keys(datasets)) as NativeFunction,
    metin: ((value) => {
      const name = onlyText(value);
      const dataset = datasets[name];
      if (!dataset) throw new NoktaError(0, `“${name}” adlı yüklenmiş veri kümesi bulunamadı.`, "NOKTA_201", "Sol kenar çubuğundan bir CSV veya JSON dosyası yükleyin; ardından dosya adını veri.al içinde kullanın.");
      return dataset.content;
    }) as NativeFunction,
    al: ((value) => {
      const name = onlyText(value);
      const dataset = datasets[name];
      if (!dataset) throw new NoktaError(0, `“${name}” adlı yüklenmiş veri kümesi bulunamadı.`, "NOKTA_201", "Sol kenar çubuğundan bir CSV veya JSON dosyası yükleyin; ardından dosya adını veri.al içinde kullanın.");
      try {
        const parsed = dataset.format === "csv" ? parseCsv(dataset.content) : JSON.parse(dataset.content) as RuntimeValue;
        runtime.entries.push({ tone: "info", text: `Veri kümesi bağlandı — ${name} (${dataset.format.toUpperCase()})` });
        return parsed;
      } catch (error) {
        if (error instanceof NoktaError) throw error;
        throw new NoktaError(0, `“${name}” dosyasındaki JSON çözülemedi.`, "NOKTA_202", "JSON dosyasında tırnak, virgül ve köşeli parantez eşleşmelerini kontrol edin.");
      }
    }) as NativeFunction,
  });
  globals.define("tablo", {
    say: ((value) => ensureTable(value).length) as NativeFunction,
    sutun: ((value, field) => ensureTable(value).map((row) => getRecordField(row, onlyText(field)))) as NativeFunction,
    filtrele: ((value, field, operator, expected) => ensureTable(value).filter((row) => compareValue(getRecordField(row, onlyText(field)), onlyText(operator), expected))) as NativeFunction,
    sec: ((value, fields) => {
      const names = onlyList(fields).map(onlyText);
      return ensureTable(value).map((row) => Object.fromEntries(names.map((name) => [name, getRecordField(row, name)])));
    }) as NativeFunction,
    sirala: ((value, field, direction = "artan") => {
      const name = onlyText(field);
      const descending = onlyText(direction) === "azalan";
      return [...ensureTable(value)].sort((left, right) => compareSort(getRecordField(left, name), getRecordField(right, name)) * (descending ? -1 : 1));
    }) as NativeFunction,
    grupla: ((value, field) => {
      const name = onlyText(field);
      return ensureTable(value).reduce<RuntimeRecord>((groups, row) => {
        const key = formatValue(getRecordField(row, name));
        const current = groups[key];
        groups[key] = Array.isArray(current) ? [...current, row] : [row];
        return groups;
      }, {});
    }) as NativeFunction,
    topla: ((value, field) => ensureTable(value).reduce((sum, row) => sum + asNumber(getRecordField(row, onlyText(field)), 0), 0)) as NativeFunction,
    ortalama: ((value, field) => {
      const table = ensureTable(value);
      return table.length === 0 ? 0 : table.reduce((sum, row) => sum + asNumber(getRecordField(row, onlyText(field)), 0), 0) / table.length;
    }) as NativeFunction,
    onizle: ((value, title = "Tablo") => {
      const table = ensureTable(value);
      runtime.addPreview(onlyText(title), table);
      return table;
    }) as NativeFunction,
  });
  globals.define("kayit", {
    anahtarlar: ((value) => {
      if (!isRecord(value)) throw new NoktaError(0, "Bu işlem bir kayıt bekliyor.");
      return Object.keys(value);
    }) as NativeFunction,
    degerler: ((value) => {
      if (!isRecord(value)) throw new NoktaError(0, "Bu işlem bir kayıt bekliyor.");
      return Object.values(value);
    }) as NativeFunction,
  });
  globals.define("uygulama", {
    ac: ((target) => {
      const name = onlyText(target);
      runtime.requirePermission("uygulama", name);
      runtime.entries.push({ tone: "automation", text: `Uygulama açma planlandı — ${name}` });
      return true;
    }) as NativeFunction,
    kapat: ((target) => {
      const name = onlyText(target);
      runtime.requirePermission("uygulama", name);
      runtime.entries.push({ tone: "automation", text: `Uygulama kapatma planlandı — ${name}` });
      return true;
    }) as NativeFunction,
  });
  globals.define("bildirim", {
    izle: ((target) => {
      const name = onlyText(target);
      runtime.requirePermission("bildirim", name);
      runtime.entries.push({ tone: "automation", text: `Bildirim izleme planlandı — ${name}` });
      return true;
    }) as NativeFunction,
  });
  globals.define("uyari", {
    gonder: ((message) => {
      runtime.requireAnyPermission("bildirim");
      runtime.entries.push({ tone: "automation", text: `Uyarı planlandı — ${onlyText(message)}` });
      return true;
    }) as NativeFunction,
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

function ensureTable(value: RuntimeValue): RuntimeRecord[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new NoktaError(0, "Tablo işlemi, kayıtlardan oluşan bir liste bekliyor.");
  }
  return value as RuntimeRecord[];
}

function getRecordField(record: RuntimeRecord, field: string): RuntimeValue {
  if (!(field in record)) throw new NoktaError(0, `Tabloda “${field}” adlı bir sütun bulunamadı.`);
  return record[field];
}

function compareValue(actual: RuntimeValue, operator: string, expected: RuntimeValue): boolean {
  switch (operator) {
    case "==": return areEqual(actual, expected);
    case "!=": return !areEqual(actual, expected);
    case ">": return asNumber(actual, 0) > asNumber(expected, 0);
    case ">=": return asNumber(actual, 0) >= asNumber(expected, 0);
    case "<": return asNumber(actual, 0) < asNumber(expected, 0);
    case "<=": return asNumber(actual, 0) <= asNumber(expected, 0);
    case "icerir": return formatValue(actual).includes(formatValue(expected));
    default: throw new NoktaError(0, `“${operator}” tablo filtresi desteklenmiyor.`);
  }
}

function compareSort(left: RuntimeValue, right: RuntimeValue) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return formatValue(left).localeCompare(formatValue(right), "tr");
}

function parseCsv(source: string): RuntimeRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  if (quoted) throw new NoktaError(0, "CSV metninde kapanmayan bir tırnak bulundu.");
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  const [headers, ...data] = rows.filter((candidate) => candidate.some((item) => item.trim() !== ""));
  if (!headers || headers.length === 0) return [];
  const normalized = headers.map((header) => header.trim());
  if (new Set(normalized).size !== normalized.length || normalized.some((header) => header === "")) {
    throw new NoktaError(0, "CSV başlıkları boş veya tekrar eden sütun adı içeriyor.");
  }
  return data.map((cells, rowIndex) => {
    if (cells.length !== normalized.length) throw new NoktaError(0, `CSV satır ${rowIndex + 2}, ${normalized.length} hücre bekliyor; ${cells.length} hücre bulundu.`);
    return Object.fromEntries(normalized.map((header, index) => [header, parseCell(cells[index])])) as RuntimeRecord;
  });
}

function parseCell(value: string): RuntimeValue {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "dogru") return true;
  if (trimmed === "yanlis") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function stringifyCsv(table: RuntimeRecord[]): string {
  if (table.length === 0) return "";
  const headers = Array.from(new Set(table.flatMap((row) => Object.keys(row))));
  const escape = (value: RuntimeValue) => {
    const text = formatValue(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...table.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
}

export function formatValue(value: RuntimeValue): string {
  if (value === null) return "boş";
  if (value === true) return "doğru";
  if (value === false) return "yanlış";
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (isRecord(value)) return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item)}`).join(", ")} }`;
  if (typeof value === "function" || value instanceof NoktaFunction) return "<işlev>";
  return String(value);
}

export function runNokta(source: string, options: RunOptions = {}): RunResult {
  const started = performance.now();
  const runtime = new Runtime();
  try {
    const program = new ProgramParser(normalizeSource(source)).parse();
    const signal = runtime.executeBlock(program, createGlobals(runtime, options.datasets));
    if (signal.kind === "stop") runtime.entries.push({ tone: "info", text: signal.value ? `Akış durdu — ${formatValue(signal.value)}` : "Akış durdu." });
    return { entries: runtime.entries, plans: runtime.plans, previews: runtime.previews, diagnostics: [], ok: true, duration: performance.now() - started };
  } catch (error) {
    const details = error instanceof NoktaError ? error : new NoktaError(0, "Bilinmeyen bir çalışma hatası oluştu.");
    const diagnostic = { code: details.code, line: details.line || undefined, message: details.message, suggestion: details.suggestion };
    runtime.entries.push({ tone: "error", line: details.line || undefined, text: `[${details.code}] ${details.message}` });
    return { entries: runtime.entries, plans: runtime.plans, previews: runtime.previews, diagnostics: [diagnostic], ok: false, duration: performance.now() - started };
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
    id: "csv-rapor",
    title: "CSV satış raporu",
    subtitle: "CSV çöz, filtrele ve tablo önizle",
    tags: ["csv", "tablo"],
    code: `ham_csv = "sehir,tutar,durum\\nAnkara,1200,tamam\\nİzmir,850,bekliyor\\nİstanbul,2400,tamam\\nAnkara,675,tamam"
satislar = csv.coz(ham_csv)
tamamlanan = tablo.filtrele(satislar, "durum", "==", "tamam")
sirali = tablo.sirala(tamamlanan, "tutar", "azalan")

tablo.onizle(sirali, "Tamamlanan siparişler")
yaz "Sipariş sayısı: " + tablo.say(sirali)
yaz "Toplam ciro: " + tablo.topla(sirali, "tutar")
yaz "CSV çıktısı:\\n" + csv.yaz(tablo.sec(sirali, ["sehir", "tutar"]))`,
  },
  {
    id: "json-analiz",
    title: "JSON öğrenci analizi",
    subtitle: "JSON çöz, seç ve gruplandır",
    tags: ["json", "grupla"],
    code: `ham_json = '[{"ad":"Ada","sinif":"10A","puan":91},{"ad":"Efe","sinif":"10B","puan":76},{"ad":"Lale","sinif":"10A","puan":88}]'
ogrenciler = json.coz(ham_json)
basarililar = tablo.filtrele(ogrenciler, "puan", ">=", 80)
siniflar = tablo.grupla(basarililar, "sinif")

tablo.onizle(basarililar, "Başarılı öğrenciler")
yaz "Başarılı öğrenci: " + tablo.say(basarililar)
yaz "Sınıflar: " + kayit.anahtarlar(siniflar)
yaz "JSON özeti:\\n" + json.yaz(siniflar)`,
  },
  {
    id: "otomasyon",
    title: "Sabah otomasyonu",
    subtitle: "İzin, zamanlama ve olay planı",
    tags: ["zamanla", "izin"],
    code: `izin uygulama "Tarayıcı"
izin bildirim "Takvim"
izin bildirim "Masaüstü"

zamanla "Her iş günü 09:00":
  akis "Gün başlangıcı":
    adim "Takvimi izle":
      bildirim.izle("Takvim")

    adim "Çalışma alanını hazırla":
      uygulama.ac("Tarayıcı")
      uyari.gonder("Gün başlangıcı akışı hazır.")

olay "bildirim:takvim":
  yaz "Takvim bildirimi alındı; akış bekliyor."`,
  },
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

export const DEFAULT_CODE = NOKTA_EXAMPLES[0].code;
