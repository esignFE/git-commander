const inquirer = require('inquirer')
const shell = require('shelljs')

const gitAdd = require('./gitAdd.js')
const gitCommit = require('./gitCommit.js')
const gitPush = require('./gitPush.js')
const gitDiff = require('./gitDiff.js')
const updateVersion = require('./updateVersion.js')

function addPackage(name) {
  let code = gitAdd(`${name}`).code
  if (!!code) {
    console.log()
    console.log('git add 时出错,请根据报错信息修正错误!'.red)
    return shell.exit(code)
  }
}

async function getDiffAry() {
  gitAdd('.', true)

  let diffAry = await gitDiff()

  let diffChoices = ['All']

  for (let key in diffAry) {
    diffAry[key].forEach(value => {
      diffChoices.push(`${key}: ${value}`)
    })
  }

  return diffChoices
}

async function choiceCommit(diffChoices, isNext) {
  if (diffChoices && diffChoices.length === 1 && diffChoices[0] === 'All') {
    console.log('commit 执行完毕...'.green)
    return []
  }
  return await inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'isNextCommit',
        message: '是否继续 commit ?',
        default: true,
        when: function() {
          return isNext
        }
      },
      {
        type: 'checkbox',
        name: 'choice commit package',
        message: '请选择需要commit的文件?',
        choices: diffChoices,
        when: function(val) {
          return val['isNextCommit'] || !isNext
        }
      }
    ])
    .then(async answers => {
      if (!answers['isNextCommit'] && isNext !== undefined) {
        console.log('commit 执行完毕...'.green)
        return diffChoices
      }

      let packages = answers['choice commit package']

      if (packages.length === 0) {
        console.log('错误:未选择commit文件!'.red)
      } else if (packages.indexOf('All') > -1) {
        await addPackage('.')
        await gitCommit()
        console.log('commit 执行完毕...'.green)
        return []
      } else {
        for (let package of packages) await addPackage(package.slice(3))
        await gitCommit()
      }

      packages.forEach(item => {
        diffChoices = diffChoices.filter(diffItem => diffItem !== item)
      })
      return await choiceCommit(diffChoices, true)
    })
}

module.exports = async function git() {
  console.log('开始执行 git pull...'.blue)
  shell.exec('git pull', { silent: true })
  console.log('git pull完毕'.blue)

  let diffChoices = await getDiffAry()
  await choiceCommit(diffChoices, true)

  let result = await updateVersion()
  if (!result) {
    console.log('本地没有未提交的 commit 记录,不执行git push任务'.blue)
    return false
  }
  let code = gitPush().code
  if (!!code) {
    console.log(code)
    console.log()
    console.log('git push 时出错,请根据报错信息修正错误!'.red)
    return shell.exit(code)
  }
  console.log('git 相关任务执行结束...'.green)

  return result
}
