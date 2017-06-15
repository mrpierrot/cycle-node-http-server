import http from 'http';
import https from 'https';
import xs from 'xstream';
import { createRequestWrapper } from './request';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

function applyMiddlewares(middlewares, req, res) {

    return new Promise((resolve, reject) => {

        const size = middlewares ? middlewares.length : 0;
        let i = -1;

        function next() {
            i++;
            if (i < size) {
                middlewares[i](req, res, next);
            } else {
                resolve();
            }
        }

        next();
    })
}

function createServerProducer(instanceId, listenOptions, middlewares, render, createServer) {
    let server;

    const listenArgs = typeof (listenOptions.handle) === 'object' ? listenOptions.handle :
        typeof (listenOptions.path) === 'string' ? listenOptions.path :
            [listenOptions.port, listenOptions.hostname, listenOptions.backlog]

    return {
        start(listener) {
            server = createServer((req, res) => applyMiddlewares(middlewares, req, res).then(() => {
                listener.next(createRequestWrapper(instanceId, req, res, render))
            }));
            server.listen.apply(server, [...listenArgs, () => {
                listener.next({
                    event: 'ready',
                    instanceId,
                    instance: server
                })
            }])
        },

        stop() {
            server.close();
        }
    }
}

function makeCreateAction(rootMiddlewares, render, stopAction$) {
    return function createAction({ id, secured, securedOptions, port, hostname, backlog, handle, path, middlewares=[] }) {
        const createServerFunc = secured ?
            (callback) => https.createServer(securedOptions, callback) :
            (callback) => http.createServer(callback);
        return xs.create(createServerProducer(id, { port, hostname, backlog, handle, path }, [...rootMiddlewares,...middlewares], render, createServerFunc))
            .endWhen(stopAction$.filter(o => o.id === id))
    }
}


function sendAction({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
    res.writeHead(statusCode, statusMessage || '', headers);
    res.end(content);
}

export function makeHttpServerDriver({ middlewares = [], render = data => data } = {}) {

    return function httpServerDriver(input$) {
        const closeAction$ = input$.filter(o => o.action === 'close');
        const createAction$ = input$.filter(o => o.action === 'create')
            .map(makeCreateAction(middlewares, render, closeAction$))
            .compose(flattenConcurrently);
        const sendAction$ = input$.filter(o => o.action === 'send').map(sendAction);

        sendAction$.addListener({
            next() { },
            complete() { },
            error() { }
        });

        return {
            select(instanceId) {
                return {
                    events(name) {
                        return createAction$.filter(o => o.instanceId === instanceId && o.event === name);
                    }
                }
            },
        }

    }
}