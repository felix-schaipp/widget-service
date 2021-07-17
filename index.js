import express from 'express'
import cors from 'cors'
import { Coinbase } from './Coinbase.js'
import { Cache } from './Cache.js'

const app = express()
const port = 5000

const clients = {
  coinbase: new Coinbase(),
}

console.log('Initialize cache...')
const cache = new Cache(process.env.REDISTOGO_URL || 'development')
console.log('...finished initalizing')
app.use(cors())

function getHeaders(request) {
  return {
    language: request.get('Accept-Language'),
    apiKey: request.get('CB-ACCESS-KEY'),
    apiSecret: request.get('CB-ACCESS-SECRET'),
    currency: request.get('CB-CURRENCY'),
  }
}

app.get('/coinbase/balance', async (request, response) => {
  const headers = getHeaders(request)
  if (!headers.apiKey || !headers.apiSecret) {
    response.send({
      statusCode: 403,
      body: "You're missing an apiKey or apiSecret -> the service will not handle your request.",
    })
    response.end()
  }
  clients.coinbase.setEnvironment(headers)
  try {
    const balance = await cache.getOrSet(
      `balance:${headers.apiKey}`,
      10,
      `history:${headers.apiKey}`,
      async () => {
        return await clients.coinbase.getCurrentBalance()
      }
    )
    response.send({
      statusCode: 200,
      body: { balance },
    })
  } catch (error) {
    response.send({
      statusCode: 500,
      body: {
        message: `An error occured please try again.`,
        error,
      },
    })
    response.end()
  }
})

app.get('/coinbase/history', async (request, response) => {
  const headers = getHeaders(request)
  if (!headers.apiKey || !headers.apiSecret) {
    response.send({
      statusCode: 403,
      body: "You're missing an apiKey or apiSecret -> the service will not handle your request.",
    })
    response.end()
  }
  clients.coinbase.setEnvironment(headers)
  try {
    const history = await cache.getHistory(`history:${headers.apiKey}`)
    response.send({
      statusCode: 200,
      body: {
        history,
      },
    })
  } catch (error) {
    response.send({
      statusCode: 500,
      body: {
        message: `An error occured please try again.`,
        error,
      },
    })
    response.end()
  }
})

app.listen(process.env.PORT || port, () => {
  console.log(`🚀 Server is running on port ${port}`)
})
