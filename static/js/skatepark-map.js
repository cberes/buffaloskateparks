(function(d) {
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

	function updateMapMarkers(skateparkMap, skateparks, userLat, userLng) {
		// Initialize map if needed
		if (!map) {
			initMap(skateparkMap);
		}

		// Clear existing markers
		markersLayer.clearLayers();

		// Add user location marker
		if (userLat && userLng) {
			const userIcon = L.divIcon({
				className: 'user-marker',
				iconSize: [24, 24],
				iconAnchor: [12, 12],
			});

			L.marker([userLat, userLng], { icon: userIcon })
				.addTo(markersLayer)
				.bindPopup('<div class="map-popup"><strong>Your Location</strong></div>');
		}

		// Add shop markers
		skateparks.forEach((skatepark) => {
			if (!isSkateparkValid(skatepark)) {
				return;
			}

			const markerClass = skatepark.indoor
				? 'shop-marker shop-marker-indoor'
				: 'shop-marker';

			const shopIcon = L.divIcon({
				className: markerClass,
				iconSize: [28, 28],
				iconAnchor: [14, 14],
			});

			L.marker([skatepark.lat, skatepark.lng], { icon: shopIcon })
				.addTo(markersLayer)
				.bindPopup(createMapPopupHTML(skatepark));
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

		// Filter to shops with valid coordinates
		const validSkateparks = skateparks.filter(isSkateparkValid);

		if (validSkateparks.length === 0) {
			return null;
		}

		let north = validSkateparks[0].lat;
		let south = validSkateparks[0].lat;
		let east = validSkateparks[0].lng;
		let west = validSkateparks[0].lng;

		for (const shop of validSkateparks) {
			if (shop.lat > north) north = shop.lat;
			if (shop.lat < south) south = shop.lat;
			if (shop.lng > east) east = shop.lng;
			if (shop.lng < west) west = shop.lng;
		}

		return { north, south, east, west };
	}

	function createMapPopupHTML(skatepark) {
		const distanceDisplay = typeof skatepark.distance === 'number' ? skatepark.distance.toFixed(1) : '?';

		const indoorBadge = skatepark.indoor
			? '<span class="popup-badge-indoor">Indoor</span>'
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

		return `
        <div class="map-popup">
            ${popupPhoto}
            <div class="popup-header">
                <strong class="popup-name">${escapeHtml(skatepark.title)}</strong>
                <span class="popup-distance">${distanceDisplay} mi</span>
            </div>
            <p class="popup-address">
              <a href="${escapeHtml(skatepark.permalink)}">View Skatepark</a>
            </p>
            <div class="popup-details">
                ${indoorBadge}
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

	d.addEventListener('DOMContentLoaded', function() {
		const mapElement = d.getElementById('skatepark-map');
		const dataElement = d.getElementById('skatepark-map-data');
		if (dataElement) {
			const skateparks = JSON.parse(dataElement.textContent);
			const mapCenter = [42.8864, -78.8784];
			updateMapMarkers(mapElement, skateparks, mapCenter[0], mapCenter[1]);
		}
	});
})(document);

