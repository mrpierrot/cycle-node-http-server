
require('babel-polyfill');

const { makeHttpServerDriver } = require('../src/driver');
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

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');

            const router$ = Router({ ...sources, request$: serverRequest$ }, {
                '/': sources => Page({ ...sources, props$: xs.of({ desc: 'home' }) }),
                '/user/:id': id => sources => Page({ ...sources, props$: xs.of({ desc: `user/${id}` }) }),
            })

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1983/user/21',
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
            })

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$,httpStop$,router$.map(c => c.httpServer).flatten()),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeHttpServerDriver(),
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