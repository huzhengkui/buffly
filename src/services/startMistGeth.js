var spawn = require('child_process').spawn
var stdout = require('stdout')
var autoMine = require('./autoMine')
var Web3 = require('web3')
var net = require('net')

var connectTimeout
module.exports = function (dataDir, mist, gokc, mine, rpc, rpcPort) {
  console.log('opening dev env at ' + dataDir)
  // gokc --vmdebug --dev --ipcpath /home/yann/Ethereum/testchains/test2/gokc.ipc --datadir /home/yann/Ethereum/testchains/test2
  var gokcprocess
  if (gokc) {
    var ipcPath = dataDir + '/gokc.ipc'
    var gokcArgs = [
      '--vmdebug',
      '--dev',
      '--ipcpath', ipcPath,
      '--datadir', dataDir
    ]
    if (rpc) {
      gokcArgs.push('--rpc')
      gokcArgs.push('--rpccorsdomain')
      gokcArgs.push(rpc)
      gokcArgs.push('--rpcapi')
      gokcArgs.push('web3,okc,debug,net,personal')
      if (!rpcPort) {
        rpcPort = 8545
      }
      gokcArgs.push('--rpcport')
      gokcArgs.push(rpcPort)
    }
    console.log(gokcArgs)
    console.log('starting gokc ... ')
    gokcprocess = run('gokc', gokcArgs)

    connectTimeout = setInterval(() => {
      connectWeb3(ipcPath, (web3) => {
        clearInterval(connectTimeout)
        if (mine) {
          autoMine(web3)
        }
      })
    }, 1000)
  }

  // mist --rpc /home/yann/Ethereum/testchains/test2/gokc.ipc
  var mistprocess
  if (mist) {
    const mistArgs = [
      '--rpc', ipcPath
    ]
    console.log('starting mist ...')
    mistprocess = run('mist', mistArgs)
  }

  function kill () {
    if (connectTimeout) {
      clearInterval(connectTimeout)
    }
    if (mistprocess) {
      console.log('stopping mist')
      mistprocess.kill()
    }
    if (gokcprocess) {
      console.log('stopping gokc')
      gokcprocess.kill()
    }
  }

  return kill
}

function connectWeb3 (ipcpath, cb) {
  try {
    console.log('connect to ' + ipcpath)
    var web3 = new Web3(new Web3.providers.IpcProvider(ipcpath, net))
    web3.okc.getBlockNumber(function (error) {
      if (error) {
        console.log('still trying to connect to node... ' + error)
      } else {
        console.log('web3', web3.version)
        cb(web3)
      }
    })
  } catch (e) {}
}

function run (app, args) {
  var proc
  try {
    proc = spawn(app, args)
    proc.on('error', (err) => {
      console.log('\x1b[31m%s\x1b[0m', '[ERR] can\'t start ' + app + '. seems not installed')
      console.log(err)
    })
    proc.stdout.pipe(stdout())
  } catch (e) {
  }
  return proc
}
