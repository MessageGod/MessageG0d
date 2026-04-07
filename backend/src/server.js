import http from 'node:http';
import { randomUUID, createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const ROOT_ADMIN_USERNAME = 'memegodmidas';

const db = {
  users: new Map(),
  usersByEmail: new Map(),
  usersByUsername: new Map(),
  sessions: new Map(),
  passwordResetTokens: new Map(),

  blocks: new Set(),
  reports: [],
  globalBans: new Set(),

  dms: new Map(),
  messages: new Map(),
  typing: new Map(),

  servers: new Map(),
  serverMembers: new Map(),
  roles: new Map(),
  channels: new Map(),
  teams: new Map(),

  featureFlags: [],
  godUsers: new Set(),
  midasScopes: new Map(),

  themes: { user: new Map(), server: new Map(), channel: new Map() },
  economy: new Map(),
  achievements: new Map(),

  bots: new Map(),
  auditLogs: [],
};

const defaultPermissions = {
  SEND_MESSAGES: 1 << 0,
  DELETE_MESSAGES: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  MANAGE_ROLES: 1 << 3,
  KICK_USERS: 1 << 4,
  BAN_USERS: 1 << 5,
  CREATE_INVITES: 1 << 6,
};

function logAudit(action, actorId, meta = {}) {
  db.auditLogs.push({ id: randomUUID(), action, actor_id: actorId, meta, created_at: new Date().toISOString() });
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function pairKey(a, b) {
  return [a, b].sort().join(':');
}

function parsePath(url = '') {
  return url.split('?')[0].split('/').filter(Boolean);
}

function parseQuery(url = '') {
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return Object.fromEntries(new URLSearchParams(q));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error('Payload too large'));
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

function getActor(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const userId = db.sessions.get(token);
  return userId ? db.users.get(userId) : null;
}

function requireActor(req, res) {
  const actor = getActor(req);
  if (!actor) {
    send(res, 401, { error: 'unauthorized' });
    return null;
  }
  if (db.globalBans.has(actor.user_id)) {
    send(res, 403, { error: 'globally banned' });
    return null;
  }
  return actor;
}

function isRootAdmin(user) {
  return user?.username === ROOT_ADMIN_USERNAME;
}

function ensureEconomy(userId) {
  if (!db.economy.has(userId)) db.economy.set(userId, { xp: 0, level: 1, coins: 0 });
  return db.economy.get(userId);
}

const server = http.createServer(async (req, res) => {
  try {
    const parts = parsePath(req.url);
    const query = parseQuery(req.url);

    if (req.method === 'GET' && req.url.startsWith('/health')) {
      return send(res, 200, { ok: true, uptime: process.uptime(), root_admin: ROOT_ADMIN_USERNAME });
    }

    // Auth
    if (req.method === 'POST' && req.url === '/auth/register') {
      const { email, username, password } = await parseBody(req);
      if (!email || !username || !password) return send(res, 400, { error: 'email, username, password required' });
      if (db.usersByEmail.has(email) || db.usersByUsername.has(username)) return send(res, 409, { error: 'identifier exists' });

      const user = {
        user_id: randomUUID(), username, display_name: username, email,
        password_hash: hashPassword(password), bio: '', avatar_url: null, banner_url: null,
        status: 'offline', last_seen: null,
      };
      db.users.set(user.user_id, user);
      db.usersByEmail.set(email, user.user_id);
      db.usersByUsername.set(username, user.user_id);
      ensureEconomy(user.user_id);
      return send(res, 201, { user_id: user.user_id, username: user.username, email: user.email });
    }

    if (req.method === 'POST' && req.url === '/auth/login') {
      const { identifier, password } = await parseBody(req);
      const userId = db.usersByEmail.get(identifier) || db.usersByUsername.get(identifier);
      if (!userId) return send(res, 401, { error: 'invalid credentials' });
      const user = db.users.get(userId);
      if (hashPassword(password) !== user.password_hash) return send(res, 401, { error: 'invalid credentials' });
      const token = randomUUID();
      db.sessions.set(token, user.user_id);
      return send(res, 200, { token, user_id: user.user_id });
    }

    if (req.method === 'POST' && req.url === '/auth/forgot-password') {
      const { email } = await parseBody(req);
      const userId = db.usersByEmail.get(email);
      if (!userId) return send(res, 200, { message: 'if account exists, reset sent' });
      const token = randomUUID();
      db.passwordResetTokens.set(token, { user_id: userId, expires_at: Date.now() + (30 * 60 * 1000) });
      return send(res, 200, { reset_token: token, expires_in_minutes: 30 });
    }

    if (req.method === 'POST' && req.url === '/auth/reset-password') {
      const { token, new_password } = await parseBody(req);
      const record = db.passwordResetTokens.get(token);
      if (!record || record.expires_at < Date.now()) return send(res, 400, { error: 'invalid or expired token' });
      db.users.get(record.user_id).password_hash = hashPassword(new_password);
      db.passwordResetTokens.delete(token);
      return send(res, 200, { message: 'password updated' });
    }

    // Users and social controls
    if (req.method === 'GET' && parts[0] === 'users' && parts[1]) {
      const user = db.users.get(parts[1]);
      if (!user) return send(res, 404, { error: 'not found' });
      return send(res, 200, user);
    }

    if (req.method === 'POST' && parts[0] === 'users' && parts[1] && parts[2] === 'block') {
      const actor = requireActor(req, res); if (!actor) return;
      db.blocks.add(pairKey(actor.user_id, parts[1]));
      logAudit('user.block', actor.user_id, { blocked_id: parts[1] });
      return send(res, 200, { blocked: parts[1] });
    }

    if (req.method === 'POST' && parts[0] === 'users' && parts[1] && parts[2] === 'report') {
      const actor = requireActor(req, res); if (!actor) return;
      const { reason = 'unspecified' } = await parseBody(req);
      const report = { report_id: randomUUID(), reporter_id: actor.user_id, reported_id: parts[1], reason, created_at: new Date().toISOString() };
      db.reports.push(report);
      logAudit('user.report', actor.user_id, report);
      return send(res, 201, report);
    }

    // DM system
    if (req.method === 'POST' && req.url === '/dms') {
      const actor = requireActor(req, res); if (!actor) return;
      const { participant_id } = await parseBody(req);
      if (!participant_id || !db.users.has(participant_id) || participant_id === actor.user_id) return send(res, 400, { error: 'invalid participant' });
      const dm = { dm_id: randomUUID(), participants: [actor.user_id, participant_id], created_at: new Date().toISOString() };
      db.dms.set(dm.dm_id, dm);
      return send(res, 201, dm);
    }

    if (req.method === 'POST' && parts[0] === 'dms' && parts[1] && parts[2] === 'typing') {
      const actor = requireActor(req, res); if (!actor) return;
      db.typing.set(`${parts[1]}:${actor.user_id}`, Date.now());
      return send(res, 200, { dm_id: parts[1], user_id: actor.user_id, typing: true });
    }

    if (req.method === 'POST' && parts[0] === 'dms' && parts[1] && parts[2] === 'messages') {
      const actor = requireActor(req, res); if (!actor) return;
      const dm = db.dms.get(parts[1]);
      if (!dm || !dm.participants.includes(actor.user_id)) return send(res, 404, { error: 'dm not found' });

      const { content = '', attachments = [], reply_to = null } = await parseBody(req);
      const msg = {
        message_id: randomUUID(), sender_id: actor.user_id, dm_id: parts[1], content,
        attachments, created_at: new Date().toISOString(), edited_at: null, status: 'sent',
        reply_to, reactions: {},
      };
      db.messages.set(msg.message_id, msg);
      return send(res, 201, msg);
    }

    if (req.method === 'PATCH' && parts[0] === 'messages' && parts[1]) {
      const actor = requireActor(req, res); if (!actor) return;
      const msg = db.messages.get(parts[1]);
      if (!msg || msg.sender_id !== actor.user_id) return send(res, 404, { error: 'message not found' });
      const { content } = await parseBody(req);
      msg.content = content ?? msg.content;
      msg.edited_at = new Date().toISOString();
      return send(res, 200, msg);
    }

    if (req.method === 'DELETE' && parts[0] === 'messages' && parts[1]) {
      const actor = requireActor(req, res); if (!actor) return;
      const msg = db.messages.get(parts[1]);
      if (!msg || msg.sender_id !== actor.user_id) return send(res, 404, { error: 'message not found' });
      db.messages.delete(parts[1]);
      return send(res, 200, { deleted: parts[1] });
    }

    if (req.method === 'POST' && parts[0] === 'messages' && parts[1] && parts[2] === 'reactions') {
      const actor = requireActor(req, res); if (!actor) return;
      const msg = db.messages.get(parts[1]);
      if (!msg) return send(res, 404, { error: 'message not found' });
      const { emoji } = await parseBody(req);
      msg.reactions[emoji] = msg.reactions[emoji] || [];
      if (!msg.reactions[emoji].includes(actor.user_id)) msg.reactions[emoji].push(actor.user_id);
      return send(res, 200, msg.reactions);
    }

    if (req.method === 'POST' && parts[0] === 'dms' && parts[1] && parts[2] === 'read') {
      const actor = requireActor(req, res); if (!actor) return;
      const { message_id } = await parseBody(req);
      const msg = db.messages.get(message_id);
      if (!msg || msg.dm_id !== parts[1]) return send(res, 404, { error: 'message not found' });
      msg.status = 'read';
      return send(res, 200, { message_id, status: 'read', reader: actor.user_id });
    }

    if (req.method === 'GET' && parts[0] === 'search' && parts[1] === 'messages') {
      const actor = requireActor(req, res); if (!actor) return;
      const q = (query.q || '').toLowerCase();
      const results = [...db.messages.values()].filter((m) => m.content.toLowerCase().includes(q));
      return send(res, 200, { total: results.length, results });
    }

    // Server/channel/role/team system
    if (req.method === 'POST' && req.url === '/servers') {
      const actor = requireActor(req, res); if (!actor) return;
      const { name, description = '', visibility = 'private' } = await parseBody(req);
      const serverItem = { server_id: randomUUID(), name, description, owner_id: actor.user_id, visibility, invite_codes: [] };
      db.servers.set(serverItem.server_id, serverItem);
      db.serverMembers.set(serverItem.server_id, new Set([actor.user_id]));
      return send(res, 201, serverItem);
    }

    if (req.method === 'POST' && parts[0] === 'servers' && parts[1] && parts[2] === 'join') {
      const actor = requireActor(req, res); if (!actor) return;
      const target = db.servers.get(parts[1]);
      if (!target) return send(res, 404, { error: 'server not found' });
      db.serverMembers.get(parts[1]).add(actor.user_id);
      return send(res, 200, { server_id: parts[1], joined: actor.user_id });
    }

    if (req.method === 'POST' && parts[0] === 'servers' && parts[1] && parts[2] === 'roles') {
      const actor = requireActor(req, res); if (!actor) return;
      const serverItem = db.servers.get(parts[1]);
      if (!serverItem || serverItem.owner_id !== actor.user_id) return send(res, 403, { error: 'owner only' });
      const { name, color = '#999', icon = '', permissions_bitmask = defaultPermissions.SEND_MESSAGES } = await parseBody(req);
      const role = { role_id: randomUUID(), server_id: parts[1], name, color, icon, permissions_bitmask };
      db.roles.set(role.role_id, role);
      return send(res, 201, role);
    }

    if (req.method === 'POST' && parts[0] === 'servers' && parts[1] && parts[2] === 'channels') {
      const actor = requireActor(req, res); if (!actor) return;
      const serverItem = db.servers.get(parts[1]);
      if (!serverItem || !db.serverMembers.get(parts[1])?.has(actor.user_id)) return send(res, 403, { error: 'not a member' });
      const { type = 'TEXT', name, permissions_overrides = {} } = await parseBody(req);
      const channel = { channel_id: randomUUID(), server_id: parts[1], type, name, permissions_overrides };
      db.channels.set(channel.channel_id, channel);
      return send(res, 201, channel);
    }

    if (req.method === 'POST' && parts[0] === 'servers' && parts[1] && parts[2] === 'teams') {
      const actor = requireActor(req, res); if (!actor) return;
      const serverItem = db.servers.get(parts[1]);
      if (!serverItem || serverItem.owner_id !== actor.user_id) return send(res, 403, { error: 'owner only' });
      const { tag, emoji, active = false } = await parseBody(req);
      const team = { team_id: randomUUID(), server_id: parts[1], tag, emoji, active };
      db.teams.set(team.team_id, team);
      return send(res, 201, team);
    }

    // Admin / GOD / MIDAS / feature injection
    if (req.method === 'POST' && req.url === '/admin/global-ban') {
      const actor = requireActor(req, res); if (!actor) return;
      if (!isRootAdmin(actor)) return send(res, 403, { error: 'root admin only' });
      const { user_id } = await parseBody(req);
      db.globalBans.add(user_id);
      logAudit('admin.global_ban', actor.user_id, { user_id });
      return send(res, 200, { globally_banned: user_id });
    }

    if (req.method === 'POST' && req.url === '/admin/feature-flags') {
      const actor = requireActor(req, res); if (!actor) return;
      if (!isRootAdmin(actor)) return send(res, 403, { error: 'root admin only' });
      const body = await parseBody(req);
      const flag = { id: randomUUID(), ...body, created_at: new Date().toISOString() };
      db.featureFlags.push(flag);
      return send(res, 201, flag);
    }

    if (req.method === 'POST' && parts[0] === 'admin' && parts[1] === 'god' && parts[2]) {
      const actor = requireActor(req, res); if (!actor) return;
      if (!isRootAdmin(actor)) return send(res, 403, { error: 'root admin only' });
      db.godUsers.add(parts[2]);
      return send(res, 200, { user_id: parts[2], god: true });
    }

    if (req.method === 'POST' && parts[0] === 'admin' && parts[1] === 'midas' && parts[2]) {
      const actor = requireActor(req, res); if (!actor) return;
      if (!isRootAdmin(actor)) return send(res, 403, { error: 'root admin only' });
      const { permissions = [] } = await parseBody(req);
      db.midasScopes.set(parts[2], permissions);
      return send(res, 200, { user_id: parts[2], permissions });
    }

    // Customization engine
    if (req.method === 'POST' && parts[0] === 'themes' && ['user', 'server', 'channel'].includes(parts[1])) {
      const actor = requireActor(req, res); if (!actor) return;
      const { target_id, config } = await parseBody(req);
      db.themes[parts[1]].set(target_id, { set_by: actor.user_id, config });
      return send(res, 200, { scope: parts[1], target_id, config });
    }

    // Bots
    if (req.method === 'POST' && req.url === '/bots/register') {
      const actor = requireActor(req, res); if (!actor) return;
      const { name, scopes = [] } = await parseBody(req);
      const bot = { bot_id: randomUUID(), name, owner_id: actor.user_id, scopes };
      db.bots.set(bot.bot_id, bot);
      return send(res, 201, bot);
    }

    // Economy, achievements, progression
    if (req.method === 'POST' && req.url === '/economy/grant-xp') {
      const actor = requireActor(req, res); if (!actor) return;
      const { user_id, amount = 0 } = await parseBody(req);
      const e = ensureEconomy(user_id);
      e.xp += Number(amount);
      e.level = Math.max(1, Math.floor(e.xp / 100) + 1);
      return send(res, 200, { user_id, ...e });
    }

    if (req.method === 'POST' && req.url === '/economy/coins') {
      const actor = requireActor(req, res); if (!actor) return;
      const { user_id, amount = 0 } = await parseBody(req);
      const e = ensureEconomy(user_id);
      e.coins += Number(amount);
      return send(res, 200, { user_id, ...e });
    }

    if (req.method === 'POST' && req.url === '/achievements/unlock') {
      const actor = requireActor(req, res); if (!actor) return;
      const { user_id, achievement } = await parseBody(req);
      if (!db.achievements.has(user_id)) db.achievements.set(user_id, new Set());
      db.achievements.get(user_id).add(achievement);
      return send(res, 200, { user_id, achievements: [...db.achievements.get(user_id)] });
    }

    // Discovery / multi-server feed / moderation hints
    if (req.method === 'GET' && req.url.startsWith('/discovery/servers')) {
      const items = [...db.servers.values()].map((s) => ({ ...s, members: db.serverMembers.get(s.server_id)?.size || 0 }));
      items.sort((a, b) => b.members - a.members);
      return send(res, 200, { trending: items.slice(0, 20) });
    }

    if (req.method === 'GET' && req.url.startsWith('/feeds/aggregate')) {
      const actor = requireActor(req, res); if (!actor) return;
      const memberServerIds = [...db.serverMembers.entries()].filter(([, members]) => members.has(actor.user_id)).map(([id]) => id);
      const feed = [...db.messages.values()].filter((m) => {
        const dm = db.dms.get(m.dm_id);
        return dm?.participants.includes(actor.user_id);
      });
      return send(res, 200, { server_ids: memberServerIds, direct_feed: feed.slice(-50) });
    }

    if (req.method === 'POST' && req.url === '/moderation/suggest') {
      const actor = requireActor(req, res); if (!actor) return;
      const { content = '' } = await parseBody(req);
      const flagged = /(spam|scam|phish)/i.test(content);
      return send(res, 200, { flagged, reason: flagged ? 'keyword_match' : 'clean' });
    }

    if (req.method === 'GET' && req.url === '/admin/audit-logs') {
      const actor = requireActor(req, res); if (!actor) return;
      if (!isRootAdmin(actor)) return send(res, 403, { error: 'root admin only' });
      return send(res, 200, { logs: db.auditLogs.slice(-500) });
    }

    return send(res, 404, { error: 'not found' });
  } catch (error) {
    return send(res, 400, { error: error.message || 'bad request' });
  }
});

server.listen(PORT, () => {
  console.log(`MG backend listening on http://localhost:${PORT}`);
});
