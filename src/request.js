import qs from 'querystring';
import xs from 'xstream';
import { createResponseWrapper } from './response';

export function createRequestWrapper(req, res) {
    return {
        original: req,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        response: createResponseWrapper(res)
    }
}