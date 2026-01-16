/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
// 读取wasm文件
const wasmBuffer = fs.readFileSync('./release.wasm')
;(async () => {
  const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
    /* 如需JS import可填 */
  })
  console.log(wasmModule)
  // const { decrypt } = wasmModule.instance.exports
  // // 假设你的参数是int/bytes，具体依接口修改
  // const decrypted = decrypt(参数1, 参数2)
  // console.log(decrypted)
})()
