import { ButtonRadio } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { CardNoise, CardSection, DataCard } from 'components/earn/styled'
import { RowBetween } from 'components/Row'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TYPE } from 'theme'

import { NewStake } from './NewStake'
import { OldStake } from './OldStake'

const TopSection = styled(AutoColumn)({
  maxWidth: '480px',
  width: '100%',
})

const StyledButtonRadio = styled(ButtonRadio)({
  padding: '8px',
  borderRadius: '4px',
})

export const StakePage: React.FC = () => {
  const { t } = useTranslation()
  const [newStake, setNewStake] = useState(true)

  return (
    <>
      <TopSection gap="lg" justify="center">
        <DataCard style={{ marginBottom: '2px' }}>
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>{t('UBEStakingAndGovernance')}</TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>{t('StakeUBEToParticipateInGovernanceAndEarnUbeRewards')}</TYPE.white>
              </RowBetween>
            </AutoColumn>
          </CardSection>
          <CardNoise />
        </DataCard>

        <div style={{ margin: '10px 0 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '200px' }}>
            <StyledButtonRadio active={newStake} onClick={() => setNewStake(true)}>
              New Stake
            </StyledButtonRadio>
          </div>
          <div style={{ width: '200px' }}>
            <StyledButtonRadio active={!newStake} onClick={() => setNewStake(false)}>
              Old Stake
            </StyledButtonRadio>
          </div>
        </div>

        {newStake ? <NewStake /> : <OldStake />}
      </TopSection>
    </>
  )
}
