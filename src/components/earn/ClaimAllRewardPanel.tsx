import { AutoColumn, TopSection } from 'components/Column'
import Loader from 'components/Loader'
import { RowCenter, RowStart } from 'components/Row'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'react-feather'
import { Trans, useTranslation } from 'react-i18next'
import { useFilteredStakingInfo } from 'state/stake/hooks'
import styled, { ThemeContext } from 'styled-components'
import { StyledLink, TYPE } from 'theme'

import ClaimAllRewardItem from './ClaimAllRewardItem'
import { CardSection, TopBorderCard } from './styled'

export const Space = styled.span`
  width: 10px;
`

export interface ClaimAllRewardsProps {
  stakedFarms: FarmSummary[]
}

export default function ClaimAllRewardPanel({ stakedFarms }: ClaimAllRewardsProps) {
  const theme = useContext(ThemeContext)
  const { t } = useTranslation()

  const [pendingIndex, setPendingIndex] = useState<number>(0)
  const [pending, setPending] = useState<boolean>(false)
  const [finished, setFinished] = useState<boolean>(false)
  const [display, setDisplay] = useState<boolean>(false)

  const stakingAddresses = useMemo(() => {
    return stakedFarms.map((farm) => farm.lpAddress)
  }, [stakedFarms])

  const stakingInfos = useFilteredStakingInfo(stakingAddresses)

  useEffect(() => {
    setDisplay(stakingInfos?.length != undefined && stakingInfos?.length > 0)
  }, [stakingInfos])

  const reportFinish = () => {
    if (pendingIndex === stakingInfos?.length) {
      setPending(false)
      setFinished(true)
    } else setPendingIndex(pendingIndex + 1)
  }

  const onClaim = () => {
    setPendingIndex(1)
    setPending(true)
  }

  if (!display || finished) return <></>

  return (
    <TopSection gap="md">
      <TopBorderCard>
        <CardSection>
          <RowStart>
            <div style={{ paddingRight: 16 }}>
              <AlertCircle color={theme.green1} size={36} />
            </div>
            <AutoColumn gap="md">
              <RowCenter>
                <TYPE.black fontWeight={600}>
                  <Trans i18nKey="youHaveUnclaimedRewards" values={{ count: stakingInfos?.length }} />
                </TYPE.black>
              </RowCenter>
              {pending && (
                <RowCenter>
                  <TYPE.black fontWeight={600}>{`${pendingIndex} / ${stakingInfos?.length}`}</TYPE.black>
                  <Space />
                  <Loader size="15px" />
                </RowCenter>
              )}
              <StyledLink onClick={onClaim}>{t('claimAllRewards')}</StyledLink>
            </AutoColumn>
          </RowStart>
          {stakingInfos?.map((stakingInfo, idx) => (
            <ClaimAllRewardItem
              key={idx}
              index={idx + 1}
              pending={pending}
              pendingIndex={pendingIndex}
              stakingInfo={stakingInfo}
              report={reportFinish}
            />
          ))}
        </CardSection>
      </TopBorderCard>
    </TopSection>
  )
}
