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
const usdc = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
const dai = '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3';
const uni = '0xbf5140a22578168fd562dccf235e5d43a02ce9b1';
// const thirdPartyAddress = '0xc529b0738cFAeaDb378bdC9FF0B35dc6DAf2a65D';
const thirdPartyAddress = ethers.constants.AddressZero;

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
const usdcContract = new ethers.Contract(usdc, BEP20Json.abi, wallet);
const daiContract = new ethers.Contract(dai, BEP20Json.abi, wallet);
const uniContract = new ethers.Contract(uni, BEP20Json.abi, wallet);

let api = apiModule.init(log4js, config.default);


let slippage = 0.03;

let denominator = new BigNumber(10).exponentiatedBy(18);

function doSwap(fromToken, toToken, approveTarget, amtWei, minReturn, data, _thirdPartyAddress, deadLine, txData) {
    logger.debug('fromToken: ' + fromToken);
    logger.debug('toToken: ' + toToken);
    logger.debug('amtWei: ' + amtWei);
    logger.debug('minReturn: ' + minReturn);
    logger.debug('_thirdPartyAddress: ' + _thirdPartyAddress);
    logger.debug('deadLine: ' + deadLine);
    logger.debug('txData: ' + txData.value);
    logger.info('Approve Target: ' + approveTarget);
    logger.info('data: ' + data);
    return aggregatorsProxyContract.estimate.swap(fromToken, toToken, approveTarget, amtWei, minReturn, data, _thirdPartyAddress, deadLine, txData).then(gas => {
        // 调用链上合约
        return aggregatorsProxyContract.connect(wallet).swap(fromToken, toToken, approveTarget, amtWei, minReturn, data, _thirdPartyAddress, deadLine, { value: txData && txData.value ? txData.value : '0x', gasLimit: new ethers.utils.BigNumber(gas).toHexString() }).then(res => {
            logger.info('Swap tx is send.');
            let filter = aggregatorsProxyContract.filters.Swap(null, null, null, null, null);
            let swapListener = (fromToken, toToken, sender, fromAmount, returnAmount) => {
                logger.info('swap record:\nfromToken: ' + fromToken + '\ntoToken: ' + toToken + '\nsender: ' + sender + '\n fromAmount: ' + fromAmount + '\nreturnAmount: ' + returnAmount);
            };
            aggregatorsProxyContract.once(filter, swapListener);
            return res;
        });
    });
}

function getRouter(fromToken, toToken, amtWei, aggAddress) {
    let pArr = new Array();
    pArr.push(api.oneInch.tokens());
    pArr.push(api.zeroEx.tokens());
    return Promise.all(pArr).then(res => {
        logger.debug(res.length);
        let tokens = [fromToken.toLowerCase(), toToken.toLowerCase()];
        // Array's data as follow:
        // 1inch 0  1
        // 0xEx  1  1
        //       f  t
        let rArr = new Array();
        for (let i = 0; i < res.length; i++) {
            rArr[i] = new Array();
            for (let n = 0; n < tokens.length; n++) {
                if (res[i] && res[i].tmap[tokens[n]]) {
                    rArr[i][n] = 1;
                } else {
                    rArr[i][n] = 0;
                }
            }
        }
        let calculateMatrix = arr => {
            let len_0 = 0;
            for (let i = 0; i < arr.length; i++) {
                if (i === 0) {
                    len_0 = arr[i].length;
                } else {
                    if (len_0 !== arr[i].length) {
                        return -1;
                    }
                }
            }
            let r = 0;
            let tLen = arr[0].length * arr.length;
            arr.forEach(a => {
                a.forEach(e => {
                    tLen--;
                    if (e === 1) {
                        r += 2 ** tLen;
                    }
                });
            });
            return r;
        };
        for (let i = 0; i < rArr.length; i++) {
            logger.debug('rArr: ' + rArr[i]);
        }
        let result = calculateMatrix(rArr);
        let getRouterDataFromOneInch = function (fromToken, toToken, _amtWei, aggAddress) {
            return api.oneInch.swap(fromToken, toToken, _amtWei, aggAddress).then(res => {
                let oneIncheAmt = new BigNumber(res.toTokenAmount);
                logger.info('1inch amt: ' + oneIncheAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
                let oneInchData = res.tx.data;
                let approveTarget = res.tx.to;
                return { approveTarget: approveTarget, outWei: oneIncheAmt, data: oneInchData };
            });
        };
        let getRouterDataFromZeroEx = function (fromToken, toToken, _amtWei) {
            return api.zeroEx.quote(fromToken, toToken, _amtWei).then(res => {
                let zeroExAmt = new BigNumber(res.buyAmount);
                logger.info('zeroEx amt: ' + zeroExAmt.div(denominator).toFormat(18, BigNumber.ROUND_DOWN));
                let zeroExData = res.data;
                let approveTarget = res.to;
                return { approveTarget: approveTarget, outWei: zeroExAmt, data: zeroExData };
            });
        };
        logger.debug("result: " + result);
        // return getRouterDataFromOneInch(fromToken, toToken, amtWei, aggProxyAddress);
        // return getRouterDataFromZeroEx(fromToken, toToken, amtWei);
        switch (result) {
            case -1:
                throw new Error('State Wrong.');
            case 15:
                // both
                let pArr = new Array();
                pArr.push(getRouterDataFromOneInch(fromToken, toToken, amtWei, aggProxyAddress));
                pArr.push(getRouterDataFromZeroEx(fromToken, toToken, amtWei));
                return Promise.all(pArr).then(res => {
                    let oneInchAmt = new BigNumber(res[0].outWei);
                    let zeroExAmt = new BigNumber(res[1].outWei);
                    if (oneInchAmt.comparedTo(zeroExAmt) >= 0) {
                        return res[0];
                    } else {
                        return res[1];
                    }
                });
            case 12:
                // 1
                return getRouterDataFromOneInch(fromToken, toToken, amtWei, aggProxyAddress);
            case 14:
                // 1
                return getRouterDataFromOneInch(fromToken, toToken, amtWei, aggProxyAddress);
            case 13:
                // 1
                return getRouterDataFromOneInch(fromToken, toToken, amtWei, aggProxyAddress);
            case 3:
                // 0
                return getRouterDataFromZeroEx(fromToken, toToken, amtWei);
            case 11:
                // 0
                return getRouterDataFromZeroEx(fromToken, toToken, amtWei);
            case 7:
                //0
                return getRouterDataFromZeroEx(fromToken, toToken, amtWei);
            default:
                throw new Error('Unsupported pair.');

        }
    });
}

function swapBnbToBusd() { // bnb 换 busd
    logger.info('BNB swap BUSD.');
    let amtWei = new BigNumber(0.05).multipliedBy(denominator).toFixed(0);
    return getRouter(bnb, busd, amtWei, aggProxyAddress).then(router => {
        let outAmtWei = new BigNumber(router.outWei);
        let minReturn = outAmtWei.multipliedBy(1 - slippage);
        let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
        let valHex = new ethers.utils.BigNumber(amtWei).toHexString();
        logger.debug('value hex: ' + valHex);
        return doSwap(bnb, busd, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { value: valHex, gasLimit: new ethers.utils.BigNumber(61000000).toHexString() }).then(res => {
            console.info(res);
        }).catch(e => {
            logger.error(e);
        });
    });
};

async function swapBusdToCake() { // busd 换 cake
    logger.info('BUSD swap CAKE.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let busdBalance = await busdContract.balanceOf(walletMnemonic.address);
    logger.debug('busd balance: ' + busdBalance);
    let swap = function () {
        let amtWei = String(busdBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(busd, cake, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(busd, cake, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
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
async function swapBusdToDai() { // busd 换 dai
    logger.info('BUSD swap DAI.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let busdBalance = await busdContract.balanceOf(walletMnemonic.address);
    logger.debug('busd balance: ' + busdBalance);
    let swap = function () {
        let amtWei = String(busdBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(busd, dai, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(busd, dai, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
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
async function swapBusdToUni() { // busd 换 uni
    logger.info('BUSD swap UNI.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let busdBalance = await busdContract.balanceOf(walletMnemonic.address);
    logger.debug('busd balance: ' + busdBalance);
    let swap = function () {
        let amtWei = String(busdBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(busd, uni, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(busd, uni, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
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
async function swapCakeToBnb() { // cake 换 bnb
    logger.info('CAKE swap BNB.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let cakeBalance = await cakeContract.balanceOf(walletMnemonic.address);
    logger.debug('cake balance: ' + cakeBalance);
    let swap = function () {
        let amtWei = String(cakeBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(cake, bnb, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(cake, bnb, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
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
async function swapDaiToBnb() { // dai 换 bnb
    logger.info('DAI swap BNB.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let daiBalance = await daiContract.balanceOf(walletMnemonic.address);
    logger.debug('dai balance: ' + daiBalance);
    let swap = function () {
        let amtWei = String(daiBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(dai, bnb, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(dai, bnb, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
        });
    };

    let allowance = await daiContract.allowance(walletMnemonic.address, aggProxyAddress);
    logger.debug('allowance: ' + allowance);
    if (new BigNumber(allowance).comparedTo(daiBalance) < 0) {
        daiContract.approve(aggProxyAddress, daiBalance).then(() => {
            let filterApprove = daiContract.filters.Approval(walletMnemonic.address, aggProxyAddress, null);
            daiContract.once(filterApprove, (owner, spender, amount) => { // approve 成功以后才能兑换
                logger.debug('Approve success: ' + amount);
                swap();
            });
        });
    } else {
        swap();
    }
};
async function swapUniToBnb() { // dai 换 bnb
    logger.info('UNI swap BNB.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let uniBalance = await uniContract.balanceOf(walletMnemonic.address);
    logger.debug('uni balance: ' + uniBalance);
    let swap = function () {
        let amtWei = String(uniBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(uni, bnb, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(uni, bnb, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
        });
    };

    let allowance = await uniContract.allowance(walletMnemonic.address, aggProxyAddress);
    logger.debug('allowance: ' + allowance);
    if (new BigNumber(allowance).comparedTo(uniBalance) < 0) {
        uniContract.approve(aggProxyAddress, uniBalance).then(() => {
            let filterApprove = uniContract.filters.Approval(walletMnemonic.address, aggProxyAddress, null);
            uniContract.once(filterApprove, (owner, spender, amount) => { // approve 成功以后才能兑换
                logger.debug('Approve success: ' + amount);
                swap();
            });
        });
    } else {
        swap();
    }
};
async function swapBusdToBnb() { // busd 换 bnb
    logger.info('BUSD swap BNB.');
    logger.debug('accounts[0]: ' + walletMnemonic.address);
    let busdBalance = await busdContract.balanceOf(walletMnemonic.address);
    logger.debug('busd balance: ' + busdBalance);
    let swap = function () {
        let amtWei = String(busdBalance);
        logger.debug('amtWei: ' + amtWei);
        return getRouter(busd, bnb, amtWei, aggProxyAddress).then(router => {
            let outAmtWei = new BigNumber(router.outWei);
            let minReturn = outAmtWei.multipliedBy(1 - slippage);
            let deadLine = Math.floor(new Date() / 1000) + 20 * 60;
            return doSwap(busd, bnb, router.approveTarget, amtWei, minReturn.toFixed(0), router.data, thirdPartyAddress, deadLine, { gasLimit: new ethers.utils.BigNumber(650000).toHexString() }).then(res => {
                console.info(res);
            }).catch(e => {
                logger.error(e);
            });
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

switch (process.argv[2]) {
    case '0':
        swapBnbToBusd();
        break;
    case '1':
        swapBusdToUni();
        break;
    case '2':
        swapUniToBnb();
        break;
}