const colors = require('colors')
const shell = require('shelljs')
const installPackage = require('./installPackage.js')
whichCommand('where')
function whichCommand(command, options) {
  let result = shell.which(command)
  if (result === null) {
    if (command === 'conventional-changelog') installPackage([{ package: 'conventional-changelog-cli', options }])
    else installPackage([{ package: command, options }])
    
    return false
  }
  
  return true
}

module.exports = whichCommand
