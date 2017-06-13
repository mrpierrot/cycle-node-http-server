
require('babel-polyfill');

const { makeNodeHttpServerDriver } = require('../src/driver');
const { Router } = require('../src/router');
const { run } = require('@cycle/run');

const http = require('http');
const assert = require('assert');
const { makeFakeReadDriver } = require('./utils');
const { makeHTTPDriver } = require('@cycle/http');
const xs = require('xstream').default;

describe('router', function () {

    this.timeout(10000);

    it('routing /user/21', function (done) {

        function Page(sources) {

            const { props$, request$ } = sources;

            const sinks = {
                httpServer: xs.combine(props$, request$).map(([props, req]) => req.response.text(props.desc))
            }

            return sinks;
        }

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http$ = httpServer.createHttp({ port: 1983 }).endWhen(fake);
            const httpServerReady$ = http$.take(1);
            const serverRequest$ = http$.drop(1);

            const router$ = Router({ ...sources, request$: serverRequest$ }, {
                '/': sources => Page({ ...sources, props$: xs.of({ desc: 'home' }) }),
                '/user/:id': id => sources => Page({ ...sources, props$: xs.of({ desc: `user/${id}` }) }),
            })

            const request$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1983/user/21',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: router$.map(c => c.httpServer).flatten(),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNodeHttpServerDriver(),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'user/21')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

});