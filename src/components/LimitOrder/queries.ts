import { ApolloClient, gql, NormalizedCacheObject } from '@apollo/client'
import { blockClient } from 'index'

export const PAIR_PRICE_AT_BLOCK = (block: number | null, pairId: string) => {
  const blockString = block ? `block: {number: ${block}}` : ``
  return `pairs(
      where: { id: "${pairId}" }
      ${blockString}
    ) {
      token0 {
        id
      }
      token1 {
        id
      }
      token0Price
      token1Price
    }`
}

export const GET_BLOCK = gql`
  query GetBlock($timestampFrom: BigInt!, $timestampTo: BigInt!) {
    blocks(
      first: 1
      orderBy: timestamp
      orderDirection: asc
      where: { timestamp_gt: $timestampFrom, timestamp_lt: $timestampTo }
      subgraphError: allow
    ) {
      id
      number
      timestamp
    }
  }
`
export const GET_BLOCKS = (timestamps: readonly number[]) => {
  let queryString = 'query blocks {'
  queryString += timestamps.map((timestamp) => {
    return `t${timestamp}:blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${timestamp}, timestamp_lt: ${
      timestamp + 600
    } }, subgraphError: allow) {
      number
    }`
  })
  queryString += '}'
  return gql(queryString)
}

export const PRICE_TODAY_YESTERDAY = (pairId: string, blockYesterday: number) => gql`
    query pair {
      now: ${PAIR_PRICE_AT_BLOCK(null, pairId)}
      yesterday: ${PAIR_PRICE_AT_BLOCK(blockYesterday, pairId)}
    }
`

export const HOURLY_PAIR_RATES = (pairId: string, blocks: { timestamp: number; number: number }[]) => {
  let queryString = 'query blocks {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}: pair(id:"${pairId}", block: { number: ${block.number} }, subgraphError: allow) { 
        token0Price
        token1Price
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export async function splitQuery(
  query: (...args: any) => any,
  localClient: ApolloClient<NormalizedCacheObject>,
  vars: any,
  list: readonly any[],
  skipCount = 100,
  options: any
) {
  let fetchedData = {}
  let allFound = false
  let skip = 0

  while (!allFound) {
    let end = list.length
    if (skip + skipCount < list.length) {
      end = skip + skipCount
    }
    const sliced = list.slice(skip, end)
    const result = await localClient.query({
      query: query(...vars, sliced),
      errorPolicy: 'ignore',
      fetchPolicy: 'cache-first',
      ...options,
    })
    fetchedData = {
      ...fetchedData,
      ...result.data,
    }
    if (Object.keys(result.data).length < skipCount || skip + skipCount > list.length) {
      allFound = true
    } else {
      skip += skipCount
    }
  }

  return fetchedData
}

/**
 * @notice Fetches first block after a given timestamp
 * @dev Query speed is optimized by limiting to a 600-second period
 * @param {Int} timestamp in seconds
 */
export async function getBlockFromTimestamp(timestamp: number, options: any): Promise<number> {
  const result = await blockClient.query({
    query: GET_BLOCK,
    variables: {
      timestampFrom: timestamp.toString(),
      timestampTo: (timestamp + 600).toString(),
    },
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-first',
    ...options,
  })
  return parseInt(result?.data?.blocks?.[0]?.number ?? '0')
}

/**
 * @notice Fetches block objects for an array of timestamps.
 * @dev blocks are returned in chronological order (ASC) regardless of input.
 * @dev blocks are returned at string representations of Int
 * @dev timestamps are returns as they were provided; not the block time.
 * @param {Array} timestamps
 */
export async function getBlocksFromTimestamps(
  timestamps: readonly number[],
  skipCount = 500,
  options?: any
): Promise<readonly { timestamp: number; number: number }[]> {
  if (timestamps?.length === 0) {
    return []
  }

  const fetchedData: { [key: string]: [{ number: string }] } = await splitQuery(
    GET_BLOCKS,
    blockClient,
    [],
    timestamps,
    skipCount,
    options
  )

  const blocks: { timestamp: number; number: number }[] = []
  if (fetchedData) {
    for (const t in fetchedData) {
      if (fetchedData[t].length > 0) {
        blocks.push({
          timestamp: parseInt(t.split('t')[1]),
          number: parseInt(fetchedData[t][0].number),
        })
      }
    }
  }
  return blocks
}
