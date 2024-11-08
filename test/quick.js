const { Jsonic } = require('jsonic')
const { Debug } = require('jsonic/debug')
const { Hoover } = require('..')

const j = Jsonic.make()
  .use(Debug, { trace: true })

  .use(Hoover, {
    block: {
      line: {
        start: {
          rule: {
            parent: {
              include: ['pair', 'elem'],
            },
          },
        },
        end: {
          fixed: ['\n', '\r\n', '#', ''],
          consume: ['\n', '\r\n'],
        },
      },
    },
  })

console.log(
  j(`
a: x#y
b: 1
`),
)

/*
const j = Jsonic.make()
      .use(Debug, { trace:true })

      .use(Hoover, {
        block: {
          triplequote: {
            start: {
              fixed: `'''`
            },
            end: {
              fixed: `'''`
          },
          }
        }
      })

console.log(j(`['''x''']`))
*/
