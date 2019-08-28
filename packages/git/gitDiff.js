const exec = require('child_process').exec

const command = 'git diff HEAD^ --name-status '

const getArrList = (str, type) => {
  const arr = str.split('\n')
  arr.splice(arr.length - 1, 1)
  const dictList = {
    M: '修改',
    D: '删除',
    A: '新增'
  }
  let result = {}
  arr.forEach(item => {
    let str = item[0]
    if (!result[dictList[item[0]]]) result[dictList[item[0]]] = []
    result[dictList[item[0]]].push(item.split('\t')[1])
  })
  return result
}

module.exports = function gitDiff() {
  return new Promise((resolve, reject) => {
    exec(command, 'utf8', (err, stdout, stderr) => {
      if (err) {
        console.log('err:', err)
        console.log('stderr:', stderr)
      } else {
        let diffAry
        diffAry = getArrList(stdout)
        resolve(diffAry)
      }
    })
  }).then(res => {
    return new Promise((resolve, reject) => {
      exec('git reset HEAD', 'utf8', (err, stdout, stderr) => {
        if (err) {
          console.log('err:', err)
          console.log('stderr:', stderr)
        } else {
          resolve(res)
        }
      })
    })
  })
}
