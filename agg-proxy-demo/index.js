"use strict"
const ethers = require("ethers");
const AggregatorsProxyJson = require('../build/contracts/AggregatorsProxy.json');
const { mnemonic } = require('../secret.js');
const BigNumber = require('bignumber.js');
const log4js = require('log4js');
const config = require('./conf/conf.js');
const apiModule = require('./api.js');
const { bn } = require("date-fns/locale");

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
let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null, null, null);
// 监听一下swap调用成功后返回的数据
aggregatorsProxyContract.on(filter, (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
    logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
    done = true;
});


let api = apiModule.init(log4js, config.default);

let bnb = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
let cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
let busd = '0x55d398326f99059ff775485246999027b3197955';
let oneInchRouter = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
let zeroExRouter = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';
let slippage = 0.01;

let denominator = new BigNumber(10).exponentiatedBy(18);
let amountWei = new BigNumber(10).multipliedBy(denominator);

let pArr = new Array();
// 调用1inch和0x的api
// 1 cake 换 busd
// pArr.push(api.oneInch.swap(cake, busd, amountWei.toFixed(0), aggProxyAddress));
// pArr.push(api.zeroEx.quote(cake, busd, amountWei.toFixed(0)));
// 0.05 bnb swap busd

(function swapBnbToBusd() {
    let amtWei = new BigNumber(0.05).multipliedBy(denominator).toFixed(0);
    pArr.push(api.oneInch.swap(bnb, busd, amtWei, aggProxyAddress));
    pArr.push(api.zeroEx.quote(bnb, busd, amtWei));

    Promise.all(pArr).then(res => {
        // 两个api都返回结果之后
        let oneInchPrice = new BigNumber(res[0].toTokenAmount).div(res[0].fromTokenAmount);
        let zeroExPrice = new BigNumber(res[1].price);
        logger.info('1inch price: ' + oneInchPrice.toFormat(9, BigNumber.ROUND_DOWN));
        logger.info('zeroEx price: ' + zeroExPrice.toFormat(9, BigNumber.ROUND_DOWN));
        // 比较价格，选最优的api返回的data数据
        let data = oneInchPrice.comparedTo(zeroExPrice) > 0 ? res[0].tx.data : res[1].data;
        let minReturn = oneInchPrice.comparedTo(zeroExPrice) > 0 ? oneInchPrice.multipliedBy(amtWei).multipliedBy(1 - slippage) : zeroExPrice.multipliedBy(amtWei).multipliedBy(1 - slippage);
        logger.debug('min return amt: ' + minReturn.toFormat(0, 1));
        let approveTarget = oneInchPrice.comparedTo(zeroExPrice) > 0 ? oneInchRouter : zeroExRouter;
        let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
        aggregatorsProxyContract.isWhiteListed(approveTarget).then(async isWhiteListed => {
            if (!isWhiteListed) {
                logger.error("Not white listed.");
                logger.error("Approve target: " + approveTarget);
                // await aggregatorsProxyContract.addWhiteList(zeroExRouter);
                // await aggregatorsProxyContract.addWhiteList(oneInchRouter);
            } else {
                let valHex = new ethers.utils.BigNumber(amtWei).toHexString();
                logger.debug('value hex: ' + valHex);
                // 跟前端是一样的。先估算gas
                aggregatorsProxyContract.estimate.swap(bnb, busd, approveTarget, amountWei.toFixed(0), minReturn.toFixed(0), data, deadLine, { value: valHex }).then(gas => {
                    // 调用链上合约
                    aggregatorsProxyContract.connect(wallet).swap(bnb, busd, approveTarget, amountWei.toFixed(0), minReturn.toFixed(0), data, deadLine, { value: valHex, gasLimit: gas }).then(res => {
                        logger.info('Swap tx is send.');
                    }).catch(e => {
                        logger.error(e);
                    });
                }).catch(e => {
                    logger.error(e);
                });
            }
        });
    });
})();


// for (; true === true;) { // 程序做成守护进程，直到调用swap确认后推出
//     if (done) {
//         break;
//     }
// }
