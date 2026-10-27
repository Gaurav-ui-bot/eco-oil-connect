/* Eco Oil Connect shared code: accounts, requests, status flow, navigation, Google Maps.
   Data is kept in the browser (localStorage) so the project runs with no server.
   To go beyond a demo, replace the functions in the "data" section with calls to a real backend. */
(function () {
  var DB_KEY = 'eoc_db_v1', SES_KEY = 'eoc_session_v1';

  var STATUS = { submitted: 'Submitted', accepted: 'Accepted', picked_up: 'Picked up', delivered: 'Delivered', rejected: 'Rejected' };
  var STEPS = ['submitted', 'accepted', 'picked_up', 'delivered'];
  var STEP_LABEL = { submitted: 'Requested', accepted: 'Accepted', picked_up: 'Picked up', delivered: 'At biofuel company' };
  var CONTACT = { email: 'sengargaurav500@gmail.com', phone: '9875262172' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(t) {
    return new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- data ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(DB_KEY));
      if (d && d.users) return d;
    } catch (e) {}
    var seed = {
      users: [{ id: 'u_admin', role: 'admin', name: 'Admin', contact: 'Admin', email: 'admin@ecooil.local', password: 'admin123', phone: '', address: '', created: Date.now() }],
      requests: [],
      messages: []
    };
    save(seed);
    return seed;
  }
  function save(d) { localStorage.setItem(DB_KEY, JSON.stringify(d)); }
  function me() {
    var id = localStorage.getItem(SES_KEY);
    if (!id) return null;
    return load().users.filter(function (u) { return u.id === id; })[0] || null;
  }
  function login(email, pw) {
    var e = String(email).trim().toLowerCase();
    var u = load().users.filter(function (x) { return x.email.toLowerCase() === e && x.password === pw; })[0];
    if (!u) return null;
    localStorage.setItem(SES_KEY, u.id);
    return u;
  }
  function logout() { localStorage.removeItem(SES_KEY); }
  function register(data) {
    var d = load();
    var e = String(data.email).trim().toLowerCase();
    if (d.users.some(function (u) { return u.email.toLowerCase() === e; })) return { ok: false, error: 'That email is already registered.' };
    if (String(data.password).length < 6) return { ok: false, error: 'Use a password of at least 6 characters.' };
    var u = {
      id: uid('u'), role: data.role === 'collector' ? 'collector' : 'restaurant',
      name: data.name.trim(), contact: data.contact.trim(), email: e, password: data.password,
      phone: data.phone.trim(), address: data.address.trim(), weekly: Number(data.weekly) || 0, created: Date.now()
    };
    d.users.push(u); save(d);
    localStorage.setItem(SES_KEY, u.id);
    return { ok: true, user: u };
  }
  function addRequest(r) {
    var d = load(), u = me();
    var req = {
      id: uid('r'), restaurantId: u.id, restaurantName: r.name, contact: r.contact, phone: r.phone,
      address: r.address, lat: r.lat, lng: r.lng, litres: Number(r.litres), container: r.container,
      readyDate: r.readyDate, window: r.window, notes: r.notes,
      status: 'submitted', collectorId: null, collectorName: '', biofuel: '',
      created: Date.now(), history: [{ status: 'submitted', at: Date.now(), by: u.name }]
    };
    d.requests.push(req); save(d);
    return req;
  }
  function setStatus(id, status, extra) {
    var d = load(), u = me();
    var r = d.requests.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.status = status;
    if (status === 'accepted' && u && u.role === 'collector') { r.collectorId = u.id; r.collectorName = u.name; }
    if (extra && extra.biofuel) r.biofuel = extra.biofuel;
    r.history.push({ status: status, at: Date.now(), by: u ? u.name : 'System' });
    save(d);
  }
  function deleteRequest(id) { var d = load(); d.requests = d.requests.filter(function (r) { return r.id !== id; }); save(d); }
  function deleteUser(id) { var d = load(); d.users = d.users.filter(function (u) { return u.id !== id; }); save(d); }
  function addMessage(m) {
    var d = load();
    d.messages.push({ id: uid('m'), name: m.name, email: m.email, text: m.text, at: Date.now() });
    save(d);
  }
  /* requests the signed-in person is allowed to see */
  function visibleRequests() {
    var u = me(), all = load().requests;
    if (!u) return [];
    if (u.role === 'admin') return all;
    if (u.role === 'restaurant') return all.filter(function (r) { return r.restaurantId === u.id; });
    return all.filter(function (r) { return r.status === 'submitted' || r.collectorId === u.id; });
  }
  function mapsLink(r) {
    var q = (r.lat != null && r.lng != null) ? r.lat + ',' + r.lng : encodeURIComponent(r.address);
    return 'https://www.google.com/maps/search/?api=1&query=' + q;
  }

  /* ---------- page chrome ---------- */
  function currentPage() { return location.pathname.split('/').pop() || 'index.html'; }
  function nav() {
    var u = me(), page = currentPage();
    var L = [['index.html', 'Home'], ['about.html', 'About Us']];
    if (u && u.role === 'restaurant') L.push(['sell.html', 'Sell Used Oil']);
    if (u) { L.push(['requests.html', 'Collection Requests']); L.push(['dashboard.html', 'Dashboard']); }
    if (u && u.role === 'admin') L.push(['admin.html', 'Admin Panel']);
    L.push(['contact.html', 'Contact Us']);
    var html = '<header class="topbar"><div class="wrap"><a class="brand" href="index.html"><span class="drop" aria-hidden="true"></span>Eco Oil Connect</a><nav class="links" aria-label="Main">';
    L.forEach(function (l) { html += '<a href="' + l[0] + '"' + (page === l[0] ? ' class="on"' : '') + '>' + l[1] + '</a>'; });
    if (u) html += '<span class="who">' + esc(u.name) + ' (' + u.role + ')</span><a href="#" id="logout">Log out</a>';
    else html += '<a href="auth.html"' + (page === 'auth.html' ? ' class="on"' : '') + '>Register / Login</a>';
    html += '</nav></div></header>';
    var el = document.getElementById('nav');
    if (el) el.innerHTML = html;
    var lo = document.getElementById('logout');
    if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); logout(); location.href = 'index.html'; });
  }
  function footer() {
    var el = document.getElementById('foot');
    if (!el) return;
    el.innerHTML = '<footer class="site"><div class="wrap"><div><strong>Eco Oil Connect</strong><br><span class="muted">Connecting used cooking oil with the people who collect it.</span></div><div class="mono">' + esc(CONTACT.email) + '<br>' + esc(CONTACT.phone) + '</div></div></footer>';
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  /* returns the signed-in user, or null after sending the visitor to login / showing a message */
  function guard(roles) {
    var u = me();
    if (!u) { location.href = 'auth.html?next=' + encodeURIComponent(currentPage()); return null; }
    if (roles && roles.indexOf(u.role) < 0) {
      document.getElementById('content').innerHTML = '<div class="empty">This page is for ' + roles.join(' or ') + ' accounts. You are signed in as ' + esc(u.role) + '.</div>';
      return null;
    }
    return u;
  }
  function boot() { nav(); footer(); }

  /* ---------- Google Maps ---------- */
  function keyOk() {
    var k = window.EOC_CONFIG && EOC_CONFIG.GOOGLE_MAPS_API_KEY;
    return !!k && k.indexOf('YOUR_') !== 0;
  }
  var mapsPromise = null;
  function loadMaps() {
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise(function (resolve) {
      if (window.google && google.maps) return resolve(true);
      if (!keyOk()) return resolve(false);
      window.__eocMapsReady = function () { resolve(true); };
      window.gm_authFailure = function () { resolve(false); document.querySelectorAll('.map').forEach(function (m) { m.innerHTML = '<div class="notice">Google rejected the API key. Check the key, the enabled APIs and the allowed website address.</div>'; }); };
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(EOC_CONFIG.GOOGLE_MAPS_API_KEY) + '&callback=__eocMapsReady';
      s.async = true;
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return mapsPromise;
  }
  function mapsMissingNote(el) {
    el.innerHTML = '<div class="notice">Map is off. Add your Google Maps API key in config.js to turn it on. Everything else works without it.</div>';
  }

  window.EOC = {
    esc: esc, fmtDate: fmtDate, STATUS: STATUS, STEPS: STEPS, STEP_LABEL: STEP_LABEL, CONTACT: CONTACT,
    load: load, me: me, login: login, logout: logout, register: register,
    addRequest: addRequest, setStatus: setStatus, deleteRequest: deleteRequest, deleteUser: deleteUser,
    addMessage: addMessage, visibleRequests: visibleRequests, mapsLink: mapsLink,
    boot: boot, guard: guard, toast: toast, loadMaps: loadMaps, mapsMissingNote: mapsMissingNote, keyOk: keyOk
  };
})();
