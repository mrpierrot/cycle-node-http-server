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
    return {
        start(listener) {
            server = createServer((req, res) => applyMiddlewares(middlewares, req, res).then(() => {
                listener.next({
                    req: createRequestWrapper(req),
                    res: createResponseWrapper(res)
                })
            }));
            server.listen.apply(server, [...listenOptions, () => {
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
            createHttp(listenOptions) {
                return xs.create(createServerProducer(listenOptions, middlewares, (callback) => http.createServer(callback)))
            },
            createHttps(listenOptions, secureOptions) {
                return xs.create(createServerProducer(listenOptions, middlewares, (callback) => http.createServer(secureOptions, callback)))
            }
        }
    }
}