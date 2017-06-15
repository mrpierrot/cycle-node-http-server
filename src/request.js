import qs from 'querystring';
import xs from 'xstream';
import { createResponseWrapper } from './response';

export function createRequestWrapper(instanceId,req, res, render) {
    return {
        event:'request',
        instanceId,
        original: req,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        response: createResponseWrapper(instanceId,res, render)
    }
}