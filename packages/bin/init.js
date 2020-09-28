#! /usr/bin/env node

const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const colors = require('colors')
const inquirer = require('inquirer')
const Configstore = require('configstore')
const whichCommand = require('command-common/whichCommand.js')
const program = require('commander')
function init() {
  const branch = shell.exec(`git branch`, {
    silent: true,
  })

  console.log(`当前分支: \n  ${branch.toString().slice(2)}\n`.green)

  return new Promise(async (resolve, reject) => {
    whichCommand('where', '-g')
    let conf = getConf()
    program
      .version('0.1.5')
      .option('-i, --initConf', 'init commander config')
      .option('--viewConf', 'view commander config')
      .parse(process.argv)

    if (program.viewConf) {
      console.log(`配置文件路径：${conf.path}\n`.green)
      console.log(`${JSON.stringify(conf.get(), null, 2)}\n`.green)

      return resolve(false)
    }
    if (program.initConf) {
      await inquirerTask(conf)
    } else {
      if (Object.keys(conf.get()).length === 0) {
        console.log('未找到配置文件, 需要初始化'.red)
        console.log('开始初始化...'.red)
        await inquirerTask(conf)
      }
    }
    console.log(`配置文件路径：${conf.path}\n`.green)

    return resolve(true)
  })
}

function getAppName() {
  const curAppName = shell
    .pwd()
    .substring(
      shell.pwd().split(path.sep).join('/').lastIndexOf('/') + 1,
      shell.pwd().length
    )

  return `${curAppName}_commander`
}

function getConf() {
  return new Configstore(getAppName())
}

function inquirerTask(conf) {
  const list = [
    {
      type: 'input',
      name: 'beforeRunHook',
      message: 'commander执行开始前的钩子',
      default: conf.get().beforeRunHook || '',
    },
    {
      type: 'input',
      name: 'beforePublishHook',
      message: '发布前的钩子',
      default: conf.get().beforePublishHook || '',
    },
    {
      type: 'input',
      name: 'afterPublishHook',
      message: '发布后的钩子',
      default: conf.get().afterPublishHook || '',
    },
    {
      type: 'confirm',
      name: 'autoUpdataDependencies',
      message: '是否自动更新package中的引用依赖',
      default: !!conf.get().autoUpdataDependencies,
    },
    {
      type: 'input',
      name: 'gitCommitUrl',
      message: 'commit记录指向的url前缀',
      default: conf.get().gitCommitUrl || 'http://git.timevale.cn:8081/front-common/esign-ui'
    },
  ]
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < list.length; i++) {
      await inquirer.prompt(list[i]).then(async (answers) => {
        if (answers[list[i].name].length > 0 || typeof answers[list[i].name] === 'boolean') conf.set(list[i].name, answers[list[i].name])
        else conf.delete(list[i].name)
      })
    }
    conf.set('_beforeRun', 'commander执行开始前的钩子')
    conf.set('_beforePublishHook', '发布前的钩子')
    conf.set('_afterPublishHook', '发布后的钩子')
    conf.set('_autoUpdataDependencies', '是否自动更新package中的引用依赖')
    conf.set('_gitCommitUrl', 'commit记录指向的url前缀')
    console.log('生成配置....\n'.green)
    resolve()
  })
}

module.exports = {
  init,
  getConf,
}
