/* Eco Oil Connect shared code: accounts, requests, status flow, navigation, maps.
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
      if (d && d.users) { d.settings = d.settings || { buyRate: 40, sellRate: 55 }; return d; }
    } catch (e) {}
    var seed = {
      users: [{ id: 'u_admin', role: 'admin', name: 'Admin', contact: 'Admin', email: 'admin@ecooil.local', password: 'admin123', phone: '', address: '', created: Date.now() }],
      requests: [],
      messages: [],
      settings: { buyRate: 40, sellRate: 55 }
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
  /* ---------- rates and profit ----------
     buyRate  = rupees per litre paid to the restaurant
     sellRate = rupees per litre paid by the biofuel company
     Each request keeps the rates in force when it was raised. */
  function getRates() { var s = load().settings; return { buy: Number(s.buyRate), sell: Number(s.sellRate) }; }
  function setRates(buy, sell) { var d = load(); d.settings = { buyRate: Number(buy), sellRate: Number(sell) }; save(d); }
  function money(r) {
    var rt = getRates();
    var b = r.buyRate != null ? r.buyRate : rt.buy, s = r.sellRate != null ? r.sellRate : rt.sell;
    return { buy: b, sell: s, paid: r.litres * b, earned: r.litres * s, profit: r.litres * (s - b) };
  }
  function totals() {
    var t = { litres: 0, paid: 0, earned: 0, profit: 0 };
    load().requests.filter(function (r) { return r.status === 'delivered'; }).forEach(function (r) {
      var m = money(r); t.litres += r.litres; t.paid += m.paid; t.earned += m.earned; t.profit += m.profit;
    });
    return t;
  }
  function inr(n) { return '\u20B9' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

  function addRequest(r) {
    var d = load(), u = me(), rt = getRates();
    var req = {
      id: uid('r'), restaurantId: u.id, restaurantName: r.name, contact: r.contact, phone: r.phone,
      address: r.address, lat: r.lat, lng: r.lng, litres: Number(r.litres), container: r.container,
      readyDate: r.readyDate, window: r.window, notes: r.notes,
      buyRate: rt.buy, sellRate: rt.sell,
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

  /* ---------- Maps (Leaflet + OpenStreetMap, no API key needed) ---------- */
  var LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  var mapsPromise = null;
  function loadMaps() {
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise(function (resolve) {
      if (window.L && L.map) return resolve(true);
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css';
      document.head.appendChild(css);
      var s = document.createElement('script');
      s.src = LEAFLET + 'leaflet.js';
      s.onload = function () { resolve(!!(window.L && L.map)); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return mapsPromise;
  }
  /* draws the OpenStreetMap map inside the element and returns the Leaflet map */
  function makeMap(el, zoom) {
    var c = (window.EOC_CONFIG && EOC_CONFIG.DEFAULT_CENTER) || { lat: 23.0225, lng: 72.5714 };
    var map = L.map(el).setView([c.lat, c.lng], zoom || 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    return map;
  }
  /* finds an address with OpenStreetMap search. If the full address is not found it retries with
     shorter versions (dropping the first parts, such as a flat or house number), so a nearby match still works.
     The callback gets {lat, lng, matched} or null. */
  function geocode(address, cb) {
    var text = String(address).replace(/\s+/g, ' ').trim();
    var parts = text.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var tries = [];
    if (parts.length > 1) {
      for (var i = 0; i < parts.length && tries.length < 4; i++) tries.push(parts.slice(i).join(', '));
    } else {
      var w = text.split(' ');
      tries.push(text);
      if (w.length > 3) tries.push(w.slice(2).join(' '));
      if (w.length > 2) tries.push(w.slice(-2).join(' '));
    }
    tries = tries.filter(function (t, i) { return t && tries.indexOf(t) === i; });
    function attempt(n) {
      if (n >= tries.length) return cb(null);
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(tries[n]))
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res[0]) cb({ lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon), matched: tries[n], exact: n === 0 });
          else attempt(n + 1);
        })
        .catch(function () { cb(null); });
    }
    attempt(0);
  }
  function mapsMissingNote(el) {
    el.innerHTML = '<div class="notice">The map could not load. Check your internet connection. Everything else works, and each request has an "Open in Google Maps" link.</div>';
  }

  window.EOC = {
    esc: esc, fmtDate: fmtDate, STATUS: STATUS, STEPS: STEPS, STEP_LABEL: STEP_LABEL, CONTACT: CONTACT,
    load: load, me: me, login: login, logout: logout, register: register,
    addRequest: addRequest, setStatus: setStatus, deleteRequest: deleteRequest, deleteUser: deleteUser,
    getRates: getRates, setRates: setRates, money: money, totals: totals, inr: inr,
    addMessage: addMessage, visibleRequests: visibleRequests, mapsLink: mapsLink,
    boot: boot, guard: guard, toast: toast, loadMaps: loadMaps, makeMap: makeMap, geocode: geocode, mapsMissingNote: mapsMissingNote
  };
})();
