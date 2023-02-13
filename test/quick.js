
const { Jsonic } = require('@jsonic/jsonic-next')
const { Debug } = require('@jsonic/jsonic-next/debug')
const { Hoover } = require('..')


const j = Jsonic.make()
      .use(Debug, { trace:true })

      .use(Hoover, {
        block: {
          line: {
            start: {
              rule: {
                parent: {
                  include: ['pair','elem']
                },
              }
            },
            end: {
              fixed: ['\n','\r\n','#','']
            },
          }
        }
      })

console.log(j(`
a: x
b: y y
c: 1
`))


