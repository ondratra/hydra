import { gql } from 'graphql-request'

export const PROCESSOR_SUBSCRIPTION = gql`
  subscription {
    stateSubscription {
      indexerHead
      chainHead
      lastProcessedEvent
      lastCompleteBlock
    }
  }
`
