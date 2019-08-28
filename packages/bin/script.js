#! /usr/bin/env node

const inquirer = require('inquirer')
const shell = require('shelljs')
const colors = require('colors')
const publish = require('command-publish/publish.js')
const git = require('command-git/git.js')
const findPackages = require('command-common/findPackages.js')
const progressBar = require('command-common/progressBar.js')
function updateProgressBar(pb, num, total) {
  if (num <= total) {
    pb.render({ completed: num, total: total })
  }
}

const branch = shell.exec(`git branch`, { silent: true })
console.log(`当前分支: ${branch.toString().slice(2)}`.green)

inquirer
  .prompt([
    {
      type: 'checkbox',
      name: 'choice operate',
      message: '请选择需要进行的操作?',
      choices: ['git', 'npm publish']
    }
    // {
    //   type: 'confirm',
    //   name: 'submit to gerrit',
    //   message: '是否提交到gerrit',
    //   default: true,
    //   when: function(val) {
    //     let opt = val['choice operate']
    //     return opt.indexOf('git') > -1
    //   },
    //   filter: function(val) {
    //     return val.toLowerCase()
    //   }
    // }
  ])
  .then(async answers => {
    let versionObj
    if (answers['choice operate'].indexOf('git') > -1) {
      // if (answers['submit to gerrit']) versionObj = await git('gerrit')
      // else
      versionObj = await git()
    }

    if (answers['choice operate'].indexOf('npm publish') > -1) {
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
              { silent: true },
              (err, data) => {
                let version = JSON.parse(data)
                npmVersion.push({ name: cur.name, npmVersion: version.pop() })
                resolve(updateProgressBar(pb, ++num, total))
              }
            )
          })
        )
      }
      await Promise.all(npmPromiseAry)
      // nextInquirer(versionObj, npmVersion)
      nextInquirer(npmVersion)
    }
  })
//
async function nextInquirer(npmVersion, versionObj) {
  let publishPackages = ['All']
  let packages = []
  // if (!versionObj) {
  packages = findPackages()
  packages.forEach(item => {
    let curNpmVersion = npmVersion.find(obj => obj.name === item.name)
      .npmVersion
    let ary1 = item.curVersion.split('.')
    let ary2 = curNpmVersion.split('.')
    let disabled =
      ary1[0] - 0 > ary2[0] - 0
        ? false
        : ary1[1] - 0 > ary2[1] - 0
        ? false
        : ary1[2] - 0 > ary2[2] - 0
        ? false
        : true

    let str = `${item.name}  当前版本:${
      item.curVersion
    }   NPM线上最新版本:${curNpmVersion}   ${
      disabled ? '请确认是否更新了package.json文件中的版本号!' : ''
    }`
    publishPackages.push({
      name: str,
      value: item.name,
      disabled
    })
  })
  // } else {
  //   Object.keys(versionObj).forEach(item => {
  //     let curNpmVersion = npmVersion.find(
  //       obj => versionObj[item].name === obj.name
  //     ).npmVersion
  //     packages.push({
  //       name: versionObj[item].name,
  //       path: versionObj[item].packagePath
  //     })
  //     //
  //     let ary1 = versionObj[item].version.split('.')
  //     let ary2 = curNpmVersion.split('.')
  //     let disabled =
  //       ary1[0] - 0 > ary2[0] - 0
  //         ? false
  //         : ary1[1] - 0 > ary2[1] - 0
  //         ? false
  //         : ary1[2] - 0 > ary2[2] - 0
  //         ? false
  //         : true

  //     let str = `${versionObj[item].name}  当前版本:${
  //       versionObj[item].version
  //     }   NPM线上最新版本:${curNpmVersion}   ${
  //       disabled ? '请确认是否更新了package.json文件中的版本号!' : ''
  //     }`

  //     publishPackages.push({
  //       name: str,
  //       value: versionObj[item].name,
  //       disabled
  //     })
  //   })
  // }

  let flag = publishPackages.find(
    (item, index) => index !== 0 && !item.disabled
  )
  if (!flag)
    publishPackages.splice(0, 1, {
      name: '没有可以发布的package',
      value: '没有可以发布的package',
      disabled: true
    })

  inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'choice publish',
        message: '请选择需要发布的包?',
        choices: publishPackages,
        filter: function(val) {
          return val.indexOf('All') > -1 || val.length === packages.length
            ? ['All']
            : val
        }
      }
    ])
    .then(async answers => {
      if (answers['choice publish'] && answers['choice publish'].length > 0) {
        if (answers['choice publish'].indexOf('All') !== -1) {
          await publish(
            publishPackages.slice(1).filter(item => !item.disabled),
            packages
          )
        } else {
          let choiceAry = []
          answers['choice publish'].forEach(item => {
            let cur = publishPackages.find(obj => obj.value === item)
            choiceAry.push(cur)
          })
          await publish(choiceAry, packages)
        }
      }
    })
}
