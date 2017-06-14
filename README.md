# cycle-node-http-server

Driver and routing component for manage HTTP/HTTPS services with Cycle.js

## Installation with NPM

`npm i cycle-node-http-serve --save`

## HTTP/HTTPS Driver

### `makeHttpServerDriver(config)`

create the driver

**Arguments**

- `config` with specifics options
  - `middlewares :Array` : array of [express compatible middlewares](http://expressjs.com/en/guide/using-middleware.html)    like [serveStatic](https://github.com/expressjs/serve-static) or [bodyParser](https://github.com/expressjs/body-parser)
  - `render: (template) => template` : a template engine renderer, call with `res.response.render(template)`

#### Basic usage

```js

const {run} = require('@cycle/run');
const {makeHttpServerDriver} = require('cycle-node-http-server');

function main(sources){

  const {httpServer} = sources;

  const sinks = {
    
  }
  return sinks;
}

const drivers = {
  httpServer: makeHttpServerDriver()
}

run(main,drivers)

```

### `httpServer.createHttp()` get the http server stream.

**Arguments:**

- `listenOptions` with specifics options
  - `port` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `hostname` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `backlog` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `handle` : see [server.listen(handle[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_handle_callback)
  - `path` : see [server.listen(path[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_path_callback)

**return : Stream**. The first element send is the server ready event. Nexts elements are requests.

#### Basic Usage

```js

const {run} = require('@cycle/run');
const {makeHttpServerDriver} = require('cycle-node-http-server');

function main(sources){

  const {httpServer} = sources;
  // listen http request from port 1983
  const http$ = httpServer.createHttp({port:1983});
  // The first element is the ready event
  const httpReady$ = http$.take(1);
  // Others are requests
  const request$ = http$.drop(1);
  
  // response formated with a helper response object
  // Response in text format : 'covfefe'
  const response$ = request$.map( req => req.response.text('covfefe') );

  const sinks = {
    httpServer: response$
  }
  return sinks;
}

const drivers = {
  httpServer: makeHttpServerDriver()
}

run(main,drivers)

```

### `httpServer.createHttps()` get the secure https server stream.

**Arguments:**

- `listenOptions` with specifics options
  - `port` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `hostname` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `backlog` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
  - `handle` : see [server.listen(handle[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_handle_callback)
  - `path` : see [server.listen(path[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_path_callback)
- `secureOptions` : see [Node HTTPS createServer options](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)

**return : Stream**. The first element send is the server ready event. Nexts elements are requests.

```js

const {run} = require('@cycle/run');
const {makeHttpServerDriver} = require('cycle-node-http-server');
const fs = require('fs')

const httpsOptions = {
    key: fs.readFileSync(`${__dirname}/certs/key.pem`),
    cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};

function main(sources){

  const {httpServer} = sources;
  // listen http request from port 1983
  const https$ = httpServer.createHttps({port:1983},httpsOptions);
  
  ...
}

...
```

### `Request` object

#### Properties

- `original` : original NodeJS request object,
- `url` : request's url,
- `method` : request's method (POST,GET,PUT, etc...),
- `headers` : request's headers,
- `body` : the body request. `undefined`by default. See [BodyParser middleware](https://github.com/expressjs/body-parser)
- `response` : the response object

### `Response`object

#### Methods

##### `send()` 

Format response for driver output.

###### Arguments

- `content` : the body response
- `options` :
 - `statusCode` : default `200`
 - `headers` : default `null`
 - `statusMessage` : default `null`
  
**Return formatted object for driver output**

##### `json()`

Format response in json.
See `send()`

##### `text()`

Format response in plain text.
See `send()`

##### `html()`

Format response in html.
See `send()`

##### `redirect()` 

Format response redirection for driver output.

###### Arguments

- `path` : path to redirect
- `options` :
 - `statusCode` : default `302`
 - `headers` : default `null`
 - `statusMessage` : default `null`
  
**Return formatted object for driver output**

## Routing

A Router component using [switch-path](https://github.com/staltz/switch-path)

Documentation coming soon.

### Example

```js
 function main(sources) {

    const { httpServer } = sources;

    const http$ = httpServer.createHttp({ port: 1983 }).endWhen(fake);
    const httpServerReady$ = http$.take(1);
    const serverRequest$ = http$.drop(1);

    const router$ = Router({ ...sources, request$: serverRequest$ }, {
        '/': sources => Page({ ...sources, props$: xs.of({ desc: 'home' }) }),
        '/user/:id': id => sources => Page({ ...sources, props$: xs.of({ desc: `user/${id}` }) }),
    })

    const sinks = {
        httpServer: router$.map(c => c.httpServer).flatten(),
    }
    return sinks;
}

 function Page(sources) {

    const { props$, request$ } = sources;

    const sinks = {
        httpServer: xs.combine(props$, request$).map(([props, req]) => req.response.text(props.desc))
    }

    return sinks;
}
```
