import {
  PROCESSOR_SUBSCRIPTION,
} from './graphql-queries'
import Container from 'typedi'
import { GraphQLClient } from 'graphql-request'
import { SubscriptionClient } from 'graphql-subscriptions-client'
import pWaitFor = require('p-wait-for')

export interface ProcessorStatus {
  lastCompleteBlock: number
  lastProcessedEvent: string
  indexerHead: number
  chainHead: number
}

export let processorStatus: ProcessorStatus | undefined

export const getGQLClient = () =>
  Container.get<GraphQLClient>('ProcessorClient')
export const getSubClient = () =>
  Container.get<SubscriptionClient>('SubscriptionClient')

export function subscribeToProcessorStatus(): void {
  console.log('subscribing to processor status')
  getSubClient()
    .request({ query: PROCESSOR_SUBSCRIPTION })
    .subscribe({
      next({ data }: unknown) {
        console.log('processor subscription data', data)
        if (data) {
          processorStatus = (data as {
            stateSubscription: ProcessorStatus
          }).stateSubscription
        }
      },
    })
}

export async function getProcessorStatus(): Promise<ProcessorStatus> {
  //await pWaitFor(() => processorStatus !== undefined)
  await pWaitFor(() => {
    //console.log('wait iteraration')
    return processorStatus !== undefined
  })
  return processorStatus as ProcessorStatus
}
