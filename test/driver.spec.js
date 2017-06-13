
require('babel-polyfill');

const { makeNodeHttpServerDriver } = require('../src/driver');
const { run } = require('@cycle/run');

const http = require('http');
const assert = require('assert');
const { makeFakeReadDriver } = require('./utils');
const { makeHTTPDriver } = require('@cycle/http');
const xs = require('xstream').default;
const fs = require('fs');
const bodyParser = require('body-parser');

const httpsOptions = {
    key: fs.readFileSync(`${__dirname}/certs/key.pem`),
    cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('cycle-node-http', function () {

    this.timeout(10000);

    it('http init with one get request', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http$ = httpServer.createHttp({port:1983}).endWhen(fake);
            const httpServerReady$ = http$.take(1);
            const serverRequest$ = http$.drop(1);
            const serverResponse$ = serverRequest$.map(({ req, res }) => res.text('pouet'));

            const request$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: serverResponse$,
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNodeHttpServerDriver(),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('https init with get request', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const https$ = httpServer.createHttps({port:1984},httpsOptions).endWhen(fake);
            const httpServerReady$ = https$.take(1);
            const serverRequest$ = https$.drop(1);
            const serverResponse$ = serverRequest$.map(({ req, res }) => res.text('pouet'));

            const request$ = httpServerReady$.map(() => ({
                url: 'https://127.0.0.1:1984',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: serverResponse$,
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNodeHttpServerDriver(),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init with one post request using a middleware', function (done) {

        const DATA_SENT = {
            cov:'fefe',
            foo:'bar',
        };

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http$ = httpServer.createHttp({port:1985}).endWhen(fake);
            const httpServerReady$ = http$.take(1);
            const serverRequest$ = http$.drop(1);
            const serverResponse$ = serverRequest$.map(({ req, res }) => res.json(req.body));

            const request$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1985',
                method:'POST',
                send:DATA_SENT,
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: serverResponse$,
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNodeHttpServerDriver({
                middlewares:[
                    bodyParser.urlencoded({extended:true}),
                    bodyParser.json()
                ]
            }),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, JSON.stringify(DATA_SENT));
                }
            }, done, 1)
        }
        run(main, drivers);

    });

});