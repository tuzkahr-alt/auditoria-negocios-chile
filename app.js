// ─── STATE ───────────────────────────────────────────────────────
let allResults = [];
let filteredResults = [];
let currentView = 'cards';
let map, service, geocoder;
let searchQueue = [];
let isSearching = false;

const CATEGORY_MAP = {
  todos: ['restaurant', 'store', 'hair_care', 'car_repair', 'gym', 'lodging', 'supermarket', 'pharmacy', 'dentist', 'lawyer', 'bakery', 'beauty_salon', 'clothing_store', 'electronics_store', 'furniture_store', 'hardware_store', 'jewelry_store', 'shoe_store', 'florist', 'pet_store'],
  restaurant: ['restaurant', 'cafe', 'bakery', 'bar', 'food'],
  store: ['store', 'clothing_store', 'electronics_store', 'furniture_store', 'hardware_store', 'jewelry_store', 'shoe_store', 'book_store'],
  hair_care: ['hair_care', 'beauty_salon', 'spa'],
  car_repair: ['car_repair', 'car_wash', 'gas_station'],
  gym: ['gym', 'stadium'],
  lodging: ['lodging'],
  supermarket: ['supermarket', 'grocery_or_supermarket'],
  pharmacy: ['pharmacy', 'doctor', 'hospital'],
  dentist: ['dentist'],
  lawyer: ['lawyer', 'accounting', 'finance', 'insurance_agency', 'real_estate_agency']
};

const CATEGORY_LABELS = {
  restaurant: 'Restaurante/Café', store: 'Tienda/Comercio', hair_care: 'Peluquería/Estética',
  car_repair: 'Taller/Auto', gym: 'Gimnasio/Deporte', lodging: 'Hospedaje', supermarket: 'Supermercado',
  pharmacy: 'Farmacia/Salud', dentist: 'Dentista', lawyer: 'Servicios Profesionales',
  bakery: 'Panadería', beauty_salon: 'Salón de Belleza', clothing_store: 'Ropa',
  electronics_store: 'Electrónica', furniture_store: 'Mueblería', hardware_store: 'Ferretería',
  jewelry_store: 'Joyería', shoe_store: 'Zapatería', florist: 'Florería',
  pet_store: 'Mascotas', cafe: 'Café', bar: 'Bar', food: 'Comida',
  car_wash: 'Lavado de Autos', gas_station: 'Gasolinera', stadium: 'Estadio/Cancha',
  grocery_or_supermarket: 'Almacén', doctor: 'Médico', hospital: 'Hospital',
  accounting: 'Contabilidad', finance: 'Finanzas', insurance_agency: 'Seguros',
  real_estate_agency: 'Inmobiliaria'
};

// ─── INIT ─────────────────────────────────────────────────────────
window.onload = () => {
  const saved = localStorage.getItem('gmaps_api_key');
  if (saved) document.getElementById('apiKey').value = saved;
};

function saveKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) return alert('Ingresa una API Key válida');
  localStorage.setItem('gmaps_api_key', key);
  showStatus('API Key guardada ✓', false);
  setTimeout(() => hideStatus(), 2000);
}

// ─── GOOGLE MAPS LOADER ──────────────────────────────────────────
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) { resolve(); return; }
    window.__gmapsCallback = () => { resolve(); };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapsCallback`;
    script.onerror = () => reject(new Error('Error cargando Google Maps. Verifica tu API Key.'));
    document.head.appendChild(script);
  });
}

// ─── SEARCH ───────────────────────────────────────────────────────
async function startSearch() {
  const apiKey = document.getElementById('apiKey').value.trim() || localStorage.getItem('gmaps_api_key');
  if (!apiKey) {
    alert('Necesitas ingresar tu API Key de Google Maps primero.\n\nEncuéntrala en: console.cloud.google.com → APIs → Credentials');
    return;
  }

  const city = document.getElementById('city').value.trim();
  if (!city) { alert('Ingresa una ciudad o zona'); return; }

  const categoryKey = document.getElementById('category').value;
  const radius = parseInt(document.getElementById('radius').value);

  allResults = [];
  filteredResults = [];
  updateStats();
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('resultsGrid').classList.add('hidden');
  document.getElementById('resultsList').classList.add('hidden');
  document.getElementById('exportBtn').disabled = true;
  document.getElementById('searchBtn').disabled = true;
  showStatus(`Iniciando búsqueda en ${city}...`);

  try {
    await loadGoogleMaps(apiKey);
    const types = CATEGORY_MAP[categoryKey] || CATEGORY_MAP.todos;
    const location = await geocodeCity(city);
    showStatus(`Buscando ${types.length} categorías en ${city}...`);

    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);
    map = new google.maps.Map(mapDiv, { center: location, zoom: 14 });
    service = new google.maps.places.PlacesService(map);

    const seen = new Set();
    for (let i = 0; i < types.length; i++) {
      showStatus(`Buscando: ${CATEGORY_LABELS[types[i]] || types[i]} (${i+1}/${types.length})...`);
      const results = await searchByType(location, radius, types[i]);
      for (const r of results) {
        if (!seen.has(r.place_id)) {
          seen.add(r.place_id);
          if (!r.website) {
            allResults.push(r);
            renderResult(r);
          }
        }
      }
      updateStats();
      await sleep(200);
    }

    hideStatus();
    document.getElementById('searchBtn').disabled = false;
    document.getElementById('exportBtn').disabled = allResults.length === 0;
    filteredResults = [...allResults];
    applySort();

    if (allResults.length === 0) {
      showStatus('No se encontraron negocios sin sitio web en esta área. Prueba aumentar el radio.', false);
    }

  } catch (err) {
    hideStatus();
    document.getElementById('searchBtn').disabled = false;
    alert('Error: ' + err.message);
    console.error(err);
  }
}

function geocodeCity(city) {
  return new Promise((resolve, reject) => {
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: city }, (results, status) => {
      if (status === 'OK') resolve(results[0].geometry.location);
      else reject(new Error(`No se pudo encontrar "${city}"`));
    });
  });
}

function searchByType(location, radius, type) {
  return new Promise((resolve) => {
    const request = { location, radius, type };
    const allPlaces = [];

    function fetch(token) {
      const req = token ? { ...request, pageToken: token } : request;
      service.nearbySearch(req, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          allPlaces.push(...results);
          if (pagination && pagination.hasNextPage && allPlaces.length < 60) {
            setTimeout(() => pagination.nextPage(), 300);
          } else {
            resolve(allPlaces.map(p => formatPlace(p, type)));
          }
        } else {
          resolve([]);
        }
      });
    }
    fetch(null);
  });
}

function formatPlace(place, type) {
  return {
    place_id: place.place_id,
    name: place.name,
    address: place.vicinity || place.formatted_address || '—',
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    rating: place.rating || null,
    reviews: place.user_ratings_total || 0,
    types: place.types || [],
    category: CATEGORY_LABELS[type] || type,
    maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    open_now: place.opening_hours?.open_now
  };
}

// ─── RENDER ───────────────────────────────────────────────────────
function renderResult(place) {
  const grid = document.getElementById('resultsGrid');
  grid.classList.remove('hidden');
  currentView === 'cards' ? renderCard(place) : null;
  renderListRow(place);
}

function renderCard(p) {
  const grid = document.getElementById('resultsGrid');
  const stars = p.rating ? '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) : null;
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.placeId = p.place_id;
  card.innerHTML = `
    <div class="card-header">
      <div class="card-name">${esc(p.name)}</div>
      <div class="card-category">${esc(p.category)}</div>
    </div>
    <div class="card-address">📍 ${esc(p.address)}</div>
    ${stars ? `<div class="card-rating"><span class="stars">${stars}</span><span style="font-weight:600">${p.rating.toFixed(1)}</span><span class="review-count">(${p.reviews.toLocaleString()} reseñas)</span></div>` : ''}
    <div class="card-actions">
      ${p.phone
        ? `<a class="btn-call" href="tel:${p.phone}">📞 ${esc(p.phone)}</a>`
        : `<span class="no-phone">Sin teléfono registrado</span>`}
      <a class="btn-maps" href="${p.maps_url}" target="_blank">🗺 Maps</a>
      <button class="btn-detail" onclick="showDetail('${p.place_id}')">Ver más</button>
    </div>
  `;
  grid.appendChild(card);
}

function renderListRow(p) {
  const body = document.getElementById('listBody');
  const tr = document.createElement('tr');
  tr.dataset.placeId = p.place_id;
  tr.innerHTML = `
    <td>${esc(p.name)}</td>
    <td>${esc(p.category)}</td>
    <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.address)}</td>
    <td>${p.phone ? `<a href="tel:${p.phone}" style="color:var(--green);font-weight:500">${esc(p.phone)}</a>` : '<span style="color:var(--text3)">—</span>'}</td>
    <td>${p.rating ? `${p.rating.toFixed(1)} ★` : '—'}</td>
    <td><a class="btn-maps" href="${p.maps_url}" target="_blank" style="font-size:12px">Maps</a></td>
  `;
  body.appendChild(tr);
}

function rebuildViews() {
  document.getElementById('resultsGrid').innerHTML = '';
  document.getElementById('listBody').innerHTML = '';
  filteredResults.forEach(p => {
    renderCard(p);
    renderListRow(p);
  });
  updateStats();
}

// ─── FILTER & SORT ────────────────────────────────────────────────
function filterResults() {
  const q = document.getElementById('filterInput').value.toLowerCase();
  filteredResults = allResults.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.address.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.phone && p.phone.includes(q))
  );
  rebuildViews();
}

function sortResults() { applySort(); }

function applySort() {
  const by = document.getElementById('sortSelect').value;
  filteredResults.sort((a, b) => {
    if (by === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (by === 'reviews') return b.reviews - a.reviews;
    return a.name.localeCompare(b.name, 'es');
  });
  rebuildViews();
}

// ─── VIEW TOGGLE ─────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  document.getElementById('viewCards').classList.toggle('active', v === 'cards');
  document.getElementById('viewList').classList.toggle('active', v === 'list');
  document.getElementById('resultsGrid').classList.toggle('hidden', v !== 'cards');
  document.getElementById('resultsList').classList.toggle('hidden', v !== 'list');
}

// ─── MODAL DETAIL ─────────────────────────────────────────────────
function showDetail(placeId) {
  const p = allResults.find(r => r.place_id === placeId);
  if (!p) return;
  const stars = p.rating ? '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) : null;
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-name">${esc(p.name)}</div>
    <div class="modal-cat">${esc(p.category)}</div>
    <div class="modal-section">
      <h4>Información</h4>
      <div class="modal-row"><span>Dirección</span><span>${esc(p.address)}</span></div>
      ${p.phone ? `<div class="modal-row"><span>Teléfono</span><span style="color:var(--green);font-weight:500">${esc(p.phone)}</span></div>` : ''}
      ${p.rating ? `<div class="modal-row"><span>Rating</span><span>${stars} ${p.rating.toFixed(1)} (${p.reviews.toLocaleString()} reseñas)</span></div>` : ''}
      ${p.open_now !== null && p.open_now !== undefined
        ? `<div class="modal-row"><span>Estado</span><span style="color:${p.open_now ? 'var(--green)' : 'var(--red)'}">${p.open_now ? 'Abierto ahora' : 'Cerrado ahora'}</span></div>`
        : ''}
      <div class="modal-row"><span>Sitio web</span><span style="color:var(--red)">❌ No tiene</span></div>
    </div>
    <div class="note-box">💡 Este negocio no tiene sitio web — una oportunidad para ofrecerle servicios digitales.</div>
    <div class="modal-actions">
      ${p.phone ? `<a class="btn-call" href="tel:${p.phone}">📞 Llamar</a>` : ''}
      <a class="btn-maps" href="${p.maps_url}" target="_blank">🗺 Ver en Maps</a>
    </div>
  `;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.add('hidden');
  }
}

// ─── EXPORT ───────────────────────────────────────────────────────
function exportToExcel() {
  const data = [
    ['Nombre', 'Categoría', 'Dirección', 'Teléfono', 'Rating', 'Reseñas', 'Link Google Maps', 'Sitio Web']
  ];
  filteredResults.forEach(p => {
    data.push([
      p.name, p.category, p.address,
      p.phone || '', p.rating || '', p.reviews,
      p.maps_url, 'Sin sitio web'
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [22,18,35,16,8,10,50,14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Negocios sin web');
  const city = document.getElementById('city').value.replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `auditoria_${city}_${date()}.xlsx`);
}

// ─── STATS ────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('totalFound').textContent = allResults.length;
  document.getElementById('totalNoWeb').textContent = allResults.length;
  document.getElementById('totalWithPhone').textContent = allResults.filter(r => r.phone).length;
}

// ─── STATUS ───────────────────────────────────────────────────────
function showStatus(msg, loading = true) {
  document.getElementById('statusMsg').textContent = msg;
  document.getElementById('loader').style.display = loading ? 'block' : 'none';
  document.getElementById('statusBanner').classList.remove('hidden');
}
function hideStatus() {
  document.getElementById('statusBanner').classList.add('hidden');
}

// ─── HELPERS ─────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function date() { return new Date().toISOString().slice(0,10); }
