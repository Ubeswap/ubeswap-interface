import { useWeb3React } from '@web3-react/core'
import { valora } from 'connectors/index'
import { useEffect, useState } from 'react'
import { useValoraAccount } from 'state/user/hooks'

import { ValoraConnector } from './ValoraConnector'
import { valoraEmitter } from './valoraUtils'

/**
 * useValora handles connecting to Valora
 */
export const useValora = () => {
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
  const { activate, account: injectedAccount, connector } = useWeb3React()
  const { account: savedValoraAccount } = useValoraAccount()
  const [isValoraLoading, setIsValoraLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
    }
    // if there is already a connector, return
    if (connector && !(connector instanceof ValoraConnector)) {
      return
    }
    // if no connector:
    // if there is a cached valora account and this is the initial page load, load it
    if (isInitialLoad && !injectedAccount && savedValoraAccount) {
      valora.setSavedValoraAccount(savedValoraAccount)
      activate(valora, undefined, true).catch((error) => {
        console.error('[Valora Activation error]', error)
        alert(`Error connecting to Valora: ${error.message}`)
      })
    }
  }, [connector, injectedAccount, savedValoraAccount, activate, isInitialLoad])

  // listen to valora loading
  useEffect(() => {
    valoraEmitter.on('wait', () => {
      setIsValoraLoading(true)
    })
    valoraEmitter.on('done', () => {
      setIsValoraLoading(false)
    })
    return () => {
      valoraEmitter.off('wait')
      valoraEmitter.off('done')
    }
  }, [])

  return { isValoraLoading }
}
