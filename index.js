import express from 'express'
import cors from 'cors'
import { Coinbase } from './Coinbase.js'
const app = express()
const port = 5000

const clients = {
  coinbase: new Coinbase(),
}

function getHeaders(request) {
  return {
    language: request.get('Accept-Language'),
    apiKey: request.get('CB-ACCESS-KEY'),
    apiSecret: request.get('CB-ACCESS-SECRET'),
    currency: request.get('CB-CURRENCY'),
  }
}

app.use(cors())

app.get('/coinbase/balance', async (request, response, next) => {
  // TODO add simple authentication
  clients.coinbase.setEnvironment(getHeaders(request))
  try {
    const balance = await clients.coinbase.getCurrentBalance()
    response.send({
      statusCode: 200,
      body: balance,
    })
  } catch (error) {
    response.send({
      statusCode: 500,
      body: error,
    })
    next(e)
  }
})

app.listen(process.env.PORT || port, () => {
  console.log(`🚀 Server is running on port ${port}`)
})
