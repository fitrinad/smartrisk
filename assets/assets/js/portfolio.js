/* ------------------------------------------------------------
   ---------- SmartRisk - Portfolio Interactive Map -----------
   ---------- MapLibre GL JS + geoBoundaries GeoJSON ----------
   ------------------------------------------------------------ */

let map;
let geojsonData;
let activeYear        = null;
let focusedProvinceId = null;

// For array-based showPin/hidePin
let activeMarkers = [];
let activePopups  = [];

let hoveredProvinceId = null;
let tooltip           = null;

// ---------- INIT MAP ---------- //
function initMap() {
    map = new maplibregl.Map({
        container         : 'portfolio-map',
        style             : 'https://tiles.openfreemap.org/styles/positron',
        center            : [115, 5],
        zoom              : 1,
        minZoom           : 1,
        maxZoom           : 8,
        maxBounds : [
        [88, -15],   // southwest: [lng, lat] - west of Myanmar, south of Australia
        [145, 28]    // northeast: [lng, lat] - east of Philippines, north of Myanmar
        ],
        scrollZoom        : true,
        attributionControl: false,
    });

    // Forces MapLibre to recalculate size after grid layout settles
    setTimeout(() => map.resize(), 100);

    map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right'
    );

    map.on('load', () => {
        fetch(GEOJSON_PATH)
            .then(r => r.json())
            .then(data => {
                // Add numeric IDs required for feature-state
                data.features = data.features.map((f, i) => ({ ...f, id: i }));
                geojsonData = data;
                addProvinceLayers();
                setupMapInteraction();
                setupTooltip();

                // Select the most recent year on load
                if (PROJECT_DATA.length) {
                    selectYear(String(PROJECT_DATA[0].year));
                }
            });
    });
}

// ---------- ADD PROVINCE LAYERS ---------- //
function addProvinceLayers() {
    map.addSource('provinces', {
        type: 'geojson',
        data: geojsonData,
    });

    // Fill: uses feature-state for active / focused
    map.addLayer({
        id    : 'provinces-fill',
        type  : 'fill',
        source: 'provinces',
        paint : {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'focused'], false], '#3D9A1C',
                ['boolean', ['feature-state', 'active'],  false], '#5ABD2C',
                '#2A4A7F',
            ],
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'focused'], false], 0.95,
                ['boolean', ['feature-state', 'active'],  false], 0.75,
                0.35,
            ],
        },
    });

    // Stroke
    map.addLayer({
        id    : 'provinces-stroke',
        type  : 'line',
        source: 'provinces',
        paint : {
            'line-color'  : '#ffffff',
            'line-width'  : 0.5,
            'line-opacity': 0.6,
        },
    });
}

// ---------- TOOLTIP ---------- //
function setupTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'map-tooltip';
    document.getElementById('portfolio-map').appendChild(tooltip);
}

// ---------- MAP HOVER INTERACTION ---------- //
function setupMapInteraction() {
    map.on('mousemove', 'provinces-fill', (e) => {
        if (!e.features.length) return;

        const props   = e.features[0].properties;
        const iso     = props.shapeISO  || '';
        const name    = props.shapeName || '';
        const projects = getProjectsForProvince(iso, name);

        if (projects.length === 0) {
            map.getCanvas().style.cursor = '';
            hideTooltip();
            unfocusProvince();
            hidePins();
            unhighlightPanelItem();
            return;
        }

        map.getCanvas().style.cursor = 'pointer';

        // Collects all projects in the province for the active year
        const yearData = PROJECT_DATA.find(d => String(d.year) === activeYear);
        let matchingItems = [];
        if (yearData) {
            yearData.projects.forEach(group => {
                group.items.forEach(item => {
                    if (item.province === iso && item.coords) {
                        matchingItems.push(item);
                    }
                });
            });
        }

        focusProvince(iso);
        if (matchingItems.length) {
            showPins(matchingItems);
            highlightPanelItem(matchingItems.map(i => i.name));
        }

        showTooltip(e.point, name, projects);
    });

    map.on('mouseleave', 'provinces-fill', () => {
        map.getCanvas().style.cursor = '';
        hideTooltip();
        unfocusProvince();
        hidePins();
        unhighlightPanelItem();
    });
}

// ---------- PROVINCE HIGHLIGHT HELPERS ---------- //
function highlightProvinces(yearData) {
    if (!map || !geojsonData) return;

    const activeISOs = new Set();
    yearData.projects.forEach(group => {
        group.items.forEach(item => {
            if (item.province) activeISOs.add(item.province);
        });
    });

    geojsonData.features.forEach((feature, i) => {
        map.setFeatureState(
            { source: 'provinces', id: i },
            { active: activeISOs.has(feature.properties.shapeISO || '') }
        );
    });
}

function focusProvince(iso) {
    unfocusProvince();
    if (!iso || !geojsonData) return;
    const idx = geojsonData.features.findIndex(
        f => f.properties.shapeISO === iso
    );
    if (idx === -1) return;
    map.setFeatureState({ source: 'provinces', id: idx }, { focused: true });
    focusedProvinceId = idx;
}

function unfocusProvince() {
    if (focusedProvinceId === null) return;
    map.setFeatureState(
        { source: 'provinces', id: focusedProvinceId },
        { focused: false }
    );
    focusedProvinceId = null;
}

// ---------- PIN HELPERS ---------- //
function showPins(items) {
    if (!map) return;
    hidePins();

    items.forEach(item => {
        if (!item.coords) return;
        const [lat, lng] = item.coords;

        const el = document.createElement('div');
        el.className = 'map-marker active';
        el.innerHTML = '<div class="marker-pin"></div>';

        const popup = new maplibregl.Popup({
            closeButton  : false,
            closeOnClick : false,
            offset       : 20,
            className    : 'marker-popup',
        }).setHTML(`
            <div class="tooltip-province">${item.name}</div>
            <div class="tooltip-project">${item.location}</div>
        `);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

        popup.addTo(map);

        activeMarkers.push(marker);
        activePopups.push(popup);
    });
}

function hidePins() {
    activePopups.forEach(p => p.remove());
    activeMarkers.forEach(m => m.remove());
    activePopups  = [];
    activeMarkers = [];
}


// ---------- TOOLTIP HELPERS ---------- //
function showTooltip(point, provinceName, projects) {
    tooltip.style.display = 'block';
    tooltip.style.left    = (point.x + 14) + 'px';
    tooltip.style.top     = (point.y - 14) + 'px';
    tooltip.innerHTML = `
        <div class="tooltip-province">${provinceName}</div>
        ${projects.map(p => `<div class="tooltip-project">— ${p}</div>`).join('')}
    `;
}

function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
}

// ---------- PANEL HELPERS ---------- //
function highlightPanelItem(names) {
    const nameSet = new Set(Array.isArray(names) ? names : [names]);
    document.querySelectorAll('.panel-item').forEach(el => {
        el.classList.toggle('highlighted', nameSet.has(el.dataset.name));
    });
}

function unhighlightPanelItem() {
    document.querySelectorAll('.panel-item').forEach(el => {
        el.classList.remove('highlighted');
    });
}


// ---------- GET PROJECTS FOR PROVINCE ---------- //
function getProjectsForProvince(iso, shapeName) {
    if (!activeYear) return [];
    const yearData = PROJECT_DATA.find(d => String(d.year) === activeYear);
    if (!yearData) return [];

    const results = [];
    yearData.projects.forEach(group => {
        group.items.forEach(item => {
            if (item.province === iso) {
                results.push(item.name);
            }
        });
    });
    return results;
}


// ---------- RENDER PROJECT PANEL ---------- //
function renderPanel(yearData) {
    const panel = document.getElementById('project-panel');
    panel.innerHTML = `<div class="panel-year">${yearData.year}</div>`;

    yearData.projects.forEach(group => {
        const catEl = document.createElement('div');
        catEl.className = 'panel-category';
        catEl.innerHTML = `<div class="panel-cat-title">${group.category}</div>`;

        group.items.forEach(item => {
            const el = document.createElement('div');
            el.className    = 'panel-item';
            el.dataset.name = item.name;
            el.innerHTML    = `
                <span class="panel-bullet">—</span>${item.name}
                <span class="panel-location">${item.location}</span>
            `;
            el.addEventListener('mouseenter', () => {
                if (item.province) focusProvince(item.province);
                showPins([item]);              // wrap in array
                highlightPanelItem([item.name]); // wrap in array
            });
            el.addEventListener('mouseleave', () => {
                unfocusProvince();
                hidePins();                    // was: hidePin();
                unhighlightPanelItem();
            });

            catEl.appendChild(el);
        });

        panel.appendChild(catEl);
    });
}

// ---------- RENDER ALL-YEARS PANEL (pre-load: map placeholder state) ---------- //
function renderAllYearsPanel() {
    const panel = document.getElementById('project-panel');
    panel.innerHTML = '';

    PROJECT_DATA.forEach(yearData => {
        const yearEl = document.createElement('div');
        yearEl.className   = 'panel-year panel-year--compact';
        yearEl.textContent = yearData.year;
        panel.appendChild(yearEl);

        yearData.projects.forEach(group => {
            const catEl = document.createElement('div');
            catEl.className = 'panel-category';
            catEl.innerHTML = `<div class="panel-cat-title">${group.category}</div>`;

            group.items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'panel-item';
                el.innerHTML = `
                    <span class="panel-bullet">—</span>${item.name}
                    <span class="panel-location">${item.location}</span>
                `;
                catEl.appendChild(el);
            });

            panel.appendChild(catEl);
        });
    });
}

// ---------- SELECT YEAR ---------- //
function selectYear(yearStr) {
    activeYear = yearStr;
    const yearData = PROJECT_DATA.find(d => String(d.year) === yearStr);
    if (!yearData) return;

    document.querySelectorAll('.timeline-year').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.year === yearStr);
        btn.setAttribute('aria-pressed', String(btn.dataset.year === yearStr));
    });

    renderPanel(yearData);
    highlightProvinces(yearData);
    unfocusProvince();
    hidePins();
}

// ---------- TIMELINE CLICK ---------- //
document.querySelectorAll('.timeline-year').forEach(btn => {
    btn.addEventListener('click', () => selectYear(btn.dataset.year));
});


// ---------- LAZY LOAD MAPLIBRE ---------- //
let maplibreLoadPromise = null;
function loadMapLibre() {
    if (maplibreLoadPromise) return maplibreLoadPromise;
    maplibreLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = MAPLIBRE_JS_PATH;
        script.onload  = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
    return maplibreLoadPromise;
}

// ---------- START (click-to-load) ---------- //
const mapPlaceholder = document.getElementById('map-placeholder');
const mapLoadBtn      = document.getElementById('map-load-btn');

renderAllYearsPanel();

function activateMap() {
    mapLoadBtn.disabled = true;
    const label = document.getElementById('map-load-label');
    if (label) label.textContent = mapLoadBtn.dataset.loadingText || label.textContent;
    loadMapLibre().then(() => {
        initMap();
        mapPlaceholder.classList.add('is-hidden');
    });
}

mapLoadBtn.addEventListener('click', activateMap);
