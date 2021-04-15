"use strict"
const ethers = require("ethers");
const AggregatorsProxy = require('../build/contracts/AggregatorsProxy.json');
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

const provider = new ethers.providers.JsonRpcProvider(config.default.rpc.url);

const wallet = new ethers.Wallet.fromMnemonic(mnemonic);


let api = apiModule.init(log4js, config.default);

let cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
let busd = '0x55d398326f99059ff775485246999027b3197955';

let amountWei = new BigNumber(10).exponentiatedBy(18).toFixed(0);
api.oneInch.swap(cake, busd, amountWei, aggProxyAddress).then((data) => {
    logger.info(data);
});
api.zeroEx.quote(cake, busd, amountWei).then(data => {
    logger.info(data);
});
