(function(d) {
	const EARTH_RADIUS_MILES = 3959;
	const SHOW_USER_MARKER = false;
	const Z_OFFSET_INDOOR = 1000;
	const Z_OFFSET_SHOP = 500;
	const MARKER_SIZE = 28;
	const USER_MARKER_SIZE = 24;

	let map = null;
	let markersLayer = null;

	function initMap(mapContainer) {
		if (map) return; // Already initialized

		map = L.map(mapContainer, {
			zoomControl: true,
			scrollWheelZoom: true,
		});

		// Use OpenStreetMap tiles
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19,
		}).addTo(map);

		// Create a layer group for markers
		markersLayer = L.layerGroup().addTo(map);
	}

	function addSkateparkMarker(markersLayer, skatepark, className, offset) {
		const popup = createMapPopupHTML(skatepark);
		const coords = [skatepark.lat, skatepark.lng];
		addMarker(markersLayer, coords, className, popup, MARKER_SIZE, offset);
	}

	function addUserMarker(markersLayer, coords) {
		if (!SHOW_USER_MARKER) {
			return;
		}
		const popup = '<div class="map-popup"><strong>Your Location</strong></div>';
		addMarker(markersLayer, coords, 'map-marker-user', popup, USER_MARKER_SIZE);
	}

	function addMarker(markersLayer, coords, className, popup, size, offset) {
		const icon = L.divIcon({
			className,
			iconSize: [size, size],
			iconAnchor: [size / 2, size / 2],
		});

		L.marker(coords, { icon, zIndexOffset: offset || 0 })
			.addTo(markersLayer)
			.bindPopup(popup);
	}

	function updateMapMarkers(skateparkMap, skateparks, userLat, userLng) {
		// Initialize map if needed
		if (!map) {
			initMap(skateparkMap);
		}

		// Clear existing markers
		markersLayer.clearLayers();

		// Add user location marker
		if (userLat && userLng) {
			addUserMarker(markersLayer, [userLat, userLng]);
		}

		// Add skatepark markers
		skateparks.forEach((skatepark) => {
			if (!isSkateparkValid(skatepark)) {
				return;
			}

			// TODO: really this part should moved outside this function
			skatepark.indoor = (skatepark.categories || []).includes('indoor');
			skatepark.newYork = (skatepark.categories || []).includes('new york');
			skatepark.ontario = (skatepark.categories || []).includes('ontario');
			skatepark.distance = calculateDistance(userLat, userLng, skatepark.lat, skatepark.lng);

			const offset = skatepark.indoor ? Z_OFFSET_INDOOR :
				skatepark.shop ? Z_OFFSET_SHOP : 0;
			const markerClasses = ['map-marker'];
			if (skatepark.indoor) {
				markerClasses.push('map-marker-indoor');
			}
			if (skatepark.newYork) {
				markerClasses.push('map-marker-new-york');
			}
			if (skatepark.ontario) {
				markerClasses.push('map-marker-ontario');
			}
			if (skatepark.shop) {
				markerClasses.push('map-marker-shop');
			}

			addSkateparkMarker(markersLayer, skatepark, markerClasses.join(' '), offset)
		});

		// Fit bounds to show all markers
		const bounds = getMapBounds(skateparks);
		if (bounds && userLat && userLng) {
			// Include user location in bounds
			const allBounds = L.latLngBounds([
				[Math.min(bounds.south, userLat), Math.min(bounds.west, userLng)],
				[Math.max(bounds.north, userLat), Math.max(bounds.east, userLng)],
			]);
			map.fitBounds(allBounds, { padding: [50, 50], maxZoom: 13 });
		} else if (bounds) {
			map.fitBounds(
				[
					[bounds.south, bounds.west],
					[bounds.north, bounds.east],
				],
				{ padding: [50, 50], maxZoom: 13 }
			);
		} else if (userLat && userLng) {
			map.setView([userLat, userLng], 12);
		}
	}

	function isSkateparkValid(skatepark) {
		return skatepark &&
			typeof skatepark.lat === 'number' &&
			typeof skatepark.lng === 'number' &&
			!Number.isNaN(skatepark.lat) &&
			!Number.isNaN(skatepark.lng);
	}

	function getMapBounds(skateparks) {
		if (!Array.isArray(skateparks) || skateparks.length === 0) {
			return null;
		}

		// Filter to skateparks with valid coordinates
		const validSkateparks = skateparks.filter(isSkateparkValid);

		if (validSkateparks.length === 0) {
			return null;
		}

		let north = validSkateparks[0].lat;
		let south = validSkateparks[0].lat;
		let east = validSkateparks[0].lng;
		let west = validSkateparks[0].lng;

		for (const { lat, lng } of validSkateparks) {
			north = Math.max(north, lat);
			south = Math.min(south, lat);
			east = Math.max(east, lng);
			west = Math.min(west, lng);
		}

		return { north, south, east, west };
	}

	function createMapPopupHTML(skatepark) {
		const distanceDisplay = typeof skatepark.distance === 'number' ? skatepark.distance.toFixed(1) : '?';

		const indoorBadge = skatepark.indoor
			? '<span class="popup-badge popup-badge-indoor">Indoor</span>'
			: '';

		const shopBadge = skatepark.shop
			? '<span class="popup-badge popup-badge-shop">Skateshop</span>'
			: '';

		const websiteLink = skatepark.website
			? `<a href="${escapeHtml(skatepark.website)}" class="popup-link" target="_blank" rel="noopener noreferrer">Website</a>`
			: '';

		const phoneLink = skatepark.phone
			? `<a href="tel:${escapeHtml(skatepark.phone.replace(/[^0-9+]/g, ''))}" class="popup-link">${escapeHtml(skatepark.phone)}</a>`
			: '';

		// Build Google Maps directions URL
		const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(skatepark.address || `${skatepark.lat},${skatepark.lng}`)}`;

		const popupPhoto = skatepark.photo
			? `<div class="popup-photo"><img src="${escapeHtml(skatepark.photo)}" alt="${escapeHtml(skatepark.title)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
			: '';
		const popupAddress = skatepark.shop ? '' : `<a href="${escapeHtml(skatepark.permalink)}">View Skatepark</a>`;

		return `
        <div class="map-popup">
            ${popupPhoto}
            <div class="popup-header">
                <strong class="popup-name">${escapeHtml(skatepark.title)}</strong>
                <span class="popup-distance">${distanceDisplay} mi</span>
            </div>
            <div class="popup-header">
                ${popupAddress}
            </div>
            <div class="popup-details">
                ${indoorBadge}
                ${shopBadge}
                ${websiteLink}
                ${phoneLink}
            </div>
            <a href="${escapeHtml(directionsUrl)}" class="popup-directions" target="_blank" rel="noopener noreferrer">Get Directions</a>
        </div>
    `;
	}

	function escapeHtml(text) {
		if (text === null || text === undefined) {
			return '';
		}
		const str = String(text);
		const htmlEscapes = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
	}

	function calculateDistance(lat1, lng1, lat2, lng2) {
		const toRad = (deg) => deg * (Math.PI / 180);

		const dLat = toRad(lat2 - lat1);
		const dLng = toRad(lng2 - lng1);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return EARTH_RADIUS_MILES * c;
	}

	d.addEventListener('DOMContentLoaded', function() {
		const mapElement = d.getElementById('skatepark-map');
		const dataElement = d.getElementById('skatepark-map-data');
		const shopsElement = d.getElementById('skatepark-shop-data');
		if (!mapElement) {
			return;
		}

		const skateparks = dataElement ? JSON.parse(dataElement.textContent) : [];
		const shops = shopsElement ? JSON.parse(shopsElement.textContent) : [];
		skateparks.push(...shops);
		const mapCenter = [42.8864, -78.8784];
		updateMapMarkers(mapElement, skateparks, ...mapCenter);
	});
})(document);

