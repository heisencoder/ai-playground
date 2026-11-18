import { errorMessage } from '../core/errors'
import type { HttpRequest, HttpResponse, Transport } from '../drive/client'
import { NO_RESPONSE } from '../drive/client'

const METHODS = { GET: 'get', POST: 'post', PATCH: 'patch' } as const
/** Well under the six-minute execution limit, so one hung call cannot use it up. */
const TIMEOUT_SECONDS = 120

/**
 * Sends Drive API requests with `UrlFetchApp`, authorised as the person running
 * the script. `muteHttpExceptions` makes error responses come back as values,
 * so the client can read the status code and decide whether to retry. A request
 * that gets no response at all (DNS failure, timeout) still throws; that is
 * reported as status 0 so it is handled like any other failed call.
 */
export const urlFetchTransport: Transport = (
  request: HttpRequest
): HttpResponse => {
  const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: METHODS[request.method],
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
    timeoutSeconds: TIMEOUT_SECONDS,
  }
  if (request.body !== undefined) {
    params.contentType = 'application/json'
    params.payload = request.body
  }
  try {
    const response = UrlFetchApp.fetch(request.url, params)
    return {
      status: response.getResponseCode(),
      body: response.getContentText(),
    }
  } catch (error) {
    const message = errorMessage(error)
    return {
      status: NO_RESPONSE,
      body: JSON.stringify({ error: { message: `No response: ${message}` } }),
    }
  }
}
