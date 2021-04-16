"use strict"
const ethers = require("ethers");
const AggregatorsProxyJson = require('../build/contracts/AggregatorsProxy.json');
const BEP20Json = require('../build/contracts/BEP20.json');
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
const bnb = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const busd = '0x55d398326f99059ff775485246999027b3197955';
const oneInchRouter = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
const zeroExRouter = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';

// 初始化rpc provider，浏览器中不需要
const provider = new ethers.providers.JsonRpcProvider(config.default.rpc.url);
// 初始化助记词
const walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic);
// 初始化钱包
const wallet = walletMnemonic.connect(provider);

// 初始化聚合器代理合约，浏览器中方法是一样的。
const aggregatorsProxyContract = new ethers.Contract(aggProxyAddress, AggregatorsProxyJson.abi, wallet);

const busdContract = new ethers.Contract(busd, BEP20Json.abi, wallet);
const cakeContract = new ethers.Contract(cake, BEP20Json.abi, wallet);

let done = false;
// let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null, null, null);
// 监听一下swap调用成功后返回的数据
// aggregatorsProxyContract.on(filter, (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
//     logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
//     done = true;
// });


let api = apiModule.init(log4js, config.default);


let slippage = 0.01;

let denominator = new BigNumber(10).exponentiatedBy(18);

// 调用1inch和0x的api
// 1 cake 换 busd
// pArr.push(api.oneInch.swap(cake, busd, amountWei.toFixed(0), aggProxyAddress));
// pArr.push(api.zeroEx.quote(cake, busd, amountWei.toFixed(0)));
// 0.05 bnb swap busd

function swapBnbToBusd(cb) { // bnb 换 busd

    let pArr = new Array();
    let amtWei = new BigNumber(0.05).multipliedBy(denominator).toFixed(0);
    pArr.push(api.oneInch.swap(bnb, busd, amtWei, aggProxyAddress));
    pArr.push(api.zeroEx.quote(bnb, busd, amtWei));

    Promise.all(pArr).then(res => {
        // 两个api都返回结果之后
        let oneIncheAmt = new BigNumber(res[0].toTokenAmount);
        let zeroExAmt = new BigNumber(res[1].buyAmount);
        logger.info('1inch amt: ' + oneIncheAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
        logger.info('zeroEx amt: ' + zeroExAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
        // 比较价格，选最优的api返回的data数据
        let data = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? res[0].tx.data : res[1].data;
        // 根据滑点，能够接受的最小的兑换数量
        let minReturn = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneIncheAmt.multipliedBy(1 - slippage) : zeroExAmt.multipliedBy(1 - slippage);
        logger.debug('min return amt: ' + minReturn.div(denominator).toFormat(18, 1));
        let approveTarget = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneInchRouter : zeroExRouter;
        logger.info('Target: ' + approveTarget);
        let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
        let valHex = new ethers.utils.BigNumber(amtWei).toHexString();
        logger.debug('value hex: ' + valHex);
        // 跟前端是一样的。先估算gas
        aggregatorsProxyContract.estimate.swap(bnb, busd, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine, { value: valHex }).then(gas => {
            // 调用链上合约
            aggregatorsProxyContract.connect(wallet).swap(bnb, busd, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine, { value: valHex, gasLimit: gas }).then(res => {
                logger.info('Swap tx is send.');
                let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null, null, null);
                let swapListener = (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
                    logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
                    if (cb) {
                        cb(true);
                    }
                };
                aggregatorsProxyContract.once(filter, swapListener);
            }).catch(e => {
                logger.error(e);
            });
        }).catch(e => {
            logger.error(e);
        });
    }).catch(e => {
        logger.error(e);
    });
};

async function swapBusdToCake(cb) { // busd 换 cake
    let pArr = new Array();
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let busdBalance = await busdContract.balanceOf(walletMnemonic.address);
    logger.debug('busd balance: ' + busdBalance);
    let swap = function () {
        let amtWei = String(busdBalance);
        logger.debug('amtWei: ' + amtWei);
        pArr.push(api.oneInch.swap(busd, cake, amtWei, aggProxyAddress));
        pArr.push(api.zeroEx.quote(busd, cake, amtWei));

        Promise.all(pArr).then(res => {
            let oneIncheAmt = new BigNumber(res[0].toTokenAmount);
            let zeroExAmt = new BigNumber(res[1].buyAmount);
            logger.info('1inch amt: ' + oneIncheAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
            logger.info('zeroEx amt: ' + zeroExAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
            // 比较价格，选最优的api返回的data数据
            let data = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? res[0].tx.data : res[1].data;
            // 根据滑点，能够接受的最小的兑换数量
            let minReturn = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneIncheAmt.multipliedBy(1 - slippage) : zeroExAmt.multipliedBy(1 - slippage);
            logger.debug('min return amt: ' + minReturn.div(denominator).toFormat(18, 1));
            let approveTarget = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneInchRouter : zeroExRouter;
            logger.info('Target: ' + approveTarget);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            // 跟前端是一样的。先估算gas
            aggregatorsProxyContract.estimate.swap(busd, cake, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine).then(gas => {
                // 调用链上合约
                aggregatorsProxyContract.connect(wallet).swap(busd, cake, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine).then(res => {
                    logger.info('Swap tx is send.');
                    let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null, null, null);
                    let swapListener = (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
                        logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
                        if (cb) {
                            cb(true);
                        }
                    };
                    aggregatorsProxyContract.once(filter, swapListener);
                }).catch(e => {
                    logger.error(e);
                });
            }).catch(e => {
                logger.error(e);
            });
        }).catch(e => {
            logger.error(e);
        });
    };

    let allowance = await busdContract.allowance(walletMnemonic.address, aggProxyAddress);
    logger.debug('allowance: ' + allowance);
    if (new BigNumber(allowance).comparedTo(busdBalance) < 0) {
        busdContract.approve(aggProxyAddress, busdBalance).then(() => {
            let filterApprove = busdContract.filters.Approval(walletMnemonic.address, aggProxyAddress, null);
            busdContract.once(filterApprove, (owner, spender, amount) => { // approve 成功以后才能兑换
                logger.debug('Approve success: ' + amount);
                swap();
            });
        });
    } else {
        swap();
    }

};

async function swapCakeToBnb(cb) { // cake 换 bnb
    let pArr = new Array();
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let cakeBalance = await cakeContract.balanceOf(walletMnemonic.address);
    logger.debug('cake balance: ' + cakeBalance);
    let swap = function () {
        let amtWei = String(cakeBalance);
        logger.debug('amtWei: ' + amtWei);
        pArr.push(api.oneInch.swap(cake, bnb, amtWei, aggProxyAddress));
        pArr.push(api.zeroEx.quote(cake, bnb, amtWei));

        Promise.all(pArr).then(res => {
            let oneIncheAmt = new BigNumber(res[0].toTokenAmount);
            let zeroExAmt = new BigNumber(res[1].buyAmount);
            logger.info('1inch amt: ' + oneIncheAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
            logger.info('zeroEx amt: ' + zeroExAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
            // 比较价格，选最优的api返回的data数据
            let data = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? res[0].tx.data : res[1].data;
            // 根据滑点，能够接受的最小的兑换数量
            let minReturn = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneIncheAmt.multipliedBy(1 - slippage) : zeroExAmt.multipliedBy(1 - slippage);
            logger.debug('min return amt: ' + minReturn.div(denominator).toFormat(18, 1));
            let approveTarget = oneIncheAmt.comparedTo(zeroExAmt) > 0 ? oneInchRouter : zeroExRouter;
            logger.info('Target: ' + approveTarget);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            // 跟前端是一样的。先估算gas
            aggregatorsProxyContract.estimate.swap(cake, bnb, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine).then(gas => {
                // 调用链上合约
                aggregatorsProxyContract.connect(wallet).swap(cake, bnb, approveTarget, amtWei, minReturn.toFixed(0), data, deadLine).then(res => {
                    logger.info('Swap tx is send.');
                    let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null, null, null);
                    let swapListener = (fromToken, toToken, sender, fromAmount, minReturnAmount, returnAmount, target) => {
                        logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nminReturnAmount: ' + minReturnAmount + '\nreturnAmount: ' + returnAmount + '\ntarget: ' + target);
                        if (cb) {
                            cb(true);
                        }
                    };
                    aggregatorsProxyContract.once(filter, swapListener);

                }).catch(e => {
                    logger.error(e);
                });
            }).catch(e => {
                logger.error(e);
            });
        }).catch(e => {
            logger.error(e);
        });
    };

    let allowance = await cakeContract.allowance(walletMnemonic.address, aggProxyAddress);
    logger.debug('allowance: ' + allowance);
    if (new BigNumber(allowance).comparedTo(cakeBalance) < 0) {
        cakeContract.approve(aggProxyAddress, cakeBalance).then(() => {
            let filterApprove = cakeContract.filters.Approval(walletMnemonic.address, aggProxyAddress, null);
            cakeContract.once(filterApprove, (owner, spender, amount) => { // approve 成功以后才能兑换
                logger.debug('Approve success: ' + amount);
                swap();
            });
        });
    } else {
        swap();
    }
};

swapBnbToBusd(r => {
    swapBusdToCake(r => {
        swapCakeToBnb(r => {
            aggregatorsProxyContract.removeAllListeners('Swap');
        });
    });
});
