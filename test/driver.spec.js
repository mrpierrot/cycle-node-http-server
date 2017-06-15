
require('babel-polyfill');

const { makeHttpServerDriver } = require('../src/driver');
const { run } = require('@cycle/run');

const http = require('http');
const assert = require('assert');
const { makeFakeReadDriver, vdom } = require('./utils');
const { makeHTTPDriver } = require('@cycle/http');
const xs = require('xstream').default;
const fs = require('fs');
const bodyParser = require('body-parser');
const { html } = require('snabbdom-jsx');

const securedOptions = {
    key: fs.readFileSync(`${__dirname}/certs/key.pem`),
    cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('driver', function () {

    this.timeout(10000);

    it('http init with one get request', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.text('pouet'));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                port: 1983
            });

            const httpStop$ = fake.mapTo({
                action: 'stop',
                id: 'http',
            });

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpStop$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver(),
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

            const https = httpServer.select('https');
            const serverReady$ = https.events('ready');
            const serverRequest$ = https.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.text('pouet'));

            const request$ = serverReady$.map(() => ({
                url: 'https://127.0.0.1:1984',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpsCreate$ = xs.of({
                id: 'https',
                action: 'create',
                port: 1984,
                secured: true,
                securedOptions
            });

            const httpsStop$ = fake.mapTo({
                action: 'stop',
                id: 'https',
            })

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpsCreate$, httpsStop$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver(),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init and https init with get request', function (done) {

        function main(sources) {
            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const https = httpServer.select('https');
            const httpServerReady$ = http.events('ready');
            const httpsServerReady$ = https.events('ready');
            const httpServerRequest$ = http.events('request');
            const httpsServerRequest$ = https.events('request');
            const httpServerResponse$ = httpServerRequest$.map(req => req.response.text('pouet'));
            const httpsServerResponse$ = httpsServerRequest$.map(req => req.response.text('pouet'));

            const httpRequest$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const httpsRequest$ = httpsServerReady$.map(() => ({
                url: 'https://127.0.0.1:1984',
                category: 'foo-secured'
            }));

            const httpResponse$ = HTTP.select('foo').flatten();
            const httpsResponse$ = HTTP.select('foo-secured').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                port: 1983
            });

            const httpsCreate$ = xs.of({
                id: 'https',
                action: 'create',
                port: 1984,
                secured: true,
                securedOptions
            });

            const httpStop$ = fake.mapTo({
                action: 'stop',
                id: 'http',
            });

            const httpsStop$ = fake.mapTo({
                action: 'stop',
                id: 'https',
            });

            const sinks = {
                fake: xs.combine(httpResponse$, httpsResponse$),
                httpServer: xs.merge(httpCreate$, httpsCreate$, httpStop$, httpsStop$, httpServerResponse$, httpsServerResponse$),
                HTTP: xs.merge(httpRequest$, httpsRequest$)
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver(),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver(([httpResponse, httpsResponse], i, complete) => {
                if (httpResponse.text) {
                    assert.equal(httpResponse.text, 'pouet')
                }
                if (httpsResponse.text) {
                    assert.equal(httpsResponse.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init with one post request using a middleware', function (done) {

        const DATA_SENT = {
            cov: 'fefe',
            foo: 'bar',
        };

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.json(DATA_SENT));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1985',
                method: 'POST',
                send: DATA_SENT,
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                port: 1985
            });

            const httpStop$ = fake.mapTo({
                action: 'stop',
                id: 'http',
            });

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpStop$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver({
                middlewares: [
                    bodyParser.urlencoded({ extended: true }),
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

    it('http init with one get request and rendering with snabbdom', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.render(
                <div>pouet</div>
            ));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1986',
                category: 'foo'
            }));

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                port: 1986
            });

            const httpStop$ = fake.mapTo({
                action: 'stop',
                id: 'http',
            });

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpStop$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver({ render: vdom() }),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, '<div>pouet</div>')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

});