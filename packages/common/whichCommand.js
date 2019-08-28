const colors = require('colors')
const shell = require('shelljs')
const installPackage = require('./installPackage.js')

function whichCommand(command, options) {
  let result = shell.which(command)
  if (result === null) {
    if (command === 'conventional-recommended-bump') {
      installPackage([{ package: command, options }])
    } else installPackage([{ package: 'conventional-changelog-cli', options }])
    return false
  }
  return true
}

module.exports = whichCommand
