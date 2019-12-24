const fs = require('fs')
const inquirer = require('inquirer')
const exec = require('shelljs').exec
const gitAdd = require('./gitAdd.js')
const findPackages = require('command-common/findPackages.js')
const DATE = require('silly-datetime')
const write_ChangeLog = require('./write_ChangeLog.js')
const progressBar = require('command-common/progressBar.js')

function updateProgressBar(pb, num, total) {
  if (num <= total) {
    pb.render({
      completed: num,
      total: total
    })
  }
}

async function findNoPushCommit() {
  let commitAry = await new Promise((resolve, reject) => {
    exec('git cherry -v', {
      silent: true
    }, (err, data) => {
      if (err) throw err
      resolve(data)
    })
  })

  commitAry = commitAry.split('\n')
  let result = []
  commitAry.forEach(item => {
    let commitObj = {}
    if (!/^\+ ([a-z0-9]{40})/.test(item)) return
    commitObj.commitId = /^\+ ([a-z0-9]{40})/.exec(item)[1]
    result.push(commitObj)
  })
  return result
}

async function parseCommit(commitAry) {
  let versionObj = {}
  let promiseAry = []
  let num = 0
  let total = commitAry.length
  let pb = new progressBar('正在解析当前未push到远程分支的commit记录', 50)
  updateProgressBar(pb, num, total)
  for (let item of commitAry) {
    promiseAry.push(parseSubTask(item))
  }
  return await Promise.all(promiseAry).then(() => {
    console.log('解析完毕...'.green)
    return versionObj
  })

  function parseSubTask(item) {
    return new Promise(async (resolve, reject) => {
      exec(`git show ${item.commitId}`, {
        silent: true
      }, async (err, data) => {
        if (err) throw err
        let matchAry = data.match(
          /(\+\+\+|\-\-\-) (a|b)(\/packages\/(.*){1})\/.*/g
        )
        if (matchAry === null) {
          return resolve(updateProgressBar(pb, ++num, total))
        }
        matchAry = Array.from(new Set(matchAry.map(item => item.slice(5))))
        let isBreakingChange = /BREAKING CHANGE(.|\n)*diff \-\-git/.test(data)
        let isFeat = /(.|\n)*feat\(.*\):(.|\n)*diff \-\-git/.test(data)
        if (matchAry && matchAry.length > 0) {
          for (let matcher of matchAry) {
            let package = matcher.split('/')[2]
            let packagePath = `packages/${package}`
            let fileName = matcher.split('/')[matcher.split('/').length - 1]
            let time = DATE.format(new Date(), 'YYYY-MM-DD')
            versionObj[package] = versionObj[package] || {}
            versionObj[package].time = time
            versionObj[package].packagePath = packagePath
            versionObj[package].gitUrl =
              'http://git.timevale.cn:8081/front-common/esign-ui'
            // versionObj[package].gitUrl = await new Promise(
            //   (resolve, reject) => {
            //     exec(`git remote show origin`, { silent: true }, function(
            //       err,
            //       data
            //     ) {
            //       data = data.split('\n')
            //       if (data[1] && data[1].indexOf('Fetch') > -1) {
            //         let index = data[1].indexOf('https://')
            //         resolve(data[1].slice(index, data[1].length - 4))
            //       } else resolve('')
            //     })
            //   }
            // )

            let commitMessage = data.split('\n')[4].trim()
            let shortCommitId = await new Promise((resolve, reject) => {
              exec(
                `git rev-parse --short ${item.commitId}`, {
                  silent: true
                },
                function (err, data) {
                  resolve(data.slice(0, data.length - 1))
                }
              )
            })
            let commitType = commitMessage.split(':')[0]
            commitType =
              commitType.indexOf('(') > -1 ?
              commitType.slice(0, commitType.indexOf('(')) :
              commitType
            let BreakingChangeMessage = isBreakingChange ?
              data
              .split('\n')[6]
              .split('BREAKING CHANGE:')[1]
              .trim() :
              ''
            versionObj[package].commitInfo = versionObj[package].commitInfo ?
              versionObj[package].commitInfo : []

            commitMessage = commitMessage.slice(commitMessage.indexOf(':') + 1)
            versionObj[package].commitInfo.push({
              fileName,
              shortCommitId,
              commitMessage,
              commitType,
              BreakingChangeMessage
            })
            versionObj[package].version = versionObj[package].version ?
              (isBreakingChange ? 'major' : (isFeat ? 'minor' : versionObj[package].version)) :
              (isBreakingChange ? 'major' : (isFeat ? 'minor' : 'patch'))
          }
        }
        resolve(updateProgressBar(pb, ++num, total))
      })
    })
  }
}

async function setVersion(versionObj) {
  let commitInfo = []
  let packages = Object.keys(versionObj)
  let packageJsons = findPackages()
  // packageJsons = await findLatestPackage(packageJsons)
  for (let package of packages) {
    let curPackageJson = packageJsons.find(item => item.folderName === package)
    versionObj[package].name = curPackageJson.name
    await inquirer
      .prompt([{
          type: 'confirm',
          name: 'confirmUpdata',
          message: `未 push 的 commit 记录中, ${curPackageJson.name} 有修改记录,当前的版本号为 ${curPackageJson.curVersion},是否更新版本号？`,
          default: true
        },
        {
          type: 'confirm',
          name: 'isUpdataVersion',
          message: `即将更新 ${curPackageJson.name} 的版本号,更新模式:${
            versionObj[package].version === 'major'
              ? '主版本号(major)'
              : versionObj[package].version === 'patch'
              ? '修订号(patch)'
              : '次版本号(minor)'
          },是否需要修改？`,
          default: false,
          when: function (val) {
            return val['confirmUpdata']
          }
        }
      ])
      .then(async answers => {
        if (!answers['confirmUpdata']) {
          versionObj[package].version = curPackageJson.curVersion
          return console.log(curPackageJson.name + '不进行版本更新'.green)
        }
        let versionNum
        if (answers['isUpdataVersion']) {
          while (!versionNum) {
            versionNum = await inputVersion()
          }
        }
        await new Promise((resolve, reject) => {
          exec(
            `npm version ${
              versionNum ? versionNum : versionObj[package].version
            }`, {
              silent: true,
              cwd: `./${versionObj[package].packagePath}`
            },
            async function (err, data) {
              curPackageJson = findPackages(package)
              console.log(
                `${package} 版本号已修改为 ${curPackageJson.curVersion}`.green
              )
              versionObj[package].version = curPackageJson.curVersion //修改了记录的版本号
              exec(
                `git add ./${versionObj[package].packagePath}/package.json`, {
                  silent: true
                }
              )
              exec(
                `git add ./${versionObj[package].packagePath}/package-lock.json`, {
                  silent: true
                }
              )
              exec(`git commit -m ${package}_${data}`, {
                silent: true
              })
              let commitId = await getCommitInfo()
              commitInfo.push({
                package,
                commitId,
                curVersion: curPackageJson.curVersion
              })
              resolve()
            }
          )
        })
      })
  }

  return {
    commitInfo,
    versionObj
  }
}

async function getCommitInfo() {
  return new Promise((resolve, reject) => {
    exec(`git cherry -v`, {
      silent: true
    }, function (err, data) {
      if (err) throw err
      data = data.split('\n')
      if (data.length === 0) throw '打tag时,cherry -v获取不到commit记录'
      let commitId = /^\+ ([a-z0-9]{40})/.exec(data[data.length - 2])[1]
      resolve(commitId)
    })
  })
}

async function inputVersion() {
  return await inquirer
    .prompt([{
      type: 'input',
      name: 'inputVersion',
      message: '请遵循 ```semVer语义``` 输入版本号:'
    }])
    .then(answers => {
      if (
        !/^(?!0\.0\.0)(\d|[1-9]\d+)\.(\d|[1-9]\d+)\.(\d|[1-9]\d+)/.test(
          answers['inputVersion']
        )
      ) {
        console.log('版本号未通过校验!  请重新输入!'.red)
        return false
      } else return answers['inputVersion']
    })
}

async function choiceChangeLog() {
  return await inquirer
    .prompt([{
        type: 'confirm',
        name: 'createChangeLog',
        message: '是否生成changelog',
        default: true
      },
      {
        type: 'confirm',
        name: 'createChangeLogOption',
        message: '是否只生成上次commit之后的变动,否则生成所有commit的Change log',
        default: true,
        when: function (val) {
          return val['createChangeLog']
        }
      }
    ])
    .then(answers => {
      if (answers['createChangeLog']) {
        return {
          createChangeLog: answers['createChangeLog'],
          createChangeLogOption: answers['createChangeLogOption']
        }
      } else return {}
    })
}

async function gitTag(commitInfo) {
  for (let commit of commitInfo) {
    exec(
      `git tag -a -m '' ${commit.package}_v${commit.curVersion} ${commit.commitId}`, {
        silent: true
      }
    )

    await new Promise((resolve, reject) => {
      exec(`git push origin ${commit.package}_v${commit.curVersion}`, function (
        err,
        data
      ) {
        resolve()
      })
    })
  }
}
module.exports = async function updateVersion() {
  let NoPushCommitAry = await findNoPushCommit()
  if (NoPushCommitAry.length === 0) return false

  let versionObj = await parseCommit(NoPushCommitAry)

  let result = await setVersion(versionObj)

  if (Object.keys(result.versionObj).length > 0) {
    let ChangeLogOptions = await choiceChangeLog()
    //
    if (ChangeLogOptions.createChangeLog) {
      let packages = Object.keys(result.versionObj)

      for (let package of packages) {
        console.log(`开始生成${package}_CHANGELOG...`.blue)
        await write_ChangeLog(
          ChangeLogOptions.createChangeLogOption,
          package,
          result.versionObj[package]
        )
        console.log(`${package}_CHANGELOG已更新`.green)
        await gitAdd(`./${versionObj[package].packagePath}/CHANGELOG.md`)
        await new Promise((resolve, reject) => {
          exec(
            `git commit -m  ${package}_CHANGELOG.md`, {
              silent: true
            },
            () => {
              resolve()
            }
          )
        })
      }

      await gitAdd(`./examples/docs/CHANGELOG.md`)
      await new Promise((resolve, reject) => {
        exec(
          `git commit -m  "docs(root): CHANGELOG.md"`, {
            silent: true
          },
          () => {
            resolve()
          }
        )
      })
      console.log('ChangeLog生成完毕...'.green)
    }
  }
  await gitTag(result.commitInfo)
  return result.versionObj
}