const colors = require('colors')
const shell = require('shelljs')

function gitAdd(str, noConsole) {
  if (!noConsole) console.log(`git add ${str}`.green)
  return shell.exec(`git add ${str}`, { silent: true })
}
module.exports = gitAdd
