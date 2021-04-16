# Contracts of SWFT

node 10 以上

## 说明

### 本地安装测试部署

1. 要事先安装truffle和ganache-cli

```
npm install -g truffle

npm install -g ganache-cli
```

2. 安装依赖

```
npm install
```

3. 编译合约

```
npm run t:compile
```

4. 测试本地部署

现在一个终端窗口执行

```
npm run g:start
```

打开另一个窗口运行

```
truffle test test/AggregatorsProxy.test.ts --network=dev
```

5. 部署到主网

```
truffle migrate --network=bsc_main
```

6. 调用demo说明

程序目录在`agg-proxy-demo`中

运行

```
node index.js
```

## 调试结果

这笔交易由于发合约的时候gas不够，然后没设置手续费，所以没收。
https://bscscan.com/tx/0x791a9a3e73108a97547d632304647a441602a8cfc9e2bd4a822f9b92116874a6

这比交易有收手续费
https://bscscan.com/tx/0xba4456eaf37b6ccef398cef1455946625a7d3b39c9fd0fb7d586fe623edb3a4a

busd 换 cake
https://bscscan.com/tx/0x5b2963f3b9754de1ef187de2366414faad5f44ef6eb4535a27c44b322cce4102

cake 换 busd


