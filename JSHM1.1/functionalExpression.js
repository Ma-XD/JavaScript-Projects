"use strict"

const abstractExpression = f => (...expr) => (...args) => f(...expr.map((wrapping) => wrapping(...args)));

const cnst = (c) => () => c;
const variable = (v) => (...args) => {
    switch (v) {
        case "x":
            return args[0];
        case "y":
            return args[1];
        case "z":
            return args[2];
    }
}

const add = abstractExpression((expr1, expr2) => expr1 + expr2);
const subtract = abstractExpression((expr1, expr2) => expr1 - expr2);
const multiply = abstractExpression((expr1, expr2) => expr1 * expr2);
const divide = abstractExpression((expr1, expr2) => expr1 / expr2);
const negate = abstractExpression(expr1 => -expr1);
const one = cnst(1);
const two = cnst(2);

// let expr = subtract(
//     multiply(
//         cnst(2),
//         variable("x")
//     ),
//     cnst(3)
// );
// println(expr(5));