import http from 'node:http';
import { randomUUID, createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);

const db = {
  users: new Map(),
  usersByEmail: new Map(),
  usersByUsername: new Map(),
  sessions: new Map(),
  dms: new Map(),
  servers: new Map(),
};

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function send(res, status, payload) {
  const json = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(json);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const userId = db.sessions.get(token);
  return userId ? db.users.get(userId) : null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, { ok: true, uptime: process.uptime() });
    }

    if (req.method === 'POST' && req.url === '/auth/register') {
      const { email, username, password } = await parseBody(req);
      if (!email || !username || !password) {
        return send(res, 400, { error: 'email, username, and password are required' });
      }
      if (db.usersByEmail.has(email) || db.usersByUsername.has(username)) {
        return send(res, 409, { error: 'email or username already exists' });
      }

      const user = {
        user_id: randomUUID(),
        email,
        username,
        display_name: username,
        bio: '',
        avatar_url: null,
        banner_url: null,
        status: 'offline',
        created_at: new Date().toISOString(),
        password_hash: hashPassword(password),
      };

      db.users.set(user.user_id, user);
      db.usersByEmail.set(email, user.user_id);
      db.usersByUsername.set(username, user.user_id);

      return send(res, 201, {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        status: user.status,
      });
    }

    if (req.method === 'POST' && req.url === '/auth/login') {
      const { identifier, password } = await parseBody(req);
      if (!identifier || !password) {
        return send(res, 400, { error: 'identifier and password are required' });
      }

      const userId = db.usersByEmail.get(identifier) || db.usersByUsername.get(identifier);
      if (!userId) return send(res, 401, { error: 'invalid credentials' });

      const user = db.users.get(userId);
      if (hashPassword(password) !== user.password_hash) {
        return send(res, 401, { error: 'invalid credentials' });
      }

      const token = randomUUID();
      db.sessions.set(token, user.user_id);
      return send(res, 200, { token, user_id: user.user_id });
    }

    if (req.method === 'GET' && req.url.startsWith('/users/')) {
      const userId = req.url.split('/')[2];
      const user = db.users.get(userId);
      if (!user) return send(res, 404, { error: 'user not found' });

      return send(res, 200, {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        status: user.status,
      });
    }

    if (req.method === 'POST' && req.url === '/dms') {
      const actor = authUser(req);
      if (!actor) return send(res, 401, { error: 'unauthorized' });

      const { participant_id } = await parseBody(req);
      if (!participant_id || !db.users.has(participant_id)) {
        return send(res, 400, { error: 'valid participant_id is required' });
      }
      if (participant_id === actor.user_id) {
        return send(res, 400, { error: 'cannot create dm with self' });
      }

      const dmId = randomUUID();
      const dm = {
        dm_id: dmId,
        participants: [actor.user_id, participant_id],
        created_at: new Date().toISOString(),
      };
      db.dms.set(dmId, dm);
      return send(res, 201, dm);
    }

    if (req.method === 'POST' && req.url === '/servers') {
      const actor = authUser(req);
      if (!actor) return send(res, 401, { error: 'unauthorized' });

      const { name, description = '', visibility = 'private' } = await parseBody(req);
      if (!name) return send(res, 400, { error: 'name is required' });

      const serverId = randomUUID();
      const community = {
        server_id: serverId,
        name,
        description,
        visibility: visibility === 'public' ? 'public' : 'private',
        owner_id: actor.user_id,
        created_at: new Date().toISOString(),
      };
      db.servers.set(serverId, community);
      return send(res, 201, community);
    }

    return send(res, 404, { error: 'not found' });
  } catch (error) {
    return send(res, 400, { error: error.message || 'bad request' });
  }
});

server.listen(PORT, () => {
  console.log(`MG backend listening on http://localhost:${PORT}`);
});
