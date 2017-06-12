
require('babel-polyfill');

const { makeNodeHttpServerDriver } = require('../src/index');
const { run } = require('@cycle/run');
const xs = require('xstream').default;
const _ = require('lodash');
const http = require('http');
const assert = require('assert');

const fakeReadDriver = function makeFakeReadDriver(callback, done, count = -1) {
    return function fakeReadDriver(events$) {
        let i = 0;
        const obj = {
            next: outgoing => {
                callback(outgoing, i++,complete);
                if(finish)finish();
            },
            error: () => { },
            complete: () => { },
        }

        let _listener = null;

        const producer = {
            start(listener) {
                _listener = listener;
            },

            stop() {
                _listener = null;
            }
        }

        const complete = () => {
            events$.removeListener(obj);
            if (_listener) {
                _listener.next(true);
            } else {
                console.warn('No listener found for fake driver')
            }
            if(done)done();
        }
  
        const finish = (count > 0)?_.after(count,complete ):null;
        
        events$.addListener(obj);

        return xs.create(producer)
    }
}

describe('cycle-node-http', function () {
    
    this.timeout(10000);

    it('http', function (done) {

        function main(sources) {

            const { httpServer,fake } = sources;

            const http$ = httpServer.createHttp([1983]).endWhen(fake);

            const response$ = http$.drop(1).map(({req,res}) => res.text('pouet'));

            const sinks = {
                fake: http$.take(1),
                httpServer:response$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNodeHttpServerDriver(),
            fake: fakeReadDriver((outgoing,i,complete)=>{
                http.get({port:1983},(response) => {
                    let body = '';
                    response.on('data', function(d) {
                        body += d;
                    });
                    response.on('end', function() {
                        assert.equal('pouet',body);
                        complete();
                    });
                    
                })
            },done)
        }
        run(main, drivers);

    });

});