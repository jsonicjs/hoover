
const { Hoover, parseToEnd } = require('..')



let makeLex = (src) => ({
  src,
  pnt: {
    sI: 0,
    rI: 0,
    cI: 0,
  },
})


let s0 = {
  endchars: ['\n','\r','"','#',undefined],
  endseqs: [[
    { tail$:'[', consume$:false },
    { tail$:/^[^\:]+\:/, consume$:false },
    ''
  ],'\n','""','',undefined],
}


let lex


lex = makeLex('a\n')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a\r\n')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a"""')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a"\n')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a b\r\n')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a #b\r\n')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a \n[')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a \nb:')
console.log(parseToEnd(lex,s0), lex)

lex = makeLex('a')
console.log(parseToEnd(lex,s0), lex)
