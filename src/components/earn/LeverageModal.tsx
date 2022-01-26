import { LoadingView, SubmittedView } from 'components/ModalViews'
import { useDoTransaction } from 'components/swap/routing'
import React, { useState } from 'react'
import { X } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import styled from 'styled-components'
import { TYPE } from 'theme'

import { useStakingContract } from '../../hooks/useContract'
import { StakingInfo } from '../../state/stake/hooks'
import { ButtonPrimary, ButtonSecondary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { RowBetween } from '../Row'
import { Break } from './styled'

const ModalContentWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  background-color: ${({ theme }) => theme.bg2};
  border-radius: 20px;
`

const StyledCloseIcon = styled(X)`
  height: 20px;
  width: 20px;
  :hover {
    cursor: pointer;
  }

  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

interface LeverageModalProps {
  isOpen: boolean
  turnOnLeverage: () => void
  onClose: () => void
  stakingInfo: StakingInfo
}

export default function LeverageModal({ isOpen, turnOnLeverage, onClose, stakingInfo }: LeverageModalProps) {
  const { t } = useTranslation()
  const doTransaction = useDoTransaction()
  const [attempting, setAttempting] = useState(false)
  const [hash, setHash] = useState<string | undefined>()
  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)

  const onDismiss = () => {
    setHash(undefined)
    setAttempting(false)
    onClose()
  }
  async function onWithdraw() {
    if (stakingContract && stakingInfo?.stakedAmount) {
      const amount = Number(stakingInfo?.stakedAmount.toExact())
      if (amount === 0) {
        turnOnLeverage()
        onDismiss()
      } else {
        setAttempting(true)
        await doTransaction(stakingContract, 'exit', {
          args: [],
          summary: `${t('WithdrawDepositedLiquidity')}`,
        })
          .then((response) => {
            setHash(response.hash)
            turnOnLeverage()
          })
          .catch(() => {
            onClose()
            setAttempting(false)
          })
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={100}>
      {!attempting && !hash && (
        <ModalContentWrapper>
          <AutoColumn gap="lg">
            <RowBetween style={{ padding: '0 2rem' }}>
              <div />
              <Text fontWeight={500} fontSize={20}>
                Are you sure?
              </Text>
              <StyledCloseIcon onClick={() => onClose()} />
            </RowBetween>
            <Break />
            <AutoColumn gap="lg" style={{ padding: '0 2rem' }}>
              <Text fontWeight={400} fontSize={16} mb={'1rem'}>
                Enabling leverage can put your assets at risk of liquidation and is only meant for advanced users.
                <br />
                Clicking continue will also require you to exit your current farm position.
              </Text>
              <RowBetween>
                <ButtonSecondary mr="0.5rem" padding="18px" onClick={onDismiss}>{`${t('cancel')}`}</ButtonSecondary>
                <ButtonPrimary borderRadius="12px" onClick={onWithdraw}>{`${t('continue')}`}</ButtonPrimary>
              </RowBetween>
            </AutoColumn>
          </AutoColumn>
        </ModalContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={onDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>Withdrawing {stakingInfo?.stakedAmount?.toSignificant(4)} UBE-LP</TYPE.body>
            <TYPE.body fontSize={20}>
              Claiming{' '}
              {stakingInfo?.earnedAmounts
                ?.map((earnedAmount) => `${earnedAmount.toSignificant(4)} ${earnedAmount.token.symbol}`)
                .join(' + ')}
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={onDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>Transaction Submitted</TYPE.largeHeader>
            <TYPE.body fontSize={20}>Withdrew UBE-LP!</TYPE.body>
            <TYPE.body fontSize={20}>
              Claimed {stakingInfo?.rewardTokens.map((rewardToken) => rewardToken.symbol).join(' + ')}!
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
