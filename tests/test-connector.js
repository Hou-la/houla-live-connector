const { io } = require('socket.io-client')
const s = io('http://127.0.0.1:53001/events', {
  path: '/ws', transports: ['websocket'],
  auth: { token: 'hle_GwYpi6OdOZ4zS9CCvDDqoCEq6o2Yin1Q', reactsTo: ['ix_slot_01','ix_slot_05'] },
})
s.on('ready', i => console.log('READY', i))   // ← affiche { workspaceId, events }
s.on('error', e => console.log('ERROR', e))