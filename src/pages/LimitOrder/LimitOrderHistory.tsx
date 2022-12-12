import { useContractKit } from '@celo-tools/use-contractkit'
import { ChainId as UbeswapChainId } from '@ubeswap/sdk'
import { ButtonLight, TabButton } from 'components/Button'
import { ColumnCenter } from 'components/Column'
import LimitOrderHistoryBody from 'components/LimitOrderHistory/LimitOrderHistoryBody'
import LimitOrderHistoryHead, { HistoryColumn } from 'components/LimitOrderHistory/LimitOrderHistoryHead'
import { useToken } from 'hooks/Tokens'
import { useOrderBookRewardDistributorContract } from 'hooks/useContract'
import React, { useState } from 'react'
import { Archive } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { useWalletModalToggle } from 'state/application/hooks'
import { useSingleCallResult } from 'state/multicall/hooks'
import styled from 'styled-components'
import { TYPE } from 'theme'

import { ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS } from '../../constants'
import { useLimitOrdersHistory } from './useOrderBroadcasted'

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
`

const HeaderTitle = styled.div`
  @media screen and (max-width: 1115px) {
    div:first-child {
      display: none;
    }
  }
`

const HeaderTabs = styled.div`
  display: flex;
  background: ${({ theme }) => theme.bg1};
  border-radius: 8px;
  padding: 4px;
  height: 35px;
  gap: 4px;
  border: 1px solid ${({ theme }) => theme.bg4};

  @media screen and (max-width: 1115px) {
    width: 100%;
  }
`

const TableContainer = styled.div`
  overflow-x: auto;
  table {
    border-spacing: 0 12px;
  }
`

export const LimitOrderHistory: React.FC = () => {
  const { t } = useTranslation()

  const { account, network } = useContractKit()

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  const chainId = network.chainId as unknown as UbeswapChainId
  const limitOrderHistory = useLimitOrdersHistory()

  const [openOrdersTabActive, setOpenOrdersTabActive] = useState<boolean>(true)

  const rewardDistributorContract = useOrderBookRewardDistributorContract(
    ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS[chainId]
  )
  const rewardCurrencyAddress = useSingleCallResult(rewardDistributorContract, 'rewardCurrency', []).result?.[0]
  const rewardCurrency = useToken(rewardCurrencyAddress)

  let columns: HistoryColumn[] = [
    { label: 'Pay', size: 2 },
    { label: 'Receive', size: 1 },
    { label: 'Rate', size: 1 },
  ]
  columns = openOrdersTabActive ? [...columns, { label: 'Status', size: 1 }] : columns

  return (
    <>
      <Header>
        <HeaderTitle>
          <TYPE.black my={2}>Limit Orders</TYPE.black>
        </HeaderTitle>
        <HeaderTabs>
          <TabButton active={openOrdersTabActive} onClick={() => setOpenOrdersTabActive(true)}>
            Active Orders
            {account && (
              <span style={{ marginLeft: '0.15rem' }}>
                ({limitOrderHistory.filter((limitOrderHist) => limitOrderHist.isOrderOpen).length})
              </span>
            )}
          </TabButton>
          <TabButton active={!openOrdersTabActive} onClick={() => setOpenOrdersTabActive(false)}>
            Order History
            {account && (
              <span style={{ marginLeft: '0.15rem' }}>
                ({limitOrderHistory.filter((limitOrderHist) => !limitOrderHist.isOrderOpen).length})
              </span>
            )}
          </TabButton>
        </HeaderTabs>
      </Header>
      {account &&
      limitOrderHistory.filter((limitOrderHist) => {
        if (openOrdersTabActive) {
          return limitOrderHist.isOrderOpen
        }
        return !limitOrderHist.isOrderOpen
      }).length ? (
        <TableContainer>
          <table>
            <LimitOrderHistoryHead columns={columns}></LimitOrderHistoryHead>
            <LimitOrderHistoryBody
              historyData={limitOrderHistory.filter(
                (limitOrderHist) => limitOrderHist.isOrderOpen == openOrdersTabActive
              )}
            ></LimitOrderHistoryBody>
          </table>
        </TableContainer>
      ) : (
        <ColumnCenter style={{ gap: '16px', marginTop: '12px' }}>
          <TYPE.black my={2}>
            {account
              ? `Can't find any ${openOrdersTabActive ? 'active' : 'filled'} orders`
              : `${openOrdersTabActive ? 'Active orders are' : 'Order history is'} not available`}
          </TYPE.black>
          {account ? (
            <Archive size={'20'} />
          ) : (
            <ButtonLight onClick={toggleWalletModal} style={{ maxWidth: '190px', height: '50px' }}>
              {t('connectWallet')}
            </ButtonLight>
          )}
        </ColumnCenter>
      )}
    </>
  )
}
