import qs from 'querystring';
import xs from 'xstream';

export function createRequestWrapper(original) {
    return {
        original,
        url:original.url,
        method:original.method,
        headers: original.headers,
        body:original.body

    }
}