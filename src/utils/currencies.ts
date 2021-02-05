import { Token } from '@uniswap/sdk'

export enum CeloChainId {
  mainnet = 42220
}

export const CUSD = new Token(
  CeloChainId.mainnet as number,
  '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  18,
  'cUSD',
  'Celo Dollar'
)

export const CGLD = new Token(
  CeloChainId.mainnet as number,
  '0x471EcE3750Da237f93B8E339c536989b8978a438',
  18,
  'cGLD',
  'Celo Gold'
)
