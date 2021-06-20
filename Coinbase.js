import { createHmac } from 'crypto'
import axios from 'axios'

const config = {
  endpoints: {
    accounts: '/v2/accounts',
    time: '/v2/time',
    user: '/v2/user',
    exchangeRates: '/v2/exchange-rates',
    prices: '/v2/prices/',
  },
  errorCodes: [
    {
      errorId: 'two_factor_required',
      code: 402,
      description: 'When sending money over 2fa limit',
    },
    {
      errorId: 'param_required',
      code: 400,
      description: 'Missing parameter',
    },
    {
      errorId: 'validation_error',
      code: 400,
      description: 'Unable to validate POST/PUT',
    },
    {
      errorId: 'invalid_request',
      code: 400,
      description: 'Invalid request',
    },
    {
      errorId: 'personal_details_required',
      code: 400,
      description: 'User’s personal detail required to complete this request',
    },
    {
      errorId: 'unverified_email',
      code: 400,
      description: 'User has not verified their email',
    },
    {
      errorId: 'authentication_error',
      code: 401,
      description: 'Invalid auth (generic)',
    },
    {
      errorId: 'invalid_token',
      code: 401,
      description: 'Invalid Oauth token',
    },
    {
      errorId: 'revoked_token',
      code: 401,
      description: 'Revoked Oauth token',
    },
    {
      errorId: 'expired_token',
      code: 401,
      description: 'Expired Oauth token',
    },
    {
      errorId: 'invalid_scope',
      code: 403,
      description: 'User hasn’t authenticated necessary scope',
    },
    {
      errorId: 'not_found',
      code: 404,
      description: 'Resource not found',
    },
    {
      errorId: 'rate_limit_exceeded',
      code: 429,
      description: 'Rate limit exceeded',
    },
    {
      errorId: 'internal_server_error',
      code: 500,
      description: 'Internal server error',
    },
  ],
}

export class Coinbase {
  constructor() {
    this.rootURI = 'https://api.coinbase.com/'
    this.method = 'GET'
    this.body = ''
    this.apiSecret = null
    this.apiKey = null
    this.language = 'en'
    this.currency = 'EUR'
  }

  setEnvironment({ apiSecret, apiKey, language, currency }) {
    this.apiSecret = apiSecret
    this.apiKey = apiKey
    this.language = language
    this.currency = currency
  }

  createMessage({ timestamp, endpoint }) {
    return `${timestamp}${this.method}${endpoint}${this.body}`
  }

  createSignature(message) {
    return createHmac('sha256', this.apiSecret).update(message).digest('hex')
  }

  createOptions({ endpoint, signature, timestamp }) {
    return {
      baseURL: this.rootURI,
      url: endpoint,
      method: this.method,
      headers: {
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-KEY': this.apiKey,
        'CB-VERSION': '2015-07-22',
        'Content-Type': 'application/json',
        'Accept-Language': this.language,
      },
    }
  }

  createError(errors) {
    if (!errors || errors?.length == 0) {
      return {
        message: 'No error present.',
      }
    }
    const error = errors[0]
    const { errodId, message, code } = config.errorCodes.find(
      (errorCode) => (errorCode.errorId = error.id)
    )
    return {
      message,
      errodId,
      code,
      url: error.url ? error.url : '',
    }
  }

  getOptions(endpoint) {
    const timestamp = Math.floor(Date.now() / 1000)
    const message = this.createMessage({ timestamp, endpoint })
    const signature = this.createSignature(message)
    return this.createOptions({ timestamp, endpoint, signature })
  }

  async request(options) {
    const response = await axios(options)
    return response.status == 200 ? response.data : null
  }

  async getServerTime() {
    const options = {
      baseURL: this.rootURI,
      url: config.endpoints.time,
      method: this.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.language,
      },
    }
    return await this.request(options)
  }

  async getUser() {
    const options = this.getOptions(config.endpoints.user)
    const {
      data: { id, native_currency },
    } = await this.request(options)
    return {
      currency: native_currency,
      coinbaseId: id,
    }
  }

  async getExchangeRates() {
    const endpoint = `${config.endpoints.exchangeRates}?currency=${
      this.currency ? this.currency : 'EUR'
    }`
    const options = {
      baseURL: this.rootURI,
      url: endpoint,
      method: this.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.language,
      },
    }
    const { data } = await this.request(options)
    return data ? data : null
  }
  async getSpotPrice(currencyPair) {
    const endpoint = `${config.endpoints.prices}${currencyPair}/spot`
    const options = this.getOptions(endpoint)
    const { data } = await this.request(options)
    return data.amount
  }
  async getSellPrice(currencyPair) {
    const endpoint = `${config.endpoints.prices}${currencyPair}/sell`
    const options = this.getOptions(endpoint)
    const { data } = await this.request(options)
    return data.amount
  }
  async getBuyPrice(currencyPair) {
    const endpoint = `${config.endpoints.prices}${currencyPair}/buy`
    const options = this.getOptions(endpoint)
    const { data } = await this.request(options)
    return data.amount
  }

  async getHistoricSellPrice(currencyPair, date) {
    const endpoint = `${config.endpoints.prices}${currencyPair}/sell?data=${date}`
    const options = this.getOptions(endpoint)
    const { data } = await this.request(options)
    return data.amount
  }

  async getAmountPerCurrency() {
    const options = this.getOptions(config.endpoints.accounts)
    const { data } = await this.request(options)
    if (!data) {
      return []
    }
    return data.reduce((result, currency) => {
      if (currency.balance.amount > 0.00000000001) {
        return [
          ...result,
          {
            currency: currency.currency,
            amount: Number(currency.balance.amount),
          },
        ]
      }
      return [...result]
    }, [])
  }

  async getCurrentBalance() {
    // TODO decouple this even more
    const amountPerCurrency = await this.getAmountPerCurrency()
    const balancePerCurrencyPromises = amountPerCurrency.map(
      async (singleCurrency) => {
        const spotPrice = await this.getSellPrice(
          `${singleCurrency.currency}-EUR`
        )
        return {
          balance: spotPrice * singleCurrency.amount,
          currency: singleCurrency.currency,
        }
      }
    )
    const balancePerCurrency = await Promise.all(balancePerCurrencyPromises)
    const balance = parseFloat(
      balancePerCurrency
        .reduce((total, currency) => {
          return total + currency.balance
        }, 0)
        .toFixed(2)
    )
    return balance
  }

  // TODO create more wrapper functions and a cache to save more data
}
