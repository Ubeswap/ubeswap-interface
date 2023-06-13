import { useContractKit } from '@celo/react-celo'
import { useEffect, useState } from 'react'

export const useConnectedKit = () => {
  const { getConnectedKit } = useContractKit()
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        await getConnectedKit()
      } catch (e) {
        if (e instanceof Error) setError(e)
      }
    })()
  }, [getConnectedKit])
  return { error }
}
