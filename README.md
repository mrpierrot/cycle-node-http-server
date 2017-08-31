# Cycle Node Http Server

Driver and router component for manage HTTP/HTTPS services with Cycle.js

## Installation with NPM

`npm i cycle-node-http-serve --save`

## HTTP/HTTPS Driver

### `makeHttpServerDriver(config)`

Create the driver

**Arguments**

- `config` with specifics options
  - `middlewares : Array` : array of [express compatible middlewares](http://expressjs.com/en/guide/using-middleware.html)    like [serveStatic](https://github.com/expressjs/serve-static) or [bodyParser](https://github.com/expressjs/body-parser)
  - `render: (template) => template` : a template engine renderer, call with `req.response.render(template)`

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

### Create a HTTP Server Instance

To create a server instance, we need to send a config stream to the httpServer output.
Like this :

```js
   const httpCreate$ = xs.of({
        id: 'http',
        action: 'create',
        port: 1983
    });

    const sinks = {
       httpServer: httpCreate$
    }
```

**create action config:**

- `id` : the instance reference name. Needed to select the server stream on input.
- `action:'create'` : the action name
- `port` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `hostname` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `backlog` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `handle` : see [server.listen(handle[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_handle_callback)
- `path` : see [server.listen(path[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_path_callback)
- `secured` : set at true to create a HTTPS server.
- `securedOptions` : Needed if `secured`is `true` see [Node HTTPS createServer options](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
- `middlewares : Array` : array of [express compatible middlewares](http://expressjs.com/en/guide/using-middleware.html)    like [serveStatic](https://github.com/expressjs/serve-static) or [bodyParser](https://github.com/expressjs/body-parser)

**Basic example with HTTPS**

```js
     const securedOptions = {
          key: fs.readFileSync(`${__dirname}/certs/key.pem`),
          cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
     };

     const httpsCreate$ = xs.of({
        id: 'https',
        action: 'create',
        port: 1984,
        secured: true,
        securedOptions
    });

```

### Close server instance

To close a server instance we need to send a config stream to the httpServer output.

```js
   const httpClose$ = xs.of({
        id: 'http',
        action: 'close'
    });

    const sinks = {
       httpServer: httpClose$
    }
```

**create action config:**

- `id` : the instance reference name. Needed to select the server stream on input.
- `action:'close'` : the action name

### Select a server stream with `select(id)`

Select the server width this specific `id`

**Return Object**

```js
   const http = httpServer.select('http');
```

### Get events with `event(name)`

Get event with `name` stream from a `http`object.

```js
   const http = httpServer.select('http');
   const httpReady$ = http.events('ready');
   const httpRequest$ = http.events('request');
```
**Return Stream**

#### Event `ready`

Dispatched when the server is ready to listen.

**Returned values :**
- `event` : `'ready'`
- `instanceId` : The instance id
- `instance` : the original Node.js server object

#### Event `request`

Dispatched when the server received a request.
See `Request` object above.

### `Request` object

#### Properties

- `event` : `'request'`,
- `instanceId` : The instance id
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

##### `render()`

Format response with the render engine defined in `makeHttpServerDriver()` options.

##### `redirect()`

Format response redirection for driver output.

###### Arguments

- `path` : path to redirect
- `options` :
 - `statusCode` : default `302`
 - `headers` : default `null`
 - `statusMessage` : default `null`

**Return formatted object for driver output**

### Basic Usage

```js

const {run} = require('@cycle/run');
const {makeHttpServerDriver} = require('cycle-node-http-server');

function main(sources){

  const {httpServer} = sources;

  // get http source
  const http = httpServer.select('http');
  // get requests
  const serverRequest$ = http.events('request');

  const httpCreate$ = xs.of({
      id: 'http',
      action: 'create',
      port: 1983
  });

  // response formated with a helper response object
  // Response in text format : 'covfefe'
  const response$ = serverRequest$.map( req => req.response.text('covfefe') );

  const sinks = {
    httpServer: xs.merge(httpCreate$,response$)
  }
  return sinks;
}

const drivers = {
  httpServer: makeHttpServerDriver()
}

run(main,drivers)

```

## Routing

A Router component using [switch-path](https://github.com/staltz/switch-path)

**Arguments**

`Router(sources,routes)`

- `sources` :  Cycle.js sources object with a specific source `request$`, a stream of http(s) requests.
- `routes` : a collection of routes. See [switch-path](https://github.com/staltz/switch-path)

**Return stream**

### Example

```js
 const {makeHttpServerDriver, Router} = require('cycle-node-http-server');

 function main(sources) {
    const { httpServer } = sources;

    // get http source
    const http = httpServer.select('http');

    // create the http server
    const httpCreate$ = xs.of({
        id: 'http',
        action: 'create',
        port: 1983,
    });

    // get requests
    const serverRequest$ = http.events('request');

    // routing
    const router$ = Router({ request$: serverRequest$ }, {
        '/': sources => Page(Object.assign({}, sources, { props$: xs.of({ desc: 'home' }) })),
        '/user/:id': id => sources => Page(Object.assign({}, sources, { props$: xs.of({ desc: `user/${id}` }) })),
    });

    const sinks = {
        httpServer: xs.merge(httpCreate$, router$.map(c => c.httpServer).flatten()),
    };
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

## Cooking with middlewares

Here are discribed two usefull express middlewares.

### [serveStatic](https://github.com/expressjs/serve-static)

It is used to serve static files ( images, css, etc... )

**Basic usage**

```js
const serveStatic = require('serve-static');
const {makeHttpServerDriver} = require('cycle-node-http-server');

const drivers = {
  httpServer: makeHttpServerDriver({middlewares:[serveStatic('./public')]})
}

```

### [bodyParser](https://github.com/expressjs/body-parser)

It is used to parse request body and return a full formated body.

**Basic usage**

```js
const bodyParser = require('body-parser');
const {makeHttpServerDriver} = require('cycle-node-http-server');

const drivers = {
  httpServer: makeHttpServerDriver({
      middlewares: [
          // two parsers used to format body POST request in json
          bodyParser.urlencoded({ extended: true }),
          bodyParser.json()
      ]
  })
}

```

## Using [Snabbdom](https://github.com/snabbdom/snabbdom)

Snabbdom is the Virtual DOM using by @cycle/dom. It's possible to use it in server side with [snabbdom-to-html](https://github.com/snabbdom/snabbdom-to-html).

A small helper to use `snabbdom` with `cycle-node-http-server`

```js
  const snabbdomInit = require('snabbdom-to-html/init');
  const snabbdomModules = require('snabbdom-to-html/modules');
  const {makeHttpServerDriver} = require('cycle-node-http-server');

  export default function vdom(modules=[
          snabbdomModules.class,
          snabbdomModules.props,
          snabbdomModules.attributes,
          snabbdomModules.style
      ]){
      return snabbdomInit(modules);
  }

  const drivers = {
    httpServer: makeHttpServerDriver({
        render: vdom()
    })
  }

```
In `main` function, snabbdom used with JSX

```js
  const response$ = request$.map( req => req.response.render(
    <div>
      Pouet
    </div>
  ))

```

## License

**MIT**


