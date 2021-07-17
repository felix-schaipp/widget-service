# widget-service

Small backend service to serve data from various api's to the [ios widget](https://github.com/felix-schaipp/coinbase-ios-widget).

Access these endpoints:
`/coinbase/balance`
`/coinbase/history`

The service will never store your api secret. It only uses the key for caching.
