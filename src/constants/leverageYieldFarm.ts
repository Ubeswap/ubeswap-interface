import { ChainId, Token } from '@ubeswap/sdk'
import { getAddress } from 'ethers/lib/utils'

export const Bank: Record<number, string> = {
  [ChainId.MAINNET]: getAddress('0x827cCeA3D460D458393EEAfE831698d83FE47BA7'),
  [ChainId.ALFAJORES]: getAddress('0x000531a6B61550cfADb637a625A00236fcDD1bDB'),
  [ChainId.BAKLAVA]: getAddress('0x000531a6B61550cfADb637a625A00236fcDD1bDB'),
}

export interface Farm {
  name: string
  spell: string
  wrapper: string
  lp: string
  tokens: Token[]
}

export const FARMS = [
  {
    name: 'CELO-MOBI',
    wrapper: getAddress('0xFab4224Ce8E71e2f8F95f63a088d828d5B570e12'),
    spell: getAddress('0x7B775b2AF169D1249db545Cd89754D3C70FAd069'),
    lp: getAddress('0x0b81cf47c8f97275d14c006e537d5101b6c87300'),
    tokens: [
      new Token(ChainId.MAINNET, getAddress('0x471ece3750da237f93b8e339c536989b8978a438'), 18, 'CELO', 'Celo'),
      new Token(ChainId.MAINNET, getAddress('0x73a210637f6F6B7005512677Ba6B3C96bb4AA44B'), 18, 'MOBI', 'Mobius'),
    ],
  },
  {
    name: 'CELO-UBE',
    wrapper: getAddress('0x1B9dF6fd569778f48E7db3eB000C93a80920EA23'),
    spell: getAddress('0x7B775b2AF169D1249db545Cd89754D3C70FAd069'),
    lp: getAddress('0xe7b5ad135fa22678f426a381c7748f6a5f2c9e6c'),
    tokens: [
      new Token(ChainId.MAINNET, getAddress('0x00Be915B9dCf56a3CBE739D9B9c202ca692409EC'), 18, 'UBE', 'Ubeswap'),
      new Token(ChainId.MAINNET, getAddress('0x471ece3750da237f93b8e339c536989b8978a438'), 18, 'CELO', 'Celo'),
    ],
  },
]
