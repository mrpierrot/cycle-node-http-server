import http from 'http';
import https from 'https';
import xs from 'xstream';
import { createResponseWrapper } from './response';
import { createRequestWrapper } from './request';

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

function createServerProducer(listenOptions, middlewares, createServer) {
    let server;

    const listenArgs = typeof(listenOptions.handle)==='object'?listenOptions.handle:
                       typeof(listenOptions.path)==='string'?listenOptions.path:
                       [listenOptions.port,listenOptions.hostname,listenOptions.backlog]

    return {
        start(listener) {
            server = createServer((req, res) => applyMiddlewares(middlewares, req, res).then(() => {
                listener.next({
                    req: createRequestWrapper(req),
                    res: createResponseWrapper(res)
                })
            }));
            server.listen.apply(server, [...listenArgs, () => {
                listener.next({
                    instance:server
                })
            }])
        },

        stop() {
            server.close();
        }
    }
}

export function makeNodeHttpServerDriver({ middlewares = [] }={}) {

    return function nodeHttpServerDriver(input$) {

        input$.addListener({
            next({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
                res.writeHead(statusCode, statusMessage || '', headers);
                res.end(content);
            },
            complete() {

            },
            error() {

            }
        })

        return {
            createHttp(listenOptions={port:null,hostname:null,backlog:null,handle:null,path:null}) {
                return xs.create(createServerProducer(listenOptions, middlewares, (callback) => http.createServer(callback)))
            },
            createHttps(listenOptions={port:null,hostname:null,backlog:null,handle:null,path:null}, secureOptions) {
                return xs.create(createServerProducer(listenOptions, middlewares, (callback) => https.createServer(secureOptions, callback)))
               
            }
        }
    }
}