import switchPath from 'switch-path';
import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

export function Router(sources, routes = {}) {

    const { request$ } = sources;

    return request$.map(req => {
        const { path, value } = switchPath(req.url, routes);
        return value({ ...sources, request$: xs.of(req) })
    });
}