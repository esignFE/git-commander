const colors = require('colors')
const shell = require('shelljs')
const whichCommand = require('command-common/whichCommand.js')

function createChangeLog(Bol, path) {
  let status = whichCommand('conventional-changelog', '-g')
  if (!status) {
    console.log('执行初始化conventional-changelog----'.blue)
    console.log('初始化完毕----'.green)
  }
  console.log('生成ChangeLog.md...'.blue)
  if (Bol)
    shell.exec('conventional-changelog -p angular -i CHANGELOG.md -s', {
      cwd: path,
      silent: true
    })
  else
    shell.exec('conventional-changelog -p angular -i CHANGELOG.md -s -r 0', {
      cwd: path,
      silent: true
    })
  console.log('ChangeLog已生成----'.green)
}

module.exports = createChangeLog
