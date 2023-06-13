import { useContractKit } from '@celo/react-celo'

import { useAsyncState } from './useAsyncState'

export const useLatestBlockNumber = () => {
  const { kit } = useContractKit()
  return useAsyncState(0, kit.connection.web3.eth.getBlockNumber)
}
