const colors = require('colors')
const path = require('path')
const bootstrap = require('commitizen-promise/dist/cli/git-cz').bootstrap

function gitCommit(name) {
  console.log(`执行gitCommit...`.green)
  return bootstrap({
    cliPath: path.join(__dirname, '../../node_modules/commitizen-promise'),
    config: {
      path: 'cz-conventional-changelog'
    }
  })
}

module.exports = gitCommit
