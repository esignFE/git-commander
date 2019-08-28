const colors = require('colors')
const shell = require('shelljs')

function installPackage(packages, options) {
  console.log('准备安装依赖----'.blue)
  for (let package of packages) {
    console.log(`开始安装 ${package.package} ----`.blue)
    shell.exec(`npm install ${package.package} ${package.options}`, {
      silent: true
    })
  }
  console.log('依赖安装完毕,继续执行----'.green)
}

module.exports = installPackage
