export class BoomRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }
  async fetch(request) {
    const upgrade = request.headers.get('Upgrade');
    if (upgrade !== 'websocket') return new Response('Boom room is online.', {status:200});
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const room = new URL(request.url).searchParams.get('room') || 'ROOM';
    const name = (new URL(request.url).searchParams.get('name') || 'Guest').slice(0,24);
    const session = { ws: server, room, name };
    this.sessions.add(session);
    server.addEventListener('message', e => this.onMessage(session, e.data));
    server.addEventListener('close', () => { this.sessions.delete(session); this.broadcast({type:'system',text:`${name} keluar dari chat.`}, session); });
    const history = await this.state.storage.get('history') || [];
    server.send(JSON.stringify({type:'history', history}));
    this.broadcast({type:'system',text:`${name} masuk ke chat.`}, session);
    return new Response(null,{status:101,webSocket:client});
  }
  async onMessage(session, raw) {
    let msg; try { msg=JSON.parse(raw); } catch { return; }
    if (msg.type !== 'chat') return;
    const text=String(msg.text||'').trim().slice(0,1000);
    const photo=typeof msg.photo==='string' && msg.photo.startsWith('data:image/') ? msg.photo.slice(0, 2100000) : '';
    if(!text && !photo)return;
    const item={id:crypto.randomUUID(),name:session.name,text,photo,time:new Date().toISOString()};
    const history=await this.state.storage.get('history') || [];
    history.push(item); while(history.length>200)history.shift();
    await this.state.storage.put('history',history);
    this.broadcast({type:'message',...item});
  }
  broadcast(payload, except=null) {
    const data=JSON.stringify(payload);
    for(const s of this.sessions){ if(s!==except) try{s.ws.send(data)}catch{} }
  }
}

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/ws'){
      const room=(url.searchParams.get('room')||'').trim().toUpperCase().slice(0,32);
      const name=(url.searchParams.get('name')||'Guest').trim().slice(0,24);
      if(!room||!name)return new Response('Missing room/name',{status:400});
      const id=env.BOOM_ROOMS.idFromName(room);
      return env.BOOM_ROOMS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
