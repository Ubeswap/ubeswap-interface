import {
  AccountAuthRequest,
  AccountAuthResponse,
  AccountAuthResponseSuccess,
  DappKitResponse,
  DappKitResponseStatus,
  parseDappkitResponseDeeplink,
  serializeDappKitRequestDeeplink,
  SignTxRequest,
  SignTxResponse,
  SignTxResponseSuccess,
  TxToSignParam,
} from '@celo/utils'
import { identity, mapValues } from 'lodash'
import * as querystring from 'querystring'

// much code stolen from here: https://github.com/celo-tools/use-contractkit/blob/429fca00a0521e3a69f64b497b91a092b30e31c4/packages/use-contractkit/src/dappkit-wallet/dappkit.ts

const localStorageKey = 'ubeswap/valora-cache'
// hack to get around deeplinking issue where new tabs are opened
// and the url hash state is not respected (Note this implementation
// of dappkit doesn't use URL hashes to always force the newtab experience).
if (typeof window !== 'undefined') {
  const params = new URL(window.location.href).searchParams
  if (params.get('type') && params.get('requestId')) {
    localStorage.setItem(localStorageKey, window.location.href)
    window.close()
  }
}

// Gets the url redirected from Valora that is used to update the page
async function waitForValoraResponse() {
  while (true) {
    const value = localStorage.getItem(localStorageKey)
    if (value) {
      localStorage.removeItem(localStorageKey)
      return value
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/**
 * Parses the response from Dappkit.
 * @param url
 */
export const parseDappkitResponse = <T extends DappKitResponse>(
  url: string
):
  | (T & {
      requestId: string
    })
  | null => {
  const whereQuery = url.lastIndexOf('?')
  if (whereQuery === -1) {
    return null
  }
  const newQs = querystring.parse(url.slice(whereQuery + 1))
  const realQs = querystring.stringify(newQs)
  const { protocol, host } = new URL(url)
  const result = parseDappkitResponseDeeplink(`${protocol}//${host}/?${realQs}`)
  if (!result.requestId) {
    return null
  }
  return result as T & {
    requestId: string
  }
}

export const removeQueryParams = (url: string, keys: string[]): string => {
  const whereQuery = url.lastIndexOf('?')
  if (whereQuery === -1) {
    return url
  }
  const newQs = querystring.parse(url.slice(whereQuery + 1))
  keys.forEach((key) => {
    delete newQs[key]
  })
  const { protocol, host, hash } = new URL(url)
  const queryParams = `${querystring.stringify(newQs)}`
  const resultUrl = `${protocol}//${host}/${hash?.slice(0, hash.indexOf('?'))}`
  if (queryParams) {
    return `${resultUrl}?${queryParams}`
  }
  return resultUrl
}

const cleanCallbackUrl = (url: string): string => {
  return removeQueryParams(url, [])
}

/**
 * Requests auth from the Valora app.
 */
export const requestValoraAuth = async (): Promise<AccountAuthResponseSuccess> => {
  const requestId = 'login'
  const dappName = 'Ubeswap'
  const callback = cleanCallbackUrl(window.location.href)
  window.location.href = serializeDappKitRequestDeeplink(
    AccountAuthRequest({
      requestId,
      dappName,
      callback,
    })
  )
  window.location.href = await waitForValoraResponse()
  const resp = parseDappkitResponse<AccountAuthResponse>(window.location.href)
  if (resp?.status === DappKitResponseStatus.SUCCESS) {
    return resp
  }
  throw new Error('could not connect account')
}

/**
 * Requests auth from the Valora app.
 */
export const requestValoraTransaction = async (txs: TxToSignParam[]): Promise<SignTxResponseSuccess> => {
  const requestId = 'make-transaction'
  const dappName = 'Ubeswap'
  const callback = cleanCallbackUrl(window.location.href)
  window.location.href = serializeDappKitRequestDeeplink(
    SignTxRequest(txs, {
      requestId,
      dappName,
      callback,
    })
  )
  window.location.href = await waitForValoraResponse()
  const resp = parseDappkitResponse<SignTxResponse>(window.location.href)
  if (resp?.status === DappKitResponseStatus.SUCCESS) {
    return resp
  }
  throw new Error('could not perform transaction')
}

export type IValoraAccount = Pick<AccountAuthResponseSuccess, 'address' | 'phoneNumber'>
