const fs = require('fs')

function getPackageJson(path) {
  var _packageJson = fs.readFileSync(`${path}/package.json`)
  return JSON.parse(_packageJson)
}

function findPackages(curPackage) {
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
            folderName: item,
            dependencies: packageJson.dependencies,
            peerDependencies: packageJson.peerDependencies,
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

module.exports = {
  getPackageJson,
  findPackages
}