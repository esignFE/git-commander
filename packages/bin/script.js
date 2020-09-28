#! /usr/bin/env node

const inquirer = require('inquirer')
const shell = require('shelljs')
const colors = require('colors')
const publish = require('command-publish/publish.js')
const git = require('command-git/git.js')
const { findPackages } = require('command-common/findPackages.js')
const progressBar = require('command-common/progressBar.js')
const { init, getConf } = require('./init.js')

async function nextInquirer(npmVersion, versionObj) {
  let publishPackages = ['All']
  let packages = []
  packages = findPackages()
  packages.forEach((item) => {
    let curNpmVersion = npmVersion.find((obj) => obj.name === item.name)
      .npmVersion
    let str = `${item.name}  当前版本:${
      item.curVersion
    }   NPM线上最新版本:${curNpmVersion}，请确认已经更新了package.json文件中的版本号`
    publishPackages.push({
      name: str,
      value: item.name,
    })
  })

  inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'choice publish',
        message: '请选择需要发布的包?',
        choices: publishPackages,
        filter: function (val) {
          return val.includes('All') || val.length === packages.length
            ? ['All']
            : val
        },
      },
    ])
    .then(async (answers) => {
      if (answers['choice publish'] && answers['choice publish'].length > 0) {
        if (answers['choice publish'].includes('All')) {
          await publish(publishPackages.slice(1), packages)
        } else {
          let choiceAry = []
          answers['choice publish'].forEach((item) => {
            let cur = publishPackages.find((obj) => obj.value === item)
            choiceAry.push(cur)
          })
          await publish(choiceAry, packages)
        }
      }
      const { afterPublishHook } = getConf().get()
        if (typeof afterPublishHook === 'string' && afterPublishHook.trim().length > 0 && afterPublishHook !== "''") {
          console.log(
            `\n执行afterPublishHook: ${afterPublishHook}, 当前路径: ${shell.pwd()}\n`.red
          )
          shell.exec(afterPublishHook, {
            cwd: shell.pwd().toString(),
          })
          console.log(
            `\nafterPublishHook执行结束: ${afterPublishHook}, 当前路径: ${shell.pwd()}\n`
              .green
          )
        }
    })
}

function updateProgressBar(pb, num, total) {
  if (num <= total) {
    pb.render({
      completed: num,
      total: total,
    })
  }
}

init().then((status) => {
  if (!status) return

  const { beforeRunHook } = getConf().get()
  if (typeof beforeRunHook === 'string' && beforeRunHook.trim().length > 0 && beforeRunHook !== "''") {
    console.log(
      `\n执行beforeRunHook: ${beforeRunHook}, 当前路径: ${shell.pwd()}\n`.red
    )
    shell.exec(beforeRunHook, {
      cwd: shell.pwd().toString(),
    })
    console.log(
      `\nbeforeRunHook执行结束: ${beforeRunHook}, 当前路径: ${shell.pwd()}\n`
        .green
    )
  }

  inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'choice operate',
        message: '请选择需要进行的操作?',
        choices: ['git', 'npm publish'],
      },
    ])
    .then(async (answers) => {
      let versionObj
      if (answers['choice operate'].includes('git')) {
        versionObj = await git()
      }

      if (answers['choice operate'].includes('npm publish')) {
        const { beforePublishHook } = getConf().get()
        console.log(beforePublishHook.trim().length)
        if (typeof beforePublishHook === 'string' && beforePublishHook.trim().length > 0 && beforePublishHook !== "''") {
          console.log(
            `\n执行beforePublishHook: ${beforePublishHook}, 当前路径: ${shell.pwd()}\n`.red
          )
          shell.exec(beforePublishHook, {
            cwd: shell.pwd().toString(),
          })
          console.log(
            `\nbeforePublishHook执行结束: ${beforePublishHook}, 当前路径: ${shell.pwd()}\n`
              .green
          )
        }
        let npmVersion = []
        let curPackages = findPackages()
        let num = 0
        let total = curPackages.length
        let pb = new progressBar('正在获取项目内所有NPM包的最新线上版本', 20)
        let npmPromiseAry = []
        updateProgressBar(pb, num, total)
        for (let cur of curPackages) {
          npmPromiseAry.push(
            new Promise((resolve, reject) => {
              shell.exec(
                `npm view ${cur.name}  versions --json`,
                {
                  silent: true,
                },
                (err, data) => {
                  let version = JSON.parse(data)
                  npmVersion.push({
                    name: cur.name,
                    npmVersion: version.pop(),
                  })
                  resolve(updateProgressBar(pb, ++num, total))
                }
              )
            })
          )
        }
        await Promise.all(npmPromiseAry)
        nextInquirer(npmVersion)
      }
    })
})
