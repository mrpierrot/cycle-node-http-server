
require('babel-polyfill');

const { makeNodeHttpServerDriver } = require('../src/index');
const { run } = require('@cycle/run');

const http = require('http');
const assert = require('assert');
const { makeFakeReadDriver } = require('./utils');
const { makeHTTPDriver } = require('@cycle/http');
const xs = require('xstream').default;

describe('cycle-node-http', function () {

    this.timeout(10000);

    it('http init with one distant call', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http$ = httpServer.createHttp([1983]).endWhen(fake);
            const httpServerReady$ = http$.take(1);

            const request$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const serverResponse$ = http$.drop(1).map(({ req, res }) => res.text('pouet'));

            const sinks = {
                fake: xs.merge(httpServerReady$, response$),
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
            }, done, 2)
        }
        run(main, drivers);

    });

});