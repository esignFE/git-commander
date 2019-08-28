const fs = require('fs')

function getPackageJson(path) {
  var _packageJson = fs.readFileSync(`${path}/package.json`)
  return JSON.parse(_packageJson)
}

module.exports = function findPackages(curPackage) {
  let packages = []

  if (!curPackage) {
    const files = fs.readdirSync('./packages')
    files.forEach(function(item, index) {
      let path = `./packages/${item}`
      let stat = fs.lstatSync(path)
      if (stat.isDirectory() === true) {
        let packageJson = getPackageJson(path)
        if (packageJson)
          packages.push({
            name: packageJson.name,
            curVersion: packageJson.version,
            path,
            folderName: item
          })
      }
    })
  } else {
    let packageJson = getPackageJson(`./packages/${curPackage}`)
    packages = {
      name: packageJson.name,
      curVersion: packageJson.version,
      path: `./packages/${curPackage}`,
      folderName: curPackage
    }
  }
  return packages
}
