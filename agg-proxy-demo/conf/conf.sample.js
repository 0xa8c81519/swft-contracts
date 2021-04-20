'use strict'
const log4jsConfig = {
    appenders: {
        stdout: { type: 'stdout' },
        noodle: {
            type: 'dateFile',
            //文件名为= filename + pattern, 设置为alwaysIncludePattern：true
            filename: 'logs/aggregators-proxy',
            pattern: 'yyyy-MM-dd.log',
            //包含模型
            alwaysIncludePattern: true
        }
    },
    categories: { default: { appenders: ["stdout", "noodle"], level: "info" } }
};

const config = {
    rpc: {
        url: 'https://bsc-dataseed.binance.org/',
        chainId: 56
    },
    aggregatorsProxy: {
        address: '0x8E2DDD3bfc632B60143901bf8F81e86d7E4dc89E',
        zeroEx: {
            api: {
                host: 'bsc.api.0x.org',
                quote: {
                    path: '/swap/v1/quote',
                    method: 'GET'
                },
                tokens: {
                    path: '/swap/v1/tokens',
                    method: 'GET'
                }
            }
        },
        oneInch: {
            api: {
                host: 'api.1inch.exchange',
                swap: {
                    path: '/v3.0/56/swap',
                    method: 'GET'
                },
                tokens: {
                    path: '/v3.0/56/tokens',
                    method: 'GET'
                }
            }
        }
    },
};

module.exports = { log4jsConfig: log4jsConfig, default: config };
