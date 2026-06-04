/**
 * GeoCacheManager — Multi-level geocoding cache.
 *
 * Levels:
 * 1. Pre-computed (top Colombian cities) → instant hit
 * 2. In-memory (current session) → instant hit
 * 3. Session storage (survives refresh, 24h TTL) → instant hit
 * 4. Nominatim API (fallback, rate-limited 1 req/s)
 */

const SESSION_KEY = "hospedasuite_geocache_v2";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface GeoResult {
	lat: number;
	lng: number;
	displayName: string;
}

// Pre-computed coordinates for top Colombian cities and tourist hotspots
const PRECOMPUTED: Record<string, [number, number]> = {
	// Major cities
	medellin: [6.2442, -75.5812],
	medellín: [6.2442, -75.5812],
	bogota: [4.6097, -74.0817],
	bogotá: [4.6097, -74.0817],
	cartagena: [10.391, -75.5144],
	cali: [3.4516, -76.532],
	barranquilla: [10.9685, -74.7813],
	bucaramanga: [7.1193, -73.1227],
	pereira: [4.8133, -75.6961],
	manizales: [5.0689, -75.5174],
	"santa marta": [11.2408, -74.199],
	cucuta: [7.8939, -72.5078],
	cúcuta: [7.8939, -72.5078],
	ibague: [4.4389, -75.2322],
	ibagué: [4.4389, -75.2322],
	villavicencio: [4.142, -73.6266],
	pasto: [1.2136, -77.2812],
	neiva: [2.9273, -75.2819],
	armenia: [4.5339, -75.6811],
	popayan: [2.4419, -76.6147],
	popayán: [2.4419, -76.6147],
	monteria: [8.7479, -75.8814],
	montería: [8.7479, -75.8814],
	valledupar: [10.4631, -73.2532],
	sincelejo: [9.3047, -75.3978],
	tunja: [5.5353, -73.3678],
	palmira: [3.5394, -76.3036],
	buenaventura: [3.8833, -77.0167],
	dosquebradas: [4.8333, -75.6667],
	envigado: [6.1667, -75.5833],
	bello: [6.3333, -75.5667],
	itagui: [6.1667, -75.6],
	itagüí: [6.1667, -75.6],
	soacha: [4.5833, -74.2167],
	zipaquira: [5.0219, -74.0039],
	zipaquirá: [5.0219, -74.0039],
	facatativa: [4.8139, -74.355],
	facatativá: [4.8139, -74.355],
	chia: [4.8667, -74.05],
	chía: [4.8667, -74.05],
	cajica: [4.9167, -74.0333],
	cajacá: [4.9167, -74.0333],
	tocancipa: [4.9667, -74.0167],
	tocancipá: [4.9667, -74.0167],
	sopo: [4.9, -74.0333],
	sopó: [4.9, -74.0333],
	"la calera": [4.7167, -74.0],
	girardot: [4.3, -74.8],
	girardota: [6.4, -75.4667],
	rionegro: [6.1667, -75.3667],
	marinilla: [6.1833, -75.3333],
	"el retiro": [6.0833, -75.5167],
	"la ceja": [6.0833, -75.4833],
	guarne: [6.2833, -75.4833],
	copacabana: [6.3333, -75.5],
	barbosa: [6.4, -75.3333],
	"don matias": [6.45, -75.3833],
	"don matías": [6.45, -75.3833],
	"san pedro": [6.2333, -75.5667],
	entrerrios: [6.4833, -75.6167],
	entrerríos: [6.4833, -75.6167],
	"san jeronimo": [6.4167, -75.7167],
	"san jerónimo": [6.4167, -75.7167],
	sabaneta: [6.15, -75.6167],
	caldas: [6.0833, -75.6333],
	betania: [6.0333, -75.7],
	amaga: [6.0333, -75.7333],
	amága: [6.0333, -75.7333],
	venecia: [6.0, -75.7],
	pueblorrico: [5.7833, -75.8333],
	"pueblo rico": [5.7833, -75.8333],
	andes: [5.6833, -75.8833],
	"ciudad bolivar": [5.65, -75.9167],
	"ciudad bolívar": [5.65, -75.9167],
	jardin: [5.6167, -75.8167],
	jardín: [5.6167, -75.8167],
	tamesis: [5.65, -75.7333],
	támesis: [5.65, -75.7333],
	hispania: [5.7, -75.7667],
	salgar: [5.85, -75.9167],
	concordia: [5.9333, -75.95],
	betulia: [5.95, -75.8167],
	titiribi: [5.9833, -75.7333],
	heliconia: [6.1, -75.7833],
	"san cristobal": [6.2, -75.55],
	"san cristóbal": [6.2, -75.55],
	"santa fe de antioquia": [6.55, -75.8333],
	guatape: [6.2333, -75.1667],
	guatapé: [6.2333, -75.1667],
	"el penol": [6.2167, -75.2333],
	"el peñol": [6.2167, -75.2333],
	granada: [6.1, -75.2333],
	"san carlos": [6.1333, -75.1],
	"san rafael": [6.1667, -75.1333],
	"san luis": [6.0833, -75.1667],
	cocorna: [6.05, -75.2],
	cocorná: [6.05, -75.2],
	"san francisco": [6.0333, -75.2333],
	argelia: [5.95, -75.2667],
	sonson: [5.7333, -75.3167],
	sonsón: [5.7333, -75.3167],
	abejorral: [5.6833, -75.4167],
	"la union": [5.8, -75.3667],
	"la unión": [5.8, -75.3667],
	"el carmen de viboral": [6.0667, -75.3167],
	// Glamping/tourist hotspots
	paipa: [5.7833, -73.1167],
	"villa de leyva": [5.6333, -73.5333],
	guatavita: [4.9833, -73.8333],
	jerico: [5.7833, -75.7833],
	jericó: [5.7833, -75.7833],
	salento: [4.6333, -75.5667],
	filandia: [4.7167, -75.6833],
	marsella: [4.8667, -75.7833],
	belalcazar: [4.9333, -75.8167],
	belalcázar: [4.9333, -75.8167],
	quinchia: [4.9667, -75.85],
	quinchía: [4.9667, -75.85],
	"santa rosa de cabal": [4.8667, -75.6167],
	apias: [5.2333, -75.95],
	apías: [5.2333, -75.95],
	balboa: [4.9667, -75.9167],
	santuario: [4.9, -75.95],
	"la celia": [4.9333, -76.0],
	"la virginia": [4.5333, -75.8667],

	// ── Boyacá: pueblos, ciudades y veredas turísticas ──────────────────
	// Ciudades principales
	duitama: [5.8283, -73.033],
	sogamoso: [5.7167, -72.9333],
	chiquinquira: [5.6167, -73.8167],
	chiquinquirá: [5.6167, -73.8167],
	// Pueblos turísticos
	raquira: [5.5333, -73.6333],
	ráquira: [5.5333, -73.6333],
	moniquira: [5.8833, -73.5667],
	moniquirá: [5.8833, -73.5667],
	tibasosa: [5.75, -72.9833],
	nobsa: [5.7667, -72.95],
	sutamarchan: [5.6167, -73.6333],
	sutamarchán: [5.6167, -73.6333],
	tinjaca: [5.5667, -73.65],
	tinjacá: [5.5667, -73.65],
	sachica: [5.5833, -73.55],
	sáchica: [5.5833, -73.55],
	"santa sofia": [5.7167, -73.6],
	"santa sofía": [5.7167, -73.6],
	arcabuco: [5.75, -73.4333],
	combita: [5.6333, -73.3167],
	cómbita: [5.6333, -73.3167],
	iza: [5.6167, -72.9833],
	tota: [5.5667, -73.0],
	aquitania: [5.5167, -72.8833],
	mongui: [5.7167, -72.85],
	monguí: [5.7167, -72.85],
	mongua: [5.7667, -72.8],
	topaga: [5.7667, -72.8333],
	tópaga: [5.7667, -72.8333],
	gameza: [5.8, -72.8],
	gámeza: [5.8, -72.8],
	corrales: [5.85, -72.85],
	floresta: [5.8667, -72.9167],
	firavitoba: [5.6667, -72.9833],
	tutaza: [6.0333, -72.85],
	tutazá: [6.0333, -72.85],
	pesca: [5.5667, -73.05],
	jencano: [5.5333, -72.9167],
	cuitiva: [5.5833, -72.9667],
	"tota lago": [5.55, -72.9167],
	"lago de tota": [5.55, -72.9167],
	"playa blanca tota": [5.5533, -72.8833],
	"playa blanca": [5.5533, -72.8833],
	"pantano de vargas": [5.75, -73.0833],
	"termales paipa": [5.8017, -73.1167],
	"pueblito boyacense": [5.8167, -73.0167],
	"desierto de la candelaria": [5.65, -73.5833],
	"paramo de oceta": [5.85, -72.8167],
	"páramo de ocetá": [5.85, -72.8167],
	"vinedo ain karim": [5.6333, -73.55],
	"viñedo ain karim": [5.6333, -73.55],
	// Veredas turísticas de Boyacá
	"vereda monquira": [5.6, -73.5333],
	"vereda monquirá": [5.6, -73.5333],
	"vereda el salitre": [5.65, -73.5167],
	"vereda san pedro": [5.8667, -72.8833],
	"vereda la colorada": [5.7833, -73.05],
	"vereda el arrayan": [5.83, -73.03],
	"vereda el arrayán": [5.83, -73.03],
	"vereda boquia": [5.6, -73.5333],
	"vereda boquía": [5.6, -73.5333],
	"vereda el cocuy": [5.7833, -72.9],
	"corregimiento la tagua": [5.7333, -73.05],
	"corregimiento el encano": [5.65, -72.9],
};

// In-memory cache
const memoryCache = new Map<string, GeoResult>();

// Session storage cache
function getSessionCache(): Record<
	string,
	{ lat: number; lng: number; displayName: string; timestamp: number }
> {
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function setSessionCache(key: string, result: GeoResult) {
	try {
		const cache = getSessionCache();
		cache[key] = { ...result, timestamp: Date.now() };
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache));
	} catch {
		// Storage full or disabled
	}
}

/**
 * Normalize query for cache lookup.
 */
function normalizeQuery(query: string): string {
	return query
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/**
 * Get cached coordinates from all 3 levels.
 */
export function getCachedCoords(query: string): GeoResult | null {
	const normalized = normalizeQuery(query);

	// Level 1: Pre-computed
	const precomputed = PRECOMPUTED[normalized];
	if (precomputed) {
		return { lat: precomputed[0], lng: precomputed[1], displayName: query };
	}

	// Level 2: In-memory
	const memory = memoryCache.get(normalized);
	if (memory) {
		return memory;
	}

	// Level 3: Session storage
	const session = getSessionCache();
	const entry = session[normalized];
	if (entry && Date.now() - entry.timestamp < TTL_MS) {
		return { lat: entry.lat, lng: entry.lng, displayName: entry.displayName };
	}

	return null;
}

/**
 * Save coordinates to all cache levels.
 */
export function setCachedCoords(query: string, result: GeoResult) {
	const normalized = normalizeQuery(query);
	memoryCache.set(normalized, result);
	setSessionCache(normalized, result);
}

/**
 * Clear all caches (for testing or manual refresh).
 */
export function clearGeoCache() {
	memoryCache.clear();
	try {
		sessionStorage.removeItem(SESSION_KEY);
	} catch {
		// ignore
	}
}

/**
 * Get cache stats for debugging.
 */
export function getGeoCacheStats() {
	return {
		memorySize: memoryCache.size,
		sessionSize: Object.keys(getSessionCache()).length,
		precomputedSize: Object.keys(PRECOMPUTED).length,
	};
}
