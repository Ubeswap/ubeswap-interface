import { ChainId, useContractKit } from '@celo/react-celo'

export const useIsSupportedNetwork = () => {
  const { network } = useContractKit()

  return [ChainId.Mainnet, ChainId.Alfajores].includes(network.chainId)
}
