"use strict"
const ethers = require("ethers");
const AggregatorsProxyJson = require('../build/contracts/AggregatorsProxy.json');
const { mnemonic } = require('../secret.js');
const BigNumber = require('bignumber.js');
const log4js = require('log4js');
const config = require('./conf/conf.js');
const apiModule = require('./api.js');

log4js.configure(config.log4jsConfig);
const logger = log4js.getLogger('Aggregators Proxy Demo');
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

let done = false;
let filter = aggregatorsProxyContract.filters.Swap(null, null, walletMnemonic.address, null, null, null, null);
aggregatorsProxyContract.on(filter, (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
    logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
    down = true;
});


let api = apiModule.init(log4js, config.default);

let cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
let busd = '0x55d398326f99059ff775485246999027b3197955';
let oneInchRouter = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
let zeroExRouter = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';
let slippage = new BigNumber(0.01);

let denominator = new BigNumber(10).exponentiatedBy(18);
let amountWei = new BigNumber(10).multipliedBy(denominator);

let pArr = new Array();

pArr.push(api.oneInch.swap(cake, busd, amountWei.toFixed(0), aggProxyAddress));
pArr.push(api.zeroEx.quote(cake, busd, amountWei.toFixed(0)));

Promise.all(pArr).then(res => {
    let oneInchPrice = new BigNumber(res[0].price);
    let zeroExPrice = new BigNumber(res[1].toTokenAmount).div(denominator);
    let data = oneInchPrice.comparedTo(zeroExPrice) > 0 ? res[0].data : res[1].tx.data;
    let minReturn = oneInchPrice.comparedTo(zeroExPrice) > 0 ? oneInchPrice : zeroExPrice;
    let approveTarget = oneInchPrice.comparedTo(zeroExPrice) > 0 ? oneInchRouter : zeroExRouter;
    let deaLine = Math.floor(new Date() / 1000) + 20 * 60;
    aggregatorsProxyContract.estimate.swap(cake, busd, approveTarget, amountWei.toFixed(0), minReturn.multipliedBy(denominator).toFixed(0), data, deaLine, { from: walletMnemonic.address }).then(gas => {
        aggregatorsProxyContract.connect(wallet).swap(cake, busd, approveTarget, amountWei.toFixed(0), minReturn.multipliedBy(denominator).toFixed(0), data, deaLine).thne(res => {
            logger.info('Swap tx is send.');
        }).catch(e => {
            logger.error(e);
        });
    }).catch(e => {
        logger.error(e);
    });
});

for (; true === true;) {
    if (done) {
        break;
    }
}
