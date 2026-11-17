import type { HttpRequest, HttpResponse, Transport } from '../drive/client'

const METHODS = { GET: 'get', POST: 'post', PATCH: 'patch' } as const

/**
 * Sends Drive API requests with `UrlFetchApp`, authorised as the person running
 * the script. `muteHttpExceptions` makes error responses come back as values,
 * so the client can read the status code and decide whether to retry.
 */
export const urlFetchTransport: Transport = (
  request: HttpRequest
): HttpResponse => {
  const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: METHODS[request.method],
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  }
  if (request.body !== undefined) {
    params.contentType = 'application/json'
    params.payload = request.body
  }
  const response = UrlFetchApp.fetch(request.url, params)
  return {
    status: response.getResponseCode(),
    body: response.getContentText(),
  }
}
