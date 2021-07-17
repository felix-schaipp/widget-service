import Redis from 'redis'

export class Cache {
  cache
  DEFAULT_EXPIRATION
  constructor(environment) {
    if (environment === 'production') {
      this.cache = Redis.createClient({
        url: 'https://ios-widget-service.herokuapp.com/cache',
      })
    } else {
      this.cache = Redis.createClient()
    }
    this.DEFAULT_EXPIRATION = 60 * 60 * 8 // 8 hours
  }

  getOrSet(key, expiration, historyKey, callback) {
    return new Promise((resolve, reject) => {
      this.cache.get(key, async (error, data) => {
        if (error) return reject(error)
        if (data != null) return resolve(JSON.parse(data))
        const newData = await callback()
        this.cache.setex(
          key,
          expiration || this.DEFAULT_EXPIRATION,
          JSON.stringify(newData)
        )
        if (historyKey && newData) {
          this.setHistory(historyKey, newData)
        }
        resolve(newData)
      })
    })
  }

  setHistory(key, historic) {
    this.cache.lpush(key, JSON.stringify(historic))
  }

  getHistory(key) {
    return new Promise((resolve, reject) => {
      this.cache.lrange(key, 0, -1, (error, data) => {
        if (error) return reject(error)
        if (data != null) return resolve(data)
        this.resolve([])
      })
    })
  }
}
