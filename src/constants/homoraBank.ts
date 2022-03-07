import { ChainId } from '@ubeswap/sdk'
import { getAddress } from 'ethers/lib/utils'

export const Bank: Record<number, string> = {
  [ChainId.MAINNET]: getAddress('0x827cCeA3D460D458393EEAfE831698d83FE47BA7'),
  [ChainId.ALFAJORES]: getAddress('0x000531a6B61550cfADb637a625A00236fcDD1bDB'),
  [ChainId.BAKLAVA]: getAddress('0x000531a6B61550cfADb637a625A00236fcDD1bDB'),
}
