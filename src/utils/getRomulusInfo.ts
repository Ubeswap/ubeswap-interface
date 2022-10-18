import { Address } from '@celo/contractkit'
import { providers, Signer } from 'ethers'
import { RomulusDelegate, RomulusDelegate__factory } from 'generated'

interface RomulusInfo {
  romulus: RomulusDelegate
  releaseTokenAddress: Address
  tokenAddress: Address
}

export const getRomulusInfo = async (
  romulusAddress: Address,
  signerOrProvider: providers.Provider | Signer
): Promise<RomulusInfo> => {
  const romulus: RomulusDelegate = RomulusDelegate__factory.connect(romulusAddress, signerOrProvider)
  return {
    romulus,
    releaseTokenAddress: await romulus.releaseToken(),
    tokenAddress: await romulus.token(),
  }
}
