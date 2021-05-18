import { Server } from '@logux/server'

const server = new Server(
  Server.loadOptions(process, {
    host: '0.0.0.0',
    controlSecret: 'secret',
    subprotocol: '1.0.0',
    supports: '^0.11.1',
    backend: 'http://api-gw:80',
    fileUrl: import.meta.url
  })
)

server.listen('0.0.0.0')