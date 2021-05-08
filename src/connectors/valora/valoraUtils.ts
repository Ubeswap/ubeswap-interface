import { ContractKit } from '@celo/contractkit'
import {
  AccountAuthResponseSuccess,
  DappKitResponse,
  parseDappkitResponseDeeplink,
  SignTxResponseSuccess,
  TxToSignParam,
} from '@celo/utils'
import {
  requestAccountAddress,
  requestTxSig,
  waitForAccountAuth,
  waitForSignedTxs,
} from '@celo-tools/use-contractkit/lib/dappkit-wallet/dappkit'
import EventEmitter from 'eventemitter3'
import { identity } from 'lodash'
import * as querystring from 'querystring'

/**
 * Parses the response from Dappkit.
 * @param url
 */
export const parseDappkitResponse = (
  url: string
):
  | (DappKitResponse & {
      requestId: string
    })
  | null => {
  const whereQuery = url.indexOf('?')
  if (whereQuery === -1) {
    return null
  }
  const searchNonDeduped = url.slice(whereQuery + 1)
  const allSearch = searchNonDeduped.split('?')
  const newQs = allSearch.filter(identity).reduce((acc, qs) => ({ ...acc, ...querystring.parse(qs) }), {})
  const realQs = querystring.stringify(newQs)
  const { protocol, host } = new URL(url)
  const result = parseDappkitResponseDeeplink(`${protocol}//${host}/?${realQs}`)
  if (!result.requestId) {
    return null
  }
  return result
}

/**
 * Manages events passed through Valora
 */
export const valoraEmitter = new EventEmitter()

/**
 * Requests auth from the Valora app.
 */
export const requestValoraAuth = async (): Promise<AccountAuthResponseSuccess> => {
  const requestId = `login-${randomString()}`
  requestAccountAddress({
    requestId,
    dappName: 'Ubeswap',
    callback: window.location.href,
  })
  return await waitForAccountAuth(requestId)
}

const randomString = () => (Math.random() * 100).toString().slice(0, 6)

/**
 * Requests a transaction from the Valora app.
 */
export const requestValoraTransaction = async (
  kit: ContractKit,
  txs: TxToSignParam[]
): Promise<SignTxResponseSuccess> => {
  const requestId = `signTransaction-${randomString()}`
  await requestTxSig(kit, txs, {
    requestId,
    dappName: 'Ubeswap',
    callback: window.location.href,
  })
  return await waitForSignedTxs(requestId)
}

export type IValoraAccount = Pick<AccountAuthResponseSuccess, 'address' | 'phoneNumber'>
