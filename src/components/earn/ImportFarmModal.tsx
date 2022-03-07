import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { getAddress } from '@ethersproject/address'
import { formatEther } from '@ethersproject/units'
import { ChainId as UbeswapChainId, cUSD, Token, TokenAmount } from '@ubeswap/sdk'
import { ButtonError } from 'components/Button'
import { LightCard } from 'components/Card'
import { PaddedColumn, SearchInput, Separator } from 'components/SearchModal/styleds'
import MOOLA_STAKING_ABI from 'constants/abis/moola/MoolaStakingRewards.json'
import { Bank } from 'constants/homoraBank'
import { BigNumber, ContractInterface, ethers } from 'ethers'
import { MoolaStakingRewards } from 'generated'
import { useAllTokens, useCurrency } from 'hooks/Tokens'
import { useMultiStakingContract, useStakingContract } from 'hooks/useContract'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Text } from 'rebass'
import { useSingleCallResult } from 'state/multicall/hooks'
import styled, { ThemeContext } from 'styled-components'
import { getProviderOrSigner } from 'utils'
import { isAddress } from 'web3-utils'

import { BIG_INT_SECONDS_IN_WEEK } from '../../constants'
import COREORACLE_ABI from '../../constants/abis/CoreOracle.json'
import BANK_ABI from '../../constants/abis/HomoraBank.json'
import PROXYORACLE_ABI from '../../constants/abis/ProxyOracle.json'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { ProxyOracle } from '../../generated/ProxyOracle'
import { CloseIcon, TYPE } from '../../theme'
import Column, { AutoColumn } from '../Column'
import Modal from '../Modal'
import Row, { RowBetween } from '../Row'

const ContentWrapper = styled(Column)`
  width: 100%;
  flex: 1 1;
  position: relative;
  padding: 0 0.6rem 0.6rem 0.6rem;
`

interface ImportFarmModalProps {
  isOpen: boolean
  onDismiss: () => void
  farmSummaries: FarmSummary[]
}

const EXTERNAL_FARMS_LIMIT = 5

export default function ImportFarmModal({ isOpen, onDismiss, farmSummaries }: ImportFarmModalProps) {
  const inputRef = useRef<HTMLInputElement>()
  const theme = useContext(ThemeContext)
  const [farmAddress, setFarmAddress] = useState<string>('')
  const { address: account, network } = useContractKit()
  const { chainId } = network
  const library = useProvider()
  const provider = getProviderOrSigner(library, account ? account : undefined)
  const tokens = useAllTokens()
  const cusd = cUSD[chainId as unknown as UbeswapChainId]
  const [scale, setScale] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const farmExists = isAddress(farmAddress)
    ? farmSummaries.find(
        (farmSummary) => farmAddress && getAddress(farmSummary.stakingAddress) === getAddress(farmAddress)
      )
    : undefined

  const stakingContract = useStakingContract(isAddress(farmAddress) ? farmAddress : '')
  const multiStakingContract = useMultiStakingContract(isAddress(farmAddress) ? farmAddress : '')
  const [externalRewardsTokens, setExternalRewardsTokens] = useState<Array<string>>([])
  const [externalRewardsRates, setExternalRewardsRates] = useState<Array<BigNumber>>([])

  const bank = useMemo(
    () => new ethers.Contract(Bank[chainId], BANK_ABI.abi as ContractInterface, provider) as unknown as HomoraBank,
    [chainId, provider]
  )

  function wrappedOndismiss() {
    onDismiss()
  }

  const handleInput = useCallback((event) => {
    const input = event.target.value
    setFarmAddress(input)
  }, [])

  useEffect(() => {
    if (isAddress(farmAddress)) {
      setExternalRewardsTokens([])
      setScale(undefined)
      const importedFarms = localStorage.getItem('imported_farms')
      const res = importedFarms
        ? [...JSON.parse(importedFarms)].find((item) => getAddress(item) === getAddress(farmAddress))
        : undefined
      setError(res ? 'The farm has already been imported' : undefined)
    } else {
      if (farmAddress.length > 0) {
        setError('Enter valid farm address')
      } else {
        setError(undefined)
      }
    }
  }, [farmAddress])

  useEffect(() => {
    const fetchMultiStaking = async () => {
      try {
        if (!multiStakingContract) return
        const tokens = []
        const rates = []
        let stakingRewardsAddress = await multiStakingContract.externalStakingRewards()
        for (let i = 0; i < EXTERNAL_FARMS_LIMIT; i += 1) {
          const moolaStaking = new ethers.Contract(
            stakingRewardsAddress,
            MOOLA_STAKING_ABI as ContractInterface,
            provider
          ) as unknown as MoolaStakingRewards
          const externalRewardsToken = await multiStakingContract.externalRewardsTokens(BigNumber.from(i))
          const rewardRate = await moolaStaking.rewardRate()
          tokens.push(externalRewardsToken)
          rates.push(rewardRate)
          setExternalRewardsTokens(tokens)
          setExternalRewardsRates(rates)
          stakingRewardsAddress = await moolaStaking.externalStakingRewards()
        }
      } catch (err) {
        console.log(err)
      }
    }
    fetchMultiStaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiStakingContract])

  const totalSupply = useSingleCallResult(stakingContract, 'totalSupply', [])?.result?.[0]
  let arrayOfRewardsTokenAddress = useSingleCallResult(stakingContract, 'rewardsToken', [])?.result
  arrayOfRewardsTokenAddress = arrayOfRewardsTokenAddress
    ? [...arrayOfRewardsTokenAddress, ...externalRewardsTokens]
    : externalRewardsTokens
  const stakingTokenAddress = useSingleCallResult(stakingContract, 'stakingToken', [])?.result?.[0]
  let rewardRates = useSingleCallResult(stakingContract, 'rewardRate', [])?.result
  rewardRates = rewardRates ? [...rewardRates, ...externalRewardsRates] : externalRewardsRates
  const stakingToken = useCurrency(stakingTokenAddress)
  const rewardsTokens = arrayOfRewardsTokenAddress
    ? arrayOfRewardsTokenAddress?.map((rewardsTokenAddress) =>
        tokens && tokens[rewardsTokenAddress]
          ? tokens[rewardsTokenAddress]
          : new Token(chainId as number, rewardsTokenAddress, 18)
      )
    : undefined

  useEffect(() => {
    const getStakingCusdPrice = async () => {
      if (!stakingToken || !cusd || !bank) {
        setScale(undefined)
        return
      }
      try {
        const oracle = await bank.oracle()
        const proxyOracle = new ethers.Contract(
          oracle,
          PROXYORACLE_ABI.abi as ContractInterface,
          provider
        ) as unknown as ProxyOracle
        const source = await proxyOracle.source()
        const coreOracle = new ethers.Contract(
          source,
          COREORACLE_ABI.abi as ContractInterface,
          provider
        ) as unknown as CoreOracle
        const stakingCeloPrice = await coreOracle.getCELOPx(stakingToken?.address)
        const cusdCeloPrice = await coreOracle.getCELOPx(cusd.address)
        setScale(Number(formatEther(stakingCeloPrice)) / Number(formatEther(cusdCeloPrice)))
      } catch (err) {
        console.error(err)
        setScale(undefined)
      }
    }
    getStakingCusdPrice()
  }, [bank, provider, cusd, stakingToken])

  const totalRewardRates = rewardsTokens
    ? rewardsTokens.map((rewardsToken, i) =>
        rewardsToken && rewardRates && rewardRates[i] ? new TokenAmount(rewardsToken, rewardRates[i]) : undefined
      )
    : undefined

  const valueOfTotalStakedAmountInCUSD =
    totalSupply && scale ? (Number(formatEther(totalSupply)) * scale).toFixed() : undefined

  const onConfirm = () => {
    const importedFarms = localStorage.getItem('imported_farms')
    localStorage.setItem(
      'imported_farms',
      JSON.stringify(importedFarms ? [...JSON.parse(importedFarms), farmAddress] : [farmAddress])
    )
    wrappedOndismiss()
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      <ContentWrapper gap="lg">
        <PaddedColumn gap="16px">
          <RowBetween>
            <Text fontWeight={500} fontSize={16}>
              Import Farm
            </Text>
            <CloseIcon onClick={wrappedOndismiss} />
          </RowBetween>
          <Row>
            <SearchInput
              type="text"
              id="token-search-input"
              placeholder={'Input or Paste Farm Address'}
              autoComplete="off"
              value={farmAddress}
              ref={inputRef as RefObject<HTMLInputElement>}
              onChange={handleInput}
            />
          </Row>
        </PaddedColumn>
        <Separator />
        <LightCard padding="1rem" borderRadius={'1px'}>
          <AutoColumn gap={'14px'}>
            <AutoColumn justify="space-between">
              <RowBetween>
                <TYPE.black>Staking Token</TYPE.black>
                <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                  {stakingToken?.symbol}
                </Text>
              </RowBetween>
            </AutoColumn>
            <AutoColumn justify="center">
              <RowBetween>
                <TYPE.black>Total Deposits</TYPE.black>
                <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                  {valueOfTotalStakedAmountInCUSD
                    ? Number(valueOfTotalStakedAmountInCUSD).toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      })
                    : '-'}
                </Text>
              </RowBetween>
            </AutoColumn>
            <AutoColumn justify="center">
              <RowBetween align={'start'}>
                <TYPE.black>Rewards Token{rewardsTokens && rewardsTokens.length > 0 ? 's' : ''}</TYPE.black>
                <AutoColumn justify="end">
                  {rewardsTokens ? (
                    rewardsTokens.map((rewardsToken, index) => (
                      <Text key={index} fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                        {rewardsToken.symbol}
                      </Text>
                    ))
                  ) : (
                    <Text> - </Text>
                  )}
                </AutoColumn>
              </RowBetween>
            </AutoColumn>
            <AutoColumn justify="center">
              <RowBetween align={'start'}>
                <TYPE.black>Pool Rate</TYPE.black>
                <AutoColumn justify="end">
                  {totalRewardRates && rewardsTokens && totalRewardRates.length ? (
                    totalRewardRates.map((data, index) => (
                      <Text key={index} fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                        {data
                          ? data.multiply(BIG_INT_SECONDS_IN_WEEK)?.toSignificant(4, { groupSeparator: ',' }) +
                            rewardsTokens[index].symbol +
                            ' / Week'
                          : '-'}
                      </Text>
                    ))
                  ) : (
                    <Text>-</Text>
                  )}
                </AutoColumn>
              </RowBetween>
            </AutoColumn>
          </AutoColumn>
        </LightCard>
        <ButtonError
          disabled={
            !!error ||
            !!farmExists ||
            !valueOfTotalStakedAmountInCUSD ||
            !rewardsTokens ||
            !totalRewardRates ||
            !stakingToken
          }
          error={!!farmExists || !!error}
          onClick={onConfirm}
        >
          {error ? error : farmExists ? 'The Farm Already Exists' : 'Import Farm'}
        </ButtonError>
      </ContentWrapper>
    </Modal>
  )
}
