/* ------------------------------------------------------------
   ---------- SmartRisk - Portfolio Interactive Map -----------
   ---------- MapLibre GL JS + geoBoundaries GeoJSON ----------
   ------------------------------------------------------------ */

let map;
let geojsonData;
let activeYear        = null;
let focusedProvinceId = null;
let activeMarker      = null;
let activePopup       = null;
let hoveredProvinceId = null;
let tooltip           = null;

// ---------- INIT MAP ---------- //
function initMap() {
    map = new maplibregl.Map({
        container         : 'portfolio-map',
        style             : 'https://tiles.openfreemap.org/styles/positron',
        center            : [115, 5],
        zoom              : 3.5,
        minZoom           : 1,
        maxZoom           : 8,
        maxBounds : [
        [88, -15],   // southwest: [lng, lat] — west of Myanmar, south of Australia
        [145, 28]    // northeast: [lng, lat] — east of Philippines, north of Myanmar
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
            hidePin();
            unhighlightPanelItem();
            return;
        }

        map.getCanvas().style.cursor = 'pointer';

        // Finds first project with coords in this province
        const yearData = PROJECT_DATA.find(d => String(d.year) === activeYear);
        let firstItem  = null;
        if (yearData) {
            outer: for (const group of yearData.projects) {
                for (const item of group.items) {
                    if (item.province === iso && item.coords) {
                        firstItem = item;
                        break outer;
                    }
                }
            }
        }

        focusProvince(iso);
        if (firstItem) {
            showPin(firstItem);
            highlightPanelItem(firstItem.name);
        }

        showTooltip(e.point, name, projects);
    });

    map.on('mouseleave', 'provinces-fill', () => {
        map.getCanvas().style.cursor = '';
        hideTooltip();
        unfocusProvince();
        hidePin();
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
function showPin(item) {
    hidePin();
    if (!item.coords) return;

    const [lat, lng] = item.coords;

    const el = document.createElement('div');
    el.className = 'map-marker active';
    el.innerHTML = '<div class="marker-pin"></div>';

    activePopup = new maplibregl.Popup({
        closeButton  : false,
        closeOnClick : false,
        offset       : 20,
        className    : 'marker-popup',
    }).setHTML(`
        <div class="tooltip-province">${item.name}</div>
        <div class="tooltip-project">${item.location}</div>
    `);

    activeMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(activePopup)
        .addTo(map);

    activePopup.addTo(map);
}

function hidePin() {
    if (activePopup)  { activePopup.remove();  activePopup  = null; }
    if (activeMarker) { activeMarker.remove(); activeMarker = null; }
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
function highlightPanelItem(name) {
    document.querySelectorAll('.panel-item').forEach(el => {
        el.classList.toggle('highlighted', el.dataset.name === name);
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
            if (item.province === iso ||
                (shapeName && item.location.includes(shapeName))) {
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
                showPin(item);
                highlightPanelItem(item.name);
            });
            el.addEventListener('mouseleave', () => {
                unfocusProvince();
                hidePin();
                unhighlightPanelItem();
            });

            catEl.appendChild(el);
        });

        panel.appendChild(catEl);
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
    hidePin();
}

// ---------- TIMELINE CLICK ---------- //
document.querySelectorAll('.timeline-year').forEach(btn => {
    btn.addEventListener('click', () => selectYear(btn.dataset.year));
});


// ---------- START ---------- //
initMap();
