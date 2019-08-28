const colors = require('colors')
const inquirer = require('inquirer')
const shell = require('shelljs')

async function publish(publishPackages, packages) {
  for (let package of publishPackages) {
    let curPackage = packages.find(item => {
      return item.name === package.value
    })

    let code = shell.exec('npm publish ', {
      cwd: curPackage.path || curPackage.packagePath
    }).code
    if (code !== 0) throw '发布失败..'
    else console.log(`${curPackage.name} 发布成功.. `.green)
  }
  console.log(`所有package发布成功.. `.green)
}

module.exports = publish
