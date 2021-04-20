
"use strict"
const https = require('https');
const querystring = require('querystring');

function get(options, logger) {
    options.method = 'GET';
    // options.path = 'https://' + options.host  + options.path;
    // options.host = '127.0.0.1';
    // options.port = '7890';
    logger.debug('Host: ' + options.host);
    logger.debug('Path: ' + options.path);
    let headers = {
        // 'Host': 'www.example.com',
        // 'Authorization': auth,
        'Content-Type': 'application/json',
        // 'Content-Length': bodyStr.length
        // 'User-Agent': 'PostmanRuntime/7.26.10'
    };
    options.headers = headers;
    let promise = new Promise(function (resolve, reject) {

        let req = https.request(options, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' +
                    `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' +
                    `Expected application/json but received ${contentType}`);
            }
            if (error) {
                logger.error(error.message);
                // Consume response data to free up memory
                res.resume();
                throw error;
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                    logger.debug(parsedData);
                } catch (e) {
                    resolve(e);
                    logger.error(e.message);
                }
            });
        });

        req.on('error', (e) => {
            logger.error(`problem with request: ${e.message}`);
            reject(e);
        });

        // write data to request body
        // req.write(bodyStr);
        req.end();
    });
    return promise;
}

module.exports = {
    init: function (log4js, config) {
        let logger = log4js.getLogger('Aggregators API');
        if (!log4js || !config) {
            return;
        } else {
            return {
                zeroEx: {
                    quote: function (sellToken, buyToken, sellAmountWei) {
                        let params = {
                            sellToken: sellToken,
                            buyToken: buyToken,
                            sellAmount: sellAmountWei,
                            // slippagePercentage: 0,
                        };
                        let options = {
                            host: config.aggregatorsProxy.zeroEx.api.host,
                            port: 443,
                            path: config.aggregatorsProxy.zeroEx.api.quote.path + '?' + querystring.stringify(params),
                            method: config.aggregatorsProxy.zeroEx.api.quote.method,
                        };
                        return get(options, logger);
                    },
                    tokens: function () {
                        let options = {
                            host: config.aggregatorsProxy.zeroEx.api.host,
                            port: 443,
                            path: config.aggregatorsProxy.zeroEx.api.tokens.path,
                            method: config.aggregatorsProxy.zeroEx.api.tokens.method,
                        };
                        return get(options, logger).then(res => {
                            if (res && res.records) {
                                let arr = new Array();
                                let tmap = {};
                                res.records.forEach(e => {
                                    let o = {
                                        symbol: '',
                                        name: '',
                                        decimal: '',
                                        address: '',
                                        logoURI: ''
                                    };
                                    arr.push(o);
                                    tmap[e.address] = o;
                                });
                                return { arr: arr, tmap: tmap };
                            } else {
                                return false;
                            }
                        });
                    }
                },
                oneInch: {
                    swap: function (fromToken, toToken, amountWei, fromAddress) {
                        let params = {
                            fromTokenAddress: fromToken,
                            toTokenAddress: toToken,
                            amount: amountWei,
                            fromAddress: fromAddress,
                            slippage: 5,
                            disableEstimate: true,
                            mainRouteParts: 40,
                            complexityLevel: 3,
                            parts: 40
                        };
                        let options = {
                            host: config.aggregatorsProxy.oneInch.api.host,
                            port: 443,
                            path: config.aggregatorsProxy.oneInch.api.swap.path + '?' + querystring.stringify(params),
                            method: config.aggregatorsProxy.oneInch.api.swap.method,
                        };
                        return get(options, logger);
                    },
                    tokens: function () {
                        let options = {
                            host: config.aggregatorsProxy.oneInch.api.host,
                            port: 443,
                            path: config.aggregatorsProxy.oneInch.api.tokens.path,
                            method: config.aggregatorsProxy.oneInch.api.tokens.method,
                        };
                        return get(options, logger).then(res => {
                            if (res && res.tokens) {
                                let arr = new Array();
                                Object.keys(res.tokens).forEach(key => {
                                    arr.push(res.tokens[key]);
                                })
                                return { arr: arr, tmap: res.tokens };
                            } else {
                                return false;
                            }
                        });
                    }
                }
            };
        }
    }
};