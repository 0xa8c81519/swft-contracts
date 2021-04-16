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


