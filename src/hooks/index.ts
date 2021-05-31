import { Web3Provider } from '@ethersproject/providers'
import { ChainId } from '@ubeswap/sdk'
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'

import { NETWORK_CHAIN_ID } from '../connectors'
import { NetworkContextName } from '../constants'

export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId: ChainId } {
  const context = useWeb3ReactCore<Web3Provider>()
  const contextNetwork = useWeb3ReactCore<Web3Provider>(NetworkContextName)
  return {
    ...(context.active ? context : contextNetwork),
    chainId: NETWORK_CHAIN_ID,
  }
}
