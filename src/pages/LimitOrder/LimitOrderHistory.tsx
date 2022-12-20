import { useContractKit } from '@celo-tools/use-contractkit'
import { ButtonLight, TabButton } from 'components/Button'
import Column, { ColumnCenter } from 'components/Column'
import LimitOrderHistoryBody from 'components/LimitOrderHistory/LimitOrderHistoryBody'
import LimitOrderHistoryHead from 'components/LimitOrderHistory/LimitOrderHistoryHead'
import { LoadingHead, LoadingItem } from 'components/LimitOrderHistory/loading'
import React, { useEffect, useState } from 'react'
import { Archive } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { useWalletModalToggle } from 'state/application/hooks'
import styled from 'styled-components'
import { TYPE } from 'theme'

import { useLimitOrdersHistory } from './useOrderBroadcasted'

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  @media screen and (max-width: 1115px) {
    border-bottom: 0;
  }
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
    padding: 8px;
    border-radius: 20px;
    height: fit-content;
    button {
      font-size: 14px;
      padding: 8px;
      border-radius: 14px;
    }
  }
`

const TableContainer = styled.div`
  overflow-x: auto;
  table {
    width: 100%;
    border-spacing: 0 12px;
  }
`

enum Loading {
  NOT_LOADED,
  REFRESHING,
  LOADED,
}

export const LimitOrderHistory: React.FC = () => {
  const { t } = useTranslation()
  const { address: account } = useContractKit()
  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()
  const { limitOrderHistory, refresh } = useLimitOrdersHistory()
  const [openOrdersTabActive, setOpenOrdersTabActive] = useState<boolean>(true)
  const [loading, setLoading] = useState<Loading>(Loading.NOT_LOADED)

  useEffect(() => {
    if (!account) return

    if (refresh && loading == Loading.NOT_LOADED) {
      setLoading(Loading.REFRESHING)
    } else if (!refresh && loading != Loading.NOT_LOADED) {
      setLoading(Loading.LOADED)
    }
  }, [refresh])

  useEffect(() => {
    setLoading(Loading.NOT_LOADED)
  }, [account])

  return (
    <Column>
      <Header>
        <HeaderTitle>
          <TYPE.black my={2}>Limit Orders</TYPE.black>
        </HeaderTitle>
        <HeaderTabs>
          <TabButton active={openOrdersTabActive} onClick={() => setOpenOrdersTabActive(true)}>
            Active Orders{' '}
            {account &&
              loading == Loading.LOADED &&
              `(${limitOrderHistory.filter((limitOrderHist) => limitOrderHist.isOrderOpen).length})`}
          </TabButton>
          <TabButton active={!openOrdersTabActive} onClick={() => setOpenOrdersTabActive(false)}>
            Order History{' '}
            {account &&
              loading == Loading.LOADED &&
              `(${limitOrderHistory.filter((limitOrderHist) => !limitOrderHist.isOrderOpen).length})`}
          </TabButton>
        </HeaderTabs>
      </Header>
      {account ? (
        loading == Loading.LOADED ? ( // CONNECTED & LOADED
          limitOrderHistory.filter((limitOrderHist) => {
            if (openOrdersTabActive) {
              return limitOrderHist.isOrderOpen
            }
            return !limitOrderHist.isOrderOpen
          }).length ? ( // WITH ORDERS
            <TableContainer>
              <table>
                <LimitOrderHistoryHead></LimitOrderHistoryHead>
                <LimitOrderHistoryBody
                  historyData={limitOrderHistory.filter(
                    (limitOrderHist) => limitOrderHist.isOrderOpen == openOrdersTabActive
                  )}
                ></LimitOrderHistoryBody>
              </table>
            </TableContainer>
          ) : (
            // WITHOUT ORDERS
            <ColumnCenter style={{ gap: '16px', marginTop: '12px' }}>
              <TYPE.black my={2}>{`Can't find any ${openOrdersTabActive ? 'active' : 'filled'} orders`}</TYPE.black>
              <Archive size={20} />
            </ColumnCenter>
          )
        ) : (
          // & NOT LOADED
          <Column style={{ gap: '12px', paddingTop: '12px', opacity: '0.75', overflow: 'hidden' }}>
            <LoadingHead></LoadingHead>
            <Column style={{ gap: '12px' }}>
              <LoadingItem></LoadingItem>
              <LoadingItem></LoadingItem>
              <LoadingItem></LoadingItem>
              <LoadingItem></LoadingItem>
            </Column>
          </Column>
        )
      ) : (
        // NOT CONNECTED
        <ColumnCenter style={{ gap: '16px', marginTop: '12px' }}>
          <TYPE.black my={2}>{openOrdersTabActive ? 'Active orders are' : 'Order history is'} not available</TYPE.black>
          <ButtonLight onClick={toggleWalletModal} style={{ maxWidth: '190px', height: '50px' }}>
            {t('connectWallet')}
          </ButtonLight>
        </ColumnCenter>
      )}
    </Column>
  )
}
