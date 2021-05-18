import { Server } from '@logux/server'

const server = new Server(
  Server.loadOptions(process, {
    controlSecret: 'secret',
    subprotocol: '1.0.0',
    supports: '^0.11.1',
    backend: 'http://api-gw:80',
    fileUrl: import.meta.url
  })
)

server.listen()