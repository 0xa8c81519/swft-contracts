'use strict'
const log4jsConfig = {
    appenders: {
        stdout: { type: 'stdout' },
        noodle: {
            type: 'dateFile',
            //文件名为= filename + pattern, 设置为alwaysIncludePattern：true
            filename: 'logs/defistation-data-provider',
            pattern: 'yyyy-MM-dd.log',
            //包含模型
            alwaysIncludePattern: true
        }
    },
    categories: { default: { appenders: ["stdout", "noodle"], level: "info" } }
};

const config = {
    rpc: {
        url: '',
        chainId: 1
    },
};

module.exports = { log4jsConfig: log4jsConfig, default: config };
