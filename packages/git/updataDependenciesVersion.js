const exec = require('child_process').exec
const fs = require('fs')
const DATE = require('silly-datetime')
const {
  getPackageJson,
  findPackages,
} = require('command-common/findPackages.js')
const { getConf } = require('command-bin/init.js')
const { gitCommitUrl, autoUpdataDependencies } = getConf().get()

function gitTask(command, path) {
  return new Promise(async (resolve, reject) => {
    if (path) {
      exec(
        command,
        {
          silent: true,
          cwd: path,
        },
        (err, data) => resolve(data)
      )
    } else {
      exec(
        command,
        {
          silent: true,
        },
        (err, data) => resolve(data)
      )
    }
  })
}

function getCommitIdByGitTask() {
  return gitTask('git cherry -v').then(async (data) => {
    data = data.split('\n')
    if (data.length === 0) throw '打tag时,cherry -v获取不到commit记录'
    let commitId = /^\+ ([a-z0-9]{40})/.exec(data[data.length - 2])[1]
    let shortCommitId = await gitTask(
      `git rev-parse --short ${commitId}`
    ).then((data) => data.slice(0, data.length - 1))

    return shortCommitId
  })
}

function setVersionByGitTask(path) {
  return gitTask('npm version patch', path).then((data) =>
    data.replace('v', '').replace('\n', '')
  )
}

async function handle(versionChangeInfo) {
  return new Promise(async (resolve, reject) => {
    const gitPushTaskMap = {}
    for (const {
      package,
      curVersion,
      packageName,
      path: packagePath,
    } of versionChangeInfo) {
      gitPushTaskMap[packagePath] = gitPushTaskMap[packagePath] || {}
      gitPushTaskMap[packagePath] = {
        fileList: ['package.json', 'package-lock.json'],
        gitAddList: [
          `${packagePath}/package.json`,
          `${packagePath}/package-lock.json`,
        ],
        depPackageNames: gitPushTaskMap[packagePath].depPackageNames || '',
        commitMessagePrefix: `${package}_v${curVersion}`,
        commitMessageSuffix: '依赖升级',
      }
      if (!autoUpdataDependencies) continue
      const allPackages = findPackages()
      for (const {
        name,
        curVersion: curPackageVersion,
        path,
        folderName,
        dependencies,
        peerDependencies,
      } of allPackages) {
        if (package === folderName) continue
        if (!dependencies && !peerDependencies) continue
        if (
          dependencies[packageName] &&
          !new RegExp(`^([^0-9]?)${curVersion}$`).test(
            dependencies[packageName]
          )
        ) {
          const packageJson = getPackageJson(path)
          packageJson['dependencies'][packageName] = curVersion
          fs.writeFileSync(
            `${path}/package.json`,
            JSON.stringify(packageJson, null, 2)
          )
          gitPushTaskMap[path] = gitPushTaskMap[path] || {}
          gitPushTaskMap[path] = {
            fileList: gitPushTaskMap[path].fileList || ['package.json'],
            gitAddList: gitPushTaskMap[path].gitAddList || [
              `${path}/package.json`,
            ],
            depPackageNames: gitPushTaskMap[path].depPackageNames
              ? `${gitPushTaskMap[path].depPackageNames}, ${packageName} `
              : packageName,
            commitMessagePrefix: `${folderName}_v${curPackageVersion}`,
            commitMessageSuffix: '依赖升级',
          }

          if (!versionChangeInfo.find((item) => item.package === folderName)) {
            const version = await setVersionByGitTask(path)
            gitPushTaskMap[path].fileList = [
              'package.json',
              'package-lock.json',
            ]
            gitPushTaskMap[path].gitAddList = [
              `${path}/package.json`,
              `${path}/package-lock.json`,
            ]
            versionChangeInfo.push({
              path,
              package: folderName,
              curVersion: version,
              packageName: allPackages.find(
                (item) => item.folderName === folderName
              ).name,
            })
          }
        }
      }
    }
    const keys = Object.keys(gitPushTaskMap)
    for (const key of keys) {
      const {
        gitAddList,
        depPackageNames,
        commitMessagePrefix,
        commitMessageSuffix,
      } = gitPushTaskMap[key]
      for (const packageJsonPath of gitAddList)
        await gitTask(`git add ${packageJsonPath}`)
      await gitTask(
        `git commit -m "${commitMessagePrefix}${
          depPackageNames ? '  ' + depPackageNames : ''
        }${depPackageNames ? commitMessageSuffix : ''}"`
      )
      versionChangeInfo.forEach((item, index) => {
        if (item.path === key) item = Object.assign(item, gitPushTaskMap[key])
      })
      const shortCommitId = await getCommitIdByGitTask()
      versionChangeInfo.forEach((item, index) => {
        if (item.path === key) item.shortCommitId = shortCommitId
      })
    }

    resolve(versionChangeInfo)
  })
}
async function updataDependenciesVersion(result) {
  let { versionChangeInfo, versionObj } = result
  const handleResult = await handle(
    JSON.parse(JSON.stringify(versionChangeInfo))
  )
  for (const {
    package,
    path,
    fileList,
    depPackageNames,
    commitMessageSuffix,
    shortCommitId,
    curVersion,
    packageName,
  } of handleResult) {
    if (!versionObj[package]) {
      versionObj[package] = {
        time: DATE.format(new Date(), 'YYYY-MM-DD'),
        packagePath: path.slice(2),
        gitUrl: gitCommitUrl,
        version: curVersion,
        name: packageName,
      }
    }
    if (!fileList) continue
    if (!versionObj[package].commitInfo) {
      versionObj[package].commitInfo = fileList.map((fileName) => {
        return {
          fileName,
          shortCommitId,
          commitMessage: `${depPackageNames}${commitMessageSuffix}`,
          commitType: 'build',
          BreakingChangeMessage: '',
        }
      })
    } else {
      fileList.forEach((fileName) => {
        const targetCommitInfoItem = versionObj[package].commitInfo.find(
          ({ fileName: itemFileName }) => itemFileName === fileName
        )
        if (targetCommitInfoItem) {
          targetCommitInfoItem.commitMessage = `${
            targetCommitInfoItem.commitMessage
          }${
            targetCommitInfoItem.commitMessage ? ' ,' : ''
          }${depPackageNames}${commitMessageSuffix}`
        }
      })
    }
  }
  return {
    versionChangeInfo: handleResult,
    versionObj,
  }
}

module.exports = updataDependenciesVersion
