"use strict"

function Const(c) {
    this.c = c;
}
Const.prototype = {
    evaluate: function () {return this.c;},
    toString: function () {return this.c + "";},
    prefix: function () {return this.c + "";}
}

function Variable(v) {
    this.v = v;
}
Variable.prototype = {
    evaluate: function (x, y, z) {
        switch (this.v) {
            case "x":
                return x;
            case "y":
                return y;
            case "z":
                return z;
        }
    },
    toString: function () {return this.v;},
    prefix: function () {return this.v;}
}

function AbstractExpression(f, op, ...exprs) {
    this.f = f;
    this.op = op;
    this.exprs = exprs;
}
AbstractExpression.prototype = {
    evaluate: function(...args) {return this.f(...this.exprs.map((expr) => expr.evaluate(...args)))},
    toString: function() {return this.exprs.map((expr) => expr.toString()).join(" ")  + " " + this.op},
    prefix: function () {return "(" + this.op + " " + this.exprs.map((expr) => expr.prefix()).join(" ") + ")";}
};

function Add(expr1, expr2) {
    AbstractExpression.call(this, (a, b) => a + b, "+", expr1, expr2);
}
Add.prototype = AbstractExpression.prototype;

function Subtract(expr1, expr2) {
    AbstractExpression.call(this, (a, b) => a - b, "-", expr1, expr2);
}
Subtract.prototype = AbstractExpression.prototype;

function Multiply(expr1, expr2) {
    AbstractExpression.call(this, (a, b) => a * b, "*", expr1, expr2);
}
Multiply.prototype = AbstractExpression.prototype;

function Divide(expr1, expr2) {
    AbstractExpression.call(this, (a, b) => a / b, "/", expr1, expr2);
}
Divide.prototype = AbstractExpression.prototype;

function Negate(expr1) {
    AbstractExpression.call(this, (a) => -a, "negate", expr1);
}
Negate.prototype = AbstractExpression.prototype;

function Avg5(a, b, c, d, e) {
    AbstractExpression.call(this, (a, b, c, d, e) => (a + b + c + d + e) / 5, "avg5", a, b, c, d, e)
}
Avg5.prototype = AbstractExpression.prototype;

function Med3(a, b, c) {
    const max = (a, b) => a > b? a: b;
    const min = (a, b) => a < b? a: b;
    AbstractExpression.call(this, (a, b, c) => max(min(a, c), max(min(a, b), min(b, c))), "med3", a, b, c);
}
Med3.prototype = AbstractExpression.prototype;

function ArithMean(...exprs) {
    AbstractExpression.call(this,
        (...exprs) => {
        let result = 0;
        for (let i = 0; i < exprs.length; i++) {
            result += exprs[i];
        }
        return result / exprs.length;
        },
        "arith-mean",
        ...exprs
    );
}
ArithMean.prototype = AbstractExpression.prototype;

function GeomMean(...exprs) {
    AbstractExpression.call(this,
        (...exprs) => {
            let result = 1;
            for (let i = 0; i < exprs.length; i++) {
                result *= exprs[i];
            }
            return Math.abs(result) ** (1 / exprs.length);
        },
        "geom-mean",
        ...exprs
    );
}
GeomMean.prototype = AbstractExpression.prototype;

function HarmMean(...exprs) {
    AbstractExpression.call(this,
        (...exprs) => {
            let result = 0;
            for (let i = 0; i < exprs.length; i++) {
                result += 1 / exprs[i];
            }
            return exprs.length / result;
        },
        "harm-mean",
        ...exprs
    );
}
HarmMean.prototype = AbstractExpression.prototype;

function ExpressionError(message) {
    Error.call(this, message);
    this.message = message;
}
ExpressionError.prototype = Object.create(Error.prototype);
ExpressionError.prototype.name = "Expression error";
ExpressionError.prototype.constructor = ExpressionError;

/**
 * Parser
 */

function parsePrefix(str) {
    return new ExprParser(new Source(str)).prefixParse();
}

const operations = new Map([
    ["+", (...exprs) => new Add(...exprs)], ["-", (...exprs) => new Subtract(...exprs)],
    ["*", (...exprs) => new Multiply(...exprs)], ["/", (...exprs) => new Divide(...exprs)],
    ["negate", (...exprs) => new Negate(...exprs)],
    ["("], [")"],
    ["arith-mean", (...exprs) => new ArithMean(...exprs)],
    ["geom-mean", (...exprs) => new GeomMean(...exprs)],
    ["harm-mean", (...exprs) => new HarmMean(...exprs)]
]);

const arity = new Map([
    ["negate", 1],
    ["+", 2], ["-", 2], ["*", 2], ["/", 2],
    ["arith-mean", Infinity], ["geom-mean", Infinity], ["harm-mean", Infinity]
])

const variable = new Map([
    ["x", () => new Variable("x")],
    ["y", () => new Variable("y")],
    ["z", () => new Variable("z")],
]);

class ExprParser {
    constructor(source) {
        this.source = source;
    }

    prefixParse() {
        let source = this.source;
        let result = parse();
        if (source.hasNext()) {
            throw new ParserError("Illegal token after end of expression on pos " + source.getPos() +
                "\n\t\t\t\texpected: " + "nothing" +
                "\n\t\t\t\tfind: \"" + source.next() + "\"");
        }
        return result;

        function parse() {
            let token = nextToken("expression");
            if (token !== "(") {
                return getConstOrVar(token);
            }
            let op = nextToken("operation");
            let exprs = [];
            getArgs(op, exprs)
            return operations.get(op)(...exprs);
        }

        function nextToken(expected, arity) {
            function chek() {
                if (result.length === 0 && !source.hasNext() ||
                    expected === "operation" && !operations.has(result) ||
                    (expected === ")") !== (result === ")")
                    && arity !== Infinity)  {
                    throw new ParserError("Illegal token on pos " + source.getPos() +
                        "\n\t\t\t\texpected: " + expected +
                        "\n\t\t\t\tfind: \"" + result + "\"");
                }
            }
            let result = "";
            source.skipSpace();
            while (!source.isNextSpace() && source.hasNext()) {
                let char = source.next();
                if (char === "-" && !source.isNextSpace()) {
                    result += char;
                    char = source.next();
                }
                if (operations.has(char)) {
                    if (result.length === 0) {
                        result = char;
                        chek();
                    return result;
                    }
                    source.shift(-1);
                    chek();
                    return result;
                }
                result += char;
            }
            chek();
            return result;
        }

        function getExpr(token) {
            let expr;
            if (token === "(") {
                source.shift(-1)
                expr = parse();
            } else {
                expr = getConstOrVar(token);    
            }
            return expr;
        }

        function getConstOrVar(str) {
            if (isNaN(str)) {
                if (variable.has(str)) {
                    return variable.get(str)()
                } else {
                    throw new ExpressionError("Illegal variable on pos " + source.getPos() +
                        "\n\t\t\t\texpected: " + "x or y or z" +
                        "\n\t\t\t\tfind: \"" + str + "\"");
                }
            } else {
                return  new Const(parseInt(str));
            }
        }

        function getArgs(op, exprs) {
            for(let i = 0; i < arity.get(op); i++) {
                let token = nextToken("arg" + (i + 1), arity.get(op));
                if (token === ")") {
                    return;
                }
                exprs[i] = getExpr(token);
            }
            nextToken(")");
        }
    }
}

function ParserError(message) {
    Error.call(this, message);
    this.message = message;
}
ParserError.prototype = Object.create(Error.prototype);
ParserError.prototype.name = "Parser error";
ParserError.prototype.constructor = ParserError;

function Source(str) {
    this.str = str;
    this.index = 0;
}
Source.prototype = {
    test: function (char) {return this.str[this.index] === char;},
    shift: function(s) { this.index += s;},
    isNextSpace: function () {return this.test(' ') || this.test('\n') || this.test('\t');},
    skipSpace: function () {
        while (this.isNextSpace()) {
            this.index++;
        }
    },
    hasNext: function () {
        this.skipSpace();
        return this.index < this.str.length;
    },
    next: function () {
        return this.str[this.index++];
    },
    getPos: function () {return this.index;}
}

// let expr = parsePrefix("(+ x 2)")
// println(expr.prefix());
