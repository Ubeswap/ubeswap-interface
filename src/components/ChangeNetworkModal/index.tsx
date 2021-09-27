import { useContractKit } from '@celo-tools/use-contractkit'
import { ButtonLight } from 'components/Button'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Modal from '../Modal'

export default function ChangeNetworkModal() {
  const { connect } = useContractKit()
  const { t } = useTranslation()
  return (
    <Modal isOpen={true} onDismiss={() => null} maxHeight={24} minHeight={24}>
      <div style={{ width: '100%', margin: '16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <span>Unsupported network</span>
        </div>
        <ButtonLight onClick={() => connect().catch(console.warn)}>{t('changeNetwork')} Celo</ButtonLight>
      </div>
    </Modal>
  )
}
