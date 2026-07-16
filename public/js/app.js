/* MICROSTORE_OS dashboard app logic (vanilla JS, no framework/build step) */

const state = {
  guildId: null,
  view: 'overview',
  meta: null, // { channels, roles } for the current guild
};

const content = document.getElementById('content');

// Developer-only image/banner URL fields. Mirrors DEVELOPER_ONLY_FIELDS in
// src/dashboard/dashboardApi.js — this is UX only (the backend already
// enforces this for real), so public users see a clear locked state
// instead of typing a link that silently gets dropped on save.
const DEVELOPER_ONLY_FIELD_NAMES = [
  'welcome_banner_url',
  'welcome_thumbnail_url',
  'verify_image_url',
  'qris_image_url',
  'testimonial_banner_url',
  'banner_url',
  'embed_image_url',
  'attachment_url',
  'image_url',
];

function applyDeveloperFieldLock() {
  if (state.isDeveloper) return;
  DEVELOPER_ONLY_FIELD_NAMES.forEach((name) => {
    content.querySelectorAll(`[name="${name}"]`).forEach((el) => {
      if (el.dataset.devLocked) return;
      el.dataset.devLocked = '1';
      el.disabled = true;
      el.placeholder = '🔒 Khusus Developer';
      el.value = '';
      el.style.opacity = '0.5';
      el.style.cursor = 'not-allowed';
    });
  });
}

// Auto-runs every time a panel re-renders (all views replace content.innerHTML),
// so this needs no changes whenever a new panel/field is added later.
new MutationObserver(() => applyDeveloperFieldLock()).observe(content, { childList: true, subtree: true });

function fmtRupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID');
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(message, isDanger = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isDanger ? ' danger' : '');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function setLoading() {
  content.innerHTML = '<div class="loading">MEMUAT DATA...</div>';
}

// ---------- Bootstrap: auth + guild selector ----------

async function bootstrap() {
  let me;
  try {
    const res = await fetch('/auth/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error();
    me = await res.json();
  } catch {
    window.location.href = '/index.html';
    return;
  }

  state.isDeveloper = !!me.isDeveloper;
  if (!state.isDeveloper) {
    document.querySelectorAll('[data-dev-only]').forEach((el) => el.remove());
  }

  document.getElementById('user-name').textContent = me.user.username;
  document.getElementById('user-avatar').src = me.user.avatar
    ? `https://cdn.discordapp.com/avatars/${me.user.id}/${me.user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const select = document.getElementById('guild-select');
  if (!me.guilds.length) {
    content.innerHTML = `<div class="empty-state">
      Anda login tapi belum ada server yang cocok.<br><br>
      Pastikan bot MICROSTORE sudah di-invite ke server Anda, dan Anda punya<br>
      izin <strong>Manage Server</strong> di server tersebut.
    </div>`;
    select.style.display = 'none';
    return;
  }

  select.innerHTML = me.guilds.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  select.addEventListener('change', () => {
    state.guildId = select.value;
    loadGuildMeta().then(() => renderView());
  });

  state.guildId = me.guilds[0].id;
  await loadGuildMeta();
  renderView();
}

async function loadGuildMeta() {
  try {
    state.meta = await Api.get(`/api/dashboard/guilds/${state.guildId}/meta`);
  } catch (err) {
    state.meta = { channels: [], roles: [] };
    toast('Gagal memuat data server: ' + err.message, true);
  }
}

// ---------- Nav wiring ----------

document.querySelectorAll('.nav-item').forEach((el) => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    el.classList.add('active');
    state.view = el.dataset.view;
    renderView();
  });
});
document.querySelector('.nav-item[data-view="overview"]').classList.add('active');

function logout() {
  Api.post('/auth/logout').finally(() => { window.location.href = '/index.html'; });
}

function renderView() {
  setLoading();
  const renderers = {
    overview: renderOverview,
    products: renderProducts,
    orders: renderOrders,
    payments: renderPayments,
    youtube: renderYoutube,
    broadcast: renderBroadcast,
    'quest-update': renderQuestUpdate,
    settings: renderSettings,
    logs: renderLogs,
    backups: renderBackups,
    'bot-profile': renderBotProfile,
  };
  (renderers[state.view] || renderOverview)().catch((err) => {
    content.innerHTML = `<div class="empty-state text-danger">ERROR: ${escapeHtml(err.message)}</div>`;
  });
}

// ---------- Overview / Analytics ----------

async function renderOverview() {
  const s = await Api.get(`/api/dashboard/guilds/${state.guildId}/analytics`);

  const statusBadge = (status) => {
    const map = { approved: 'success', pending: 'pending', rejected: 'danger' };
    return `<span class="badge badge-${map[status] || 'dim'}">${escapeHtml(status)}</span>`;
  };

  content.innerHTML = `
    <h1 class="page-title">Store Analytics</h1>
    <div class="page-subtitle">// Ringkasan performa toko — guild ${state.guildId}</div>

    <div class="stat-grid">
      ${statCard('Total Revenue', fmtRupiah(s.totalRevenue))}
      ${statCard('Approved Payments', s.approvedPayments)}
      ${statCard('Total Orders', s.totalOrders)}
      ${statCard('Unique Buyers', s.uniqueBuyers)}
      ${statCard('Avg. Order Value', fmtRupiah(s.avgOrderValue))}
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div class="hud-panel">
        <span class="corner-bl"></span><span class="corner-br"></span>
        <div class="panel-title">Orders by Status</div>
        ${s.ordersByStatus.length
          ? `<table><tbody>${s.ordersByStatus.map((o) => `<tr><td>${statusBadge(o.status)}</td><td class="mono text-dim">${o.count}</td></tr>`).join('')}</tbody></table>`
          : `<div class="empty-state">Belum ada order</div>`}
      </div>

      <div class="hud-panel">
        <span class="corner-bl"></span><span class="corner-br"></span>
        <div class="panel-title">Top Products</div>
        ${s.topProducts.length
          ? `<table><tbody>${s.topProducts.map((p, i) => `<tr><td>#${i + 1} ${escapeHtml(p.name)}</td><td class="mono text-cyan">${fmtRupiah(p.revenue)}</td></tr>`).join('')}</tbody></table>`
          : `<div class="empty-state">Belum ada data penjualan</div>`}
      </div>
    </div>

    <div class="hud-panel" style="margin-top:1rem;">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Recent Sales</div>
      <div id="recent-sales"><div class="loading">memuat...</div></div>
    </div>
  `;

  const sales = await Api.get(`/api/dashboard/guilds/${state.guildId}/analytics/recent-sales?limit=8`);
  document.getElementById('recent-sales').innerHTML = sales.length
    ? `<table><thead><tr><th>Buyer</th><th>Produk</th><th>Jumlah</th><th>Waktu</th></tr></thead><tbody>
        ${sales.map((s) => `<tr><td class="mono">${s.user_id}</td><td>${escapeHtml(s.product_name)}</td><td class="mono text-success">${fmtRupiah(s.amount)}</td><td class="mono text-dim">${fmtDate(s.reviewed_at)}</td></tr>`).join('')}
      </tbody></table>`
    : `<div class="empty-state">Belum ada penjualan</div>`;
}

function statCard(label, value) {
  return `<div class="hud-panel"><span class="corner-bl"></span><span class="corner-br"></span>
    <div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

// ---------- Products ----------

async function renderProducts() {
  const [products, settings] = await Promise.all([
    Api.get(`/api/dashboard/guilds/${state.guildId}/products`),
    Api.get(`/api/dashboard/guilds/${state.guildId}/settings`),
  ]);

  content.innerHTML = `
    <h1 class="page-title">Produk</h1>
    <div class="page-subtitle">// Kelola produk yang dijual di toko</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">💬 Pesan Ticket Saat Belum Ada Produk</div>
      <form id="empty-message-form">
        <label>Pesan ini muncul di ticket order kalau belum ada produk aktif</label>
        <textarea name="empty_catalog_message" rows="3" placeholder="⚠️ Belum ada produk yang tersedia saat ini. Hubungi admin untuk info lebih lanjut.">${escapeHtml(settings.empty_catalog_message || '')}</textarea>
        <div style="margin-top:1.2rem;"><button class="btn" type="submit">💾 Simpan Pesan</button></div>
      </form>
    </div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">📋 Kirim Katalog Produk ke Channel</div>
      <form id="catalog-form">
        <label>Channel Tujuan</label>
        <select name="channel_id" id="catalog-channel" required>
          <option value="">-- Pilih Channel --</option>
        </select>
        <label>Judul Embed (opsional)</label>
        <input name="title" placeholder="🛒 Katalog Produk MICROSTORE">
        <label>Deskripsi Embed (opsional)</label>
        <textarea name="description" rows="2" placeholder="Klik tombol di bawah untuk membuat ticket order..."></textarea>
        <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.6rem;">
          <input type="checkbox" name="show_products" style="width:auto;">
          Tampilkan daftar produk aktif di embed (opsional)
        </label>
        <label>Warna Embed</label>
        <input name="color" type="color" value="#5865f2">
        <label>URL Banner (opsional)</label>
        <input name="banner_url" placeholder="https://...">
        <div style="margin-top:1.2rem;"><button class="btn" type="submit">📨 Kirim Katalog ke Channel</button></div>
      </form>
    </div>
  `;

  // Populate catalog channel dropdown from meta
  const catalogChannelSelect = document.getElementById('catalog-channel');
  if (catalogChannelSelect && state.meta?.channels) {
    state.meta.channels.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `#${c.name}`;
      catalogChannelSelect.appendChild(opt);
    });
  }

  document.getElementById('empty-message-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.put(`/api/dashboard/guilds/${state.guildId}/settings`, {
        empty_catalog_message: fd.get('empty_catalog_message'),
      });
      toast('Pesan berhasil disimpan');
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });

  document.getElementById('catalog-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const channelId = fd.get('channel_id');
    if (!channelId) {
      toast('Pilih channel tujuan terlebih dahulu', true);
      return;
    }
    try {
      await Api.post(`/api/dashboard/guilds/${state.guildId}/catalog`, {
        channel_id: channelId,
        title: fd.get('title'),
        description: fd.get('description'),
        color: fd.get('color'),
        banner_url: fd.get('banner_url'),
        show_products: e.target.querySelector('[name="show_products"]').checked,
      });
      toast('Katalog berhasil dikirim ke channel');
      e.target.reset();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}

// ---------- Orders ----------

async function renderOrders() {
  const orders = await Api.get(`/api/dashboard/guilds/${state.guildId}/orders`);
  const statusBadge = (status) => {
    const map = { completed: 'success', pending: 'pending', cancelled: 'danger' };
    return `<span class="badge badge-${map[status] || 'dim'}">${escapeHtml(status)}</span>`;
  };

  content.innerHTML = `
    <h1 class="page-title">Orders</h1>
    <div class="page-subtitle">// Riwayat order buyer (read-only — kelola lewat Discord)</div>
    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      ${orders.length
        ? `<table><thead><tr><th>ID</th><th>Buyer</th><th>Produk</th><th>Qty</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>
            ${orders.map((o) => `<tr><td class="mono">#${o.id}</td><td class="mono">${o.user_id}</td><td class="mono">#${o.product_id}</td><td>${o.quantity}</td><td>${statusBadge(o.status)}</td><td class="mono text-dim">${fmtDate(o.created_at)}</td></tr>`).join('')}
          </tbody></table>`
        : `<div class="empty-state">Belum ada order</div>`}
    </div>
  `;
}

// ---------- Payments ----------

async function renderPayments() {
  const payments = await Api.get(`/api/dashboard/guilds/${state.guildId}/payments`);
  const statusBadge = (status) => {
    const map = { approved: 'success', pending: 'pending', rejected: 'danger' };
    return `<span class="badge badge-${map[status] || 'dim'}">${escapeHtml(status)}</span>`;
  };

  content.innerHTML = `
    <h1 class="page-title">Payments</h1>
    <div class="page-subtitle">// Riwayat pembayaran QRIS (approve/reject lewat tombol Discord)</div>
    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      ${payments.length
        ? `<table><thead><tr><th>ID</th><th>Buyer</th><th>Order</th><th>Jumlah</th><th>Status</th><th>Reviewed</th></tr></thead><tbody>
            ${payments.map((p) => `<tr><td class="mono">#${p.id}</td><td class="mono">${p.user_id}</td><td class="mono">#${p.order_id}</td><td class="mono text-cyan">${fmtRupiah(p.amount)}</td><td>${statusBadge(p.status)}</td><td class="mono text-dim">${fmtDate(p.reviewed_at)}</td></tr>`).join('')}
          </tbody></table>`
        : `<div class="empty-state">Belum ada pembayaran</div>`}
    </div>
  `;
}

// ---------- YouTube ----------

async function renderYoutube() {
  const channels = await Api.get(`/api/dashboard/guilds/${state.guildId}/youtube/channels`);
  const textChannels = state.meta?.channels || [];

  content.innerHTML = `
    <h1 class="page-title">YouTube Monitor</h1>
    <div class="page-subtitle">// Notifikasi otomatis saat ada video baru</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Tambah Channel</div>
      <form id="yt-form">
        <label>YouTube Channel ID (format UCxxxxxxxx)</label>
        <input name="youtube_channel_id" required placeholder="UCxxxxxxxxxxxxxxxxxxxxxx">
        <label>Nama Channel</label>
        <input name="youtube_channel_name" required>
        <label>Kirim notifikasi ke channel Discord</label>
        <select name="discord_channel_id" required>
          ${textChannels.map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <div style="margin-top:1.2rem;"><button class="btn" type="submit">+ Tambah Channel</button></div>
      </form>
    </div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Channel Dimonitor (${channels.length})</div>
      <div id="yt-list"></div>
    </div>
  `;

  const renderList = (list) => {
    document.getElementById('yt-list').innerHTML = list.length
      ? `<table><thead><tr><th>Channel</th><th>Notif ke</th><th>Last Check</th><th></th></tr></thead><tbody>
          ${list.map((c) => `<tr>
              <td><a href="https://www.youtube.com/channel/${c.youtube_channel_id}" target="_blank">${escapeHtml(c.youtube_channel_name)}</a></td>
              <td class="mono">#${(textChannels.find(t => t.id === c.channel_id) || {}).name || c.channel_id}</td>
              <td class="mono text-dim">${fmtDate(c.last_check)}</td>
              <td><button class="btn btn-danger" data-id="${c.id}" style="padding:0.3rem 0.7rem;font-size:0.7rem;">Hapus</button></td>
            </tr>`).join('')}
        </tbody></table>`
      : `<div class="empty-state">Belum ada channel dimonitor</div>`;

    document.querySelectorAll('#yt-list button[data-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus channel ini dari monitoring?')) return;
        try {
          await Api.delete(`/api/dashboard/youtube/channels/${btn.dataset.id}`);
          toast('Channel dihapus');
          renderYoutube();
        } catch (err) {
          toast('Gagal: ' + err.message, true);
        }
      });
    });
  };
  renderList(channels);

  document.getElementById('yt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post(`/api/dashboard/guilds/${state.guildId}/youtube/channels`, {
        youtube_channel_id: fd.get('youtube_channel_id'),
        youtube_channel_name: fd.get('youtube_channel_name'),
        discord_channel_id: fd.get('discord_channel_id'),
      });
      toast('Channel ditambahkan');
      renderYoutube();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}

// ---------- Broadcast ----------

async function renderBroadcast() {
  const channels = state.meta?.channels || [];

  content.innerHTML = `
    <h1 class="page-title">Broadcast</h1>
    <div class="page-subtitle">// Kirim pesan, embed, link, atau file ke channel manapun lewat bot</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Kirim Pesan</div>
      <form id="broadcast-form">
        <label>Channel Tujuan</label>
        <select name="channel_id" required>
          <option value="">-- Pilih Channel --</option>
          ${channels.map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('')}
        </select>

        <label>Pesan Teks (opsional, tampil di luar embed)</label>
        <textarea name="content" rows="2" placeholder="Contoh: @everyone ada promo baru!"></textarea>

        <label>Judul Embed (opsional)</label>
        <input name="embed_title" placeholder="Contoh: 🔥 Promo Spesial">

        <label>Deskripsi Embed (opsional, link juga bisa ditaruh di sini)</label>
        <textarea name="embed_description" rows="4" placeholder="Tulis isi pesan/embed di sini. Link akan otomatis jadi clickable."></textarea>

        <label>Warna Embed (opsional)</label>
        <input name="embed_color" type="color" value="#5865f2">

        <label>URL Gambar Embed (opsional)</label>
        <input name="embed_image_url" placeholder="https://...">

        <label>URL File/Lampiran (opsional, bisa gambar/zip/pdf dll lewat link)</label>
        <input name="attachment_url" placeholder="https://...">

        <div style="margin-top:1.2rem;"><button class="btn" type="submit">📨 Kirim Sekarang</button></div>
      </form>
    </div>
  `;

  document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const channelId = fd.get('channel_id');
    if (!channelId) {
      toast('Pilih channel tujuan terlebih dahulu', true);
      return;
    }

    try {
      await Api.post(`/api/dashboard/guilds/${state.guildId}/broadcast`, {
        channel_id: channelId,
        content: fd.get('content'),
        embed_title: fd.get('embed_title'),
        embed_description: fd.get('embed_description'),
        embed_color: fd.get('embed_color'),
        embed_image_url: fd.get('embed_image_url'),
        attachment_url: fd.get('attachment_url'),
      });
      toast('Pesan berhasil dikirim');
      e.target.reset();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}

// ---------- Quest Update ----------

async function renderQuestUpdate() {
  const channels = state.meta?.channels || [];
  const settings = await Api.get(`/api/dashboard/guilds/${state.guildId}/settings`);

  content.innerHTML = `
    <h1 class="page-title">Quest Update</h1>
    <div class="page-subtitle">// Kirim pengumuman quest baru ke channel pilihan kamu</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">🤖 Auto Quest Feed (api.discordquest.com)</div>
      <form id="quest-feed-form">
        <label style="display:flex; align-items:center; gap:0.5rem;">
          <input type="checkbox" name="quest_feed_quest_enabled" style="width:auto;" ${settings.quest_feed_quest_enabled ? 'checked' : ''}>
          Aktifkan auto-post <strong>Quest</strong> baru (cek tiap 1 jam)
        </label>
        <label>Channel Tujuan (Quest)</label>
        <select name="quest_feed_quest_channel">
          <option value="">-- Pilih Channel --</option>
          ${channels.map((c) => `<option value="${c.id}" ${c.id === settings.quest_feed_quest_channel ? 'selected' : ''}>#${escapeHtml(c.name)}</option>`).join('')}
        </select>

        <label style="display:flex; align-items:center; gap:0.5rem; margin-top:1.2rem;">
          <input type="checkbox" name="quest_feed_collectible_enabled" style="width:auto;" ${settings.quest_feed_collectible_enabled ? 'checked' : ''}>
          Aktifkan auto-post <strong>Collectible</strong> baru (cek tiap 1 jam)
        </label>
        <label>Channel Tujuan (Collectible)</label>
        <select name="quest_feed_collectible_channel">
          <option value="">-- Pilih Channel --</option>
          ${channels.map((c) => `<option value="${c.id}" ${c.id === settings.quest_feed_collectible_channel ? 'selected' : ''}>#${escapeHtml(c.name)}</option>`).join('')}
        </select>

        <div style="margin-top:1.2rem;"><button class="btn" type="submit">💾 Simpan Auto Feed</button></div>
      </form>
    </div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Detail Quest (Manual)</div>
      <form id="quest-form">
        <label>Channel Tujuan</label>
        <select name="channel_id" required>
          <option value="">-- Pilih Channel --</option>
          ${channels.map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('')}
        </select>

        <label>🎮 Game</label>
        <input name="game" placeholder="Contoh: Valorant" required>

        <label>🎁 Reward</label>
        <input name="reward" placeholder="Contoh: Avatar Decoration" required>

        <label>⏰ Expires</label>
        <input name="expires" placeholder="Contoh: 14 Days">

        <label>📎 Link Quest (opsional)</label>
        <input name="link" placeholder="https://discord.com/quests">

        <label>URL Gambar/Thumbnail (opsional)</label>
        <input name="image_url" placeholder="https://...">

        <div style="margin-top:1.2rem;"><button class="btn" type="submit">🔔 Kirim Quest Update</button></div>
      </form>
    </div>
  `;

  document.getElementById('quest-feed-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.put(`/api/dashboard/guilds/${state.guildId}/settings`, {
        quest_feed_quest_enabled: e.target.querySelector('[name="quest_feed_quest_enabled"]').checked,
        quest_feed_quest_channel: fd.get('quest_feed_quest_channel') || null,
        quest_feed_collectible_enabled: e.target.querySelector('[name="quest_feed_collectible_enabled"]').checked,
        quest_feed_collectible_channel: fd.get('quest_feed_collectible_channel') || null,
      });
      toast('Pengaturan Auto Quest Feed disimpan');
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });

  document.getElementById('quest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const channelId = fd.get('channel_id');
    if (!channelId) {
      toast('Pilih channel tujuan terlebih dahulu', true);
      return;
    }

    try {
      await Api.post(`/api/dashboard/guilds/${state.guildId}/quest-update`, {
        channel_id: channelId,
        game: fd.get('game'),
        reward: fd.get('reward'),
        expires: fd.get('expires'),
        link: fd.get('link'),
        image_url: fd.get('image_url'),
      });
      toast('Quest update berhasil dikirim');
      e.target.reset();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}

// ---------- Settings ----------

async function renderSettings() {
  const settings = await Api.get(`/api/dashboard/guilds/${state.guildId}/settings`);
  const channels = state.meta?.channels || [];
  const roles = state.meta?.roles || [];

  const channelOptions = (selected) =>
    `<option value="">— Pilih channel —</option>` +
    channels.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>#${escapeHtml(c.name)}</option>`).join('');
  const roleOptions = (selected) =>
    `<option value="">— Pilih role —</option>` +
    roles.map((r) => `<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
  const categoryOptions = (selected) =>
    `<option value="">— Tanpa kategori —</option>` +
    (state.meta?.categories || [])
      .map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
      .join('');

  content.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <div class="page-subtitle">// Konfigurasi server — sama seperti command /setup-*</div>

    <form id="settings-form">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">Welcome</div>
          <label>Channel Welcome</label>
          <select name="welcome_channel">${channelOptions(settings.welcome_channel)}</select>
          <label>Role Otomatis</label>
          <select name="welcome_role">${roleOptions(settings.welcome_role)}</select>
          <label>Pesan Welcome</label>
          <textarea name="welcome_message" rows="2">${escapeHtml(settings.welcome_message || '')}</textarea>

          <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.8rem;">
            <input type="checkbox" name="welcome_embed_enabled" ${settings.welcome_embed_enabled ? 'checked' : ''} style="width:auto;">
            Tampilkan sebagai Embed + Banner
          </label>
          <label>Judul Embed</label>
          <input name="welcome_embed_title" value="${escapeHtml(settings.welcome_embed_title || '')}" placeholder="👋 Selamat Datang!">
          <label>Warna Embed</label>
          <input name="welcome_embed_color" type="color" value="${settings.welcome_embed_color || '#5865f2'}">
          <label>URL Banner (gambar besar di bawah embed)</label>
          <input name="welcome_banner_url" value="${escapeHtml(settings.welcome_banner_url || '')}" placeholder="https://...">
          <label>URL Thumbnail (kecil di kanan atas, default: avatar member)</label>
          <input name="welcome_thumbnail_url" value="${escapeHtml(settings.welcome_thumbnail_url || '')}" placeholder="https://...">

          <div style="margin-top:0.8rem;">
            <button type="button" id="send-welcome-test-btn" class="btn btn-ghost btn-sm">📨 Simpan &amp; Kirim ke Channel (Preview)</button>
          </div>
        </div>

        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">Verification</div>
          <label>Channel Verifikasi</label>
          <select name="verify_channel">${channelOptions(settings.verify_channel)}</select>
          <label>Role Setelah Verifikasi</label>
          <select name="verify_role">${roleOptions(settings.verify_role)}</select>
          <label>Role "Unverified" (akan dihapus otomatis setelah verifikasi)</label>
          <select name="unverified_role">${roleOptions(settings.unverified_role)}</select>

          <label>Judul Embed</label>
          <input name="verify_embed_title" value="${escapeHtml(settings.verify_embed_title || '')}" placeholder="✅ Verifikasi Akun">
          <label>Deskripsi Embed</label>
          <textarea name="verify_embed_description" rows="2" placeholder="Klik tombol di bawah untuk verifikasi akun kamu...">${escapeHtml(settings.verify_embed_description || '')}</textarea>
          <label>Warna Embed</label>
          <input name="verify_embed_color" type="color" value="${settings.verify_embed_color || '#57f287'}">
          <label>URL Gambar Embed</label>
          <input name="verify_image_url" value="${escapeHtml(settings.verify_image_url || '')}" placeholder="https://...">

          <div style="margin-top:0.8rem;">
            <button type="button" id="repost-verify-btn" class="btn btn-ghost btn-sm">🔁 Simpan &amp; Kirim Ulang Panel ke Channel</button>
          </div>
        </div>

        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">Roles &amp; Admin</div>
          <label>Buyer Role</label>
          <select name="buyer_role">${roleOptions(settings.buyer_role)}</select>
          <label>Admin Role (approve payment)</label>
          <select name="admin_role">${roleOptions(settings.admin_role)}</select>
        </div>

        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">Payment &amp; Logs</div>
          <label>Log Channel</label>
          <select name="log_channel">${channelOptions(settings.log_channel)}</select>
          <label>Rating Channel (log rating buyer masuk ke sini)</label>
          <select name="rating_channel">${channelOptions(settings.rating_channel)}</select>
          <label>URL Banner Testimoni (muncul di embed rating buyer)</label>
          <input name="testimonial_banner_url" value="${escapeHtml(settings.testimonial_banner_url || '')}" placeholder="https://...">
          <label>QRIS Image URL</label>
          <input name="qris_image_url" value="${escapeHtml(settings.qris_image_url || '')}" placeholder="https://...">
        </div>

        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">Bump Reminder</div>
          <label style="display:flex; align-items:center; gap:0.5rem;">
            <input type="checkbox" name="bump_reminder_enabled" ${settings.bump_reminder_enabled ? 'checked' : ''} style="width:auto;">
            Aktifkan reminder otomatis "/bump" setiap 2 jam
          </label>
          <label>Channel Reminder</label>
          <select name="bump_reminder_channel">${channelOptions(settings.bump_reminder_channel)}</select>
        </div>

        <div class="hud-panel">
          <span class="corner-bl"></span><span class="corner-br"></span>
          <div class="panel-title">🎫 Kategori Ticket</div>
          <label>Kategori untuk Order Ticket</label>
          <select name="order_category">${categoryOptions(settings.order_category)}</select>
          <label>Kategori untuk Support Ticket</label>
          <select name="support_category">${categoryOptions(settings.support_category)}</select>
          <div style="margin-top:0.6rem; font-size:0.78rem; color:var(--text-dim);">
            Buat 2 kategori channel berbeda di server Discord kamu (misal "🛒 ORDER" dan "🎫 SUPPORT"), lalu pilih di sini. Ticket order dan ticket support akan otomatis dibuat di kategori masing-masing.
          </div>
        </div>
      </div>

      <div style="margin-top:1.2rem;"><button class="btn" type="submit">💾 Simpan Settings</button></div>
    </form>

    <div class="hud-panel" style="margin-top:1.5rem;">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">📨 Kirim Panel Support ke Channel</div>
      <form id="support-panel-form">
        <label>Channel Tujuan</label>
        <select name="channel_id" required>
          <option value="">-- Pilih Channel --</option>
          ${channels.map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <label>Judul Panel (opsional)</label>
        <input name="title" placeholder="🎫 MicroStore - Support">
        <label>Deskripsi Panel (opsional)</label>
        <textarea name="description" rows="2" placeholder="Butuh bantuan? Klik tombol di bawah untuk membuka ticket support..."></textarea>
        <div style="margin-top:1.2rem;"><button class="btn" type="submit">📨 Pasang Panel Support</button></div>
      </form>
    </div>
  `;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.welcome_embed_enabled = e.target.querySelector('[name="welcome_embed_enabled"]').checked ? 1 : 0;
    body.bump_reminder_enabled = e.target.querySelector('[name="bump_reminder_enabled"]').checked ? 1 : 0;
    try {
      await Api.put(`/api/dashboard/guilds/${state.guildId}/settings`, body);
      toast('Settings disimpan');
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });

  document.getElementById('support-panel-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const channelId = fd.get('channel_id');
    if (!channelId) {
      toast('Pilih channel tujuan terlebih dahulu', true);
      return;
    }
    try {
      await Api.post(`/api/dashboard/guilds/${state.guildId}/support-panel`, {
        channel_id: channelId,
        title: fd.get('title'),
        description: fd.get('description'),
      });
      toast('Panel support berhasil dipasang di channel');
      e.target.reset();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });

  document.getElementById('repost-verify-btn').addEventListener('click', async () => {
    const form = document.getElementById('settings-form');
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    body.welcome_embed_enabled = form.querySelector('[name="welcome_embed_enabled"]').checked ? 1 : 0;
    body.bump_reminder_enabled = form.querySelector('[name="bump_reminder_enabled"]').checked ? 1 : 0;

    try {
      await Api.put(`/api/dashboard/guilds/${state.guildId}/settings`, body);
      await Api.post(`/api/dashboard/guilds/${state.guildId}/verify-panel/repost`, {});
      toast('Panel verifikasi berhasil dikirim ulang ke channel');
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });

  document.getElementById('send-welcome-test-btn').addEventListener('click', async () => {
    const form = document.getElementById('settings-form');
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    body.welcome_embed_enabled = form.querySelector('[name="welcome_embed_enabled"]').checked ? 1 : 0;
    body.bump_reminder_enabled = form.querySelector('[name="bump_reminder_enabled"]').checked ? 1 : 0;

    try {
      await Api.put(`/api/dashboard/guilds/${state.guildId}/settings`, body);
      await Api.post(`/api/dashboard/guilds/${state.guildId}/welcome-panel/send-test`, {});
      toast('Preview welcome berhasil dikirim ke channel');
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}

// ---------- Logs & Transcripts ----------

async function renderLogs() {
  const [logs, transcripts] = await Promise.all([
    Api.get(`/api/dashboard/guilds/${state.guildId}/logs`),
    Api.get(`/api/dashboard/guilds/${state.guildId}/transcripts`),
  ]);

  content.innerHTML = `
    <h1 class="page-title">Logs &amp; Transcripts</h1>
    <div class="page-subtitle">// Riwayat aktivitas dan transkrip tiket</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Activity Log</div>
      ${logs.length
        ? `<div class="mono" style="max-height:320px; overflow-y:auto; font-size:0.82rem; line-height:1.7;">
            ${logs.map((l) => `<div><span class="text-dim">${fmtDate(l.created_at)}</span> <span class="badge badge-dim">${escapeHtml(l.type)}</span> ${escapeHtml(l.message)}</div>`).join('')}
          </div>`
        : `<div class="empty-state">Belum ada log</div>`}
    </div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">Ticket Transcripts</div>
      ${transcripts.length
        ? `<table><thead><tr><th>Channel</th><th>Tipe</th><th>Exported</th><th></th></tr></thead><tbody>
            ${transcripts.map((t) => `<tr><td>${escapeHtml(t.channel_name)}</td><td><span class="badge badge-dim">${escapeHtml(t.ticket_type)}</span></td><td class="mono text-dim">${fmtDate(t.exported_at)}</td><td><a class="btn btn-ghost" style="padding:0.3rem 0.7rem;font-size:0.7rem;" href="/api/dashboard/transcripts/${t.id}/download">Download</a></td></tr>`).join('')}
          </tbody></table>`
        : `<div class="empty-state">Belum ada transcript</div>`}
    </div>
  `;
}

// ---------- Backups ----------

async function renderBackups() {
  const backups = await Api.get('/api/dashboard/backups');

  content.innerHTML = `
    <h1 class="page-title">Database Backups</h1>
    <div class="page-subtitle">// Backup mencakup seluruh database (semua server)</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="flex justify-between items-center">
        <div class="panel-title" style="margin:0;">Backup Tersimpan (${backups.length})</div>
        <button class="btn" id="create-backup-btn">+ Buat Backup Sekarang</button>
      </div>
      <div id="backup-list" style="margin-top:1rem;"></div>
    </div>
  `;

  const renderList = (list) => {
    document.getElementById('backup-list').innerHTML = list.length
      ? `<table><thead><tr><th>Filename</th><th>Ukuran</th><th>Dibuat</th><th></th></tr></thead><tbody>
          ${list.map((b) => `<tr><td class="mono">${escapeHtml(b.filename)}</td><td class="mono">${(b.sizeBytes / 1024).toFixed(1)} KB</td><td class="mono text-dim">${fmtDate(b.createdAt)}</td><td><a class="btn btn-ghost" style="padding:0.3rem 0.7rem;font-size:0.7rem;" href="/api/dashboard/backups/${b.filename}/download">Download</a></td></tr>`).join('')}
        </tbody></table>`
      : `<div class="empty-state">Belum ada backup. Klik "Buat Backup Sekarang".</div>`;
  };
  renderList(backups);

  document.getElementById('create-backup-btn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Membuat backup...';
    try {
      await Api.post('/api/dashboard/backups', { triggeredBy: 'dashboard-ui' });
      toast('Backup berhasil dibuat');
      renderBackups();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
      e.target.disabled = false;
      e.target.textContent = '+ Buat Backup Sekarang';
    }
  });
}

bootstrap();


// ---------- Bot Profile (developer-only) ----------

async function renderBotProfile() {
  if (!state.isDeveloper) {
    content.innerHTML = `<div class="empty-state">Halaman ini khusus developer bot.</div>`;
    return;
  }

  const profile = await Api.get(`/api/dashboard/bot-profile`);

  content.innerHTML = `
    <h1 class="page-title">Bot Profile</h1>
    <div class="page-subtitle">// Identitas bot (username, avatar, banner, deskripsi) — berlaku global di semua server</div>

    <div class="hud-panel">
      <span class="corner-bl"></span><span class="corner-br"></span>
      <div class="panel-title">🤖 Identitas Bot</div>
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.2rem;">
        <img src="${profile.avatar_url}" alt="avatar" style="width:64px; height:64px; border-radius:50%;">
        <div>
          <div style="font-weight:600;">${escapeHtml(profile.username)}</div>
        </div>
      </div>
      <form id="bot-profile-form">
        <label>Username Bot</label>
        <input name="username" value="${escapeHtml(profile.username)}" placeholder="Nama bot (rate-limited oleh Discord, ~2x/jam)">

        <label>URL Avatar Baru (opsional)</label>
        <input name="avatar_url" placeholder="https://...">

        <label>URL Banner Profil Baru (opsional)</label>
        <input name="banner_url" placeholder="https://...">

        <label>Deskripsi / Bio Bot (About Me)</label>
        <textarea name="description" rows="4">${escapeHtml(profile.description || '')}</textarea>

        <div style="margin-top:1.2rem;"><button class="btn" type="submit">💾 Simpan Perubahan</button></div>
      </form>
    </div>
  `;

  document.getElementById('bot-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.put(`/api/dashboard/bot-profile`, {
        username: fd.get('username') || undefined,
        avatar_url: fd.get('avatar_url') || undefined,
        banner_url: fd.get('banner_url') || undefined,
        description: fd.get('description'),
      });
      toast('Profil bot berhasil diperbarui');
      renderBotProfile();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
    }
  });
}
