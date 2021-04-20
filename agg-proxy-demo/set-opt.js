"use strict"
const ethers = require("ethers");
const AggregatorsProxyJson = require('../build/contracts/AggregatorsProxy.json');
const { mnemonic } = require('../secret.js');
const BigNumber = require('bignumber.js');
const log4js = require('log4js');
const config = require('./conf/conf.js');
const { bn } = require("date-fns/locale");

log4js.configure(config.log4jsConfig);
const logger = log4js.getLogger('Seting Contract');
logger.info('Aggregators Proxy Demo started.');

// 合约地址
const aggProxyAddress = config.default.aggregatorsProxy.address;

// 初始化rpc provider，浏览器中不需要
const provider = new ethers.providers.JsonRpcProvider(config.default.rpc.url);
// 初始化助记词
const walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic);
// 初始化钱包
const wallet = walletMnemonic.connect(provider);

// 初始化聚合器代理合约，浏览器中方法是一样的。
const aggregatorsProxyContract = new ethers.Contract(aggProxyAddress, AggregatorsProxyJson.abi, wallet);

let oneInchRouter = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
let zeroExRouter = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';

(async function doSetting() {
    await aggregatorsProxyContract.addWhiteList(zeroExRouter);
    await aggregatorsProxyContract.addWhiteList(oneInchRouter);
    // await aggregatorsProxyContract.setDev(walletMnemonic.address);
    // await aggregatorsProxyContract.setFee('3000000000000000');
})();


// for (; true === true;) { // 程序做成守护进程，直到调用swap确认后推出
//     if (done) {
//         break;
//     }
// }
