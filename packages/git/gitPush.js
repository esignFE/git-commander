const colors = require('colors')
const shell = require('shelljs')
// gerrit HEAD:refs/for/develop
function gitPush() {
  let command = 'git push'
  // if (str === 'gerrit') command = 'git push gerrit HEAD:refs/for/develop'
  console.log('执行git push...'.green)
  return shell.exec(command)
}

module.exports = gitPush
