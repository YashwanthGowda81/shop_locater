// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const currentLocationBtn = document.getElementById('current-location-btn');
// ... rest of your code
const saveLocationBtn = document.getElementById('save-location-btn');
const backBtn = document.getElementById('back-btn');
const coordinatesEl = document.getElementById('coordinates');

let map = null;
let marker = null;
let currentLocation = null;
let shopId = null;
let isLocationSet = false;

// Modal functionality
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const closeModal = document.querySelector('.close');

function showModal(message, type = 'info') {
    modalMessage.textContent = message;
    modalMessage.className = type;
    modal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Get shop ID from URL
function getShopIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shop_id');
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
    `;
    document.body.appendChild(loadingOverlay);
    return loadingOverlay;
}

// Hide loading overlay
function hideLoading(overlay) {
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

// Update coordinates display
function updateCoordinates(latlng) {
    if (latlng) {
        coordinatesEl.textContent = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    }
}

// Initialize map
function initMap() {
    // Default center
    const defaultCenter = [20, 0];
    const defaultZoom = 2;

    map = L.map('map').setView(defaultCenter, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to set marker
    map.on('click', function(e) {
        setMarker(e.latlng);
    });

    // Check if we have existing location data
    shopId = getShopIdFromUrl();
    if (shopId) {
        loadExistingLocation();
    } else {
        // For new shops, try to get user's location
        getUserLocation();
    }
}

// Set marker at specified location
function setMarker(latlng) {
    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.marker(latlng, {
        draggable: true,
        icon: L.divIcon({
            className: 'custom-marker',
            iconSize: [20, 32],
            iconAnchor: [10, 32]
        })
    }).addTo(map);

    currentLocation = latlng;
    isLocationSet = true;
    updateCoordinates(latlng);

    // Enable save button
    saveLocationBtn.disabled = false;
    saveLocationBtn.classList.remove('btn-outline');
    saveLocationBtn.classList.add('btn-primary');

    // Update marker position when dragged
    marker.on('dragend', function(event) {
        const marker = event.target;
        const position = marker.getLatLng();
        currentLocation = position;
        updateCoordinates(position);
    });

    // Center map on marker with appropriate zoom
    map.setView(latlng, 15);
}

// Get user's current location
function getUserLocation() {
    if (!navigator.geolocation) {
        showModal('Geolocation is not supported by this browser. Please click on the map to set your location manually.', 'error');
        return;
    }

    const loadingOverlay = showLoading('Getting your location...');
    currentLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const userLatLng = L.latLng(userLat, userLng);

            setMarker(userLatLng);
            hideLoading(loadingOverlay);
            currentLocationBtn.disabled = false;
            showModal('Location found! Drag the marker to adjust if needed.', 'success');
            setTimeout(() => modal.style.display = 'none', 2000);
        },
        (error) => {
            hideLoading(loadingOverlay);
            currentLocationBtn.disabled = false;
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location. ';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings or click on the map to set location manually.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Your location is currently unavailable. Please click on the map to set location manually.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out. Please click on the map to set location manually.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred. Please click on the map to set location manually.';
                    break;
            }

            showModal(errorMessage, 'error');

            // Set default marker at a common location
            const defaultLocation = L.latLng(40.7128, -74.0060); // New York
            setMarker(defaultLocation);
        }, {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout
            maximumAge: 60000
        }
    );
}

// Load existing location for editing
async function loadExistingLocation() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'owner-login.html';
            return;
        }

        const loadingOverlay = showLoading('Loading existing location...');

        const { data: shop, error } = await supabase
            .from('shops')
            .select('latitude, longitude, shop_name')
            .eq('id', shopId)
            .eq('user_id', user.id)
            .single();

        hideLoading(loadingOverlay);

        if (error) throw error;

        if (shop && shop.latitude && shop.longitude) {
            const existingLocation = L.latLng(shop.latitude, shop.longitude);
            setMarker(existingLocation);
            showModal(`Loaded existing location for ${shop.shop_name}. Drag the marker to adjust.`, 'success');
            setTimeout(() => modal.style.display = 'none', 3000);
        } else {
            // No existing location, try to get current location
            showModal('No existing location found. Getting your current location...', 'info');
            getUserLocation();
        }

    } catch (error) {
        console.error('Error loading existing location:', error);
        showModal('Error loading existing location. Getting your current location...', 'error');
        getUserLocation();
    }
}

// Save location to session storage and go back
function saveLocation() {
    if (!currentLocation) {
        showModal('Please set a location first by clicking on the map or using "Use My Current Location"', 'error');
        return;
    }

    const locationData = {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
    };

    // Save to session storage
    sessionStorage.setItem('shop_location', JSON.stringify(locationData));

    // Show success message
    showModal('Location saved successfully! Returning to shop form...', 'success');

    // Update button to show success state
    saveLocationBtn.disabled = true;
    saveLocationBtn.textContent = '✓ Location Saved';
    saveLocationBtn.classList.remove('btn-primary');
    saveLocationBtn.classList.add('location-set');

    setTimeout(() => {
        // Go back to manage shop page - form data should be preserved
        if (shopId) {
            window.location.href = `manage-shop.html?shop_id=${shopId}`;
        } else {
            window.location.href = 'manage-shop.html';
        }
    }, 2000);
}

// Event listeners
currentLocationBtn.addEventListener('click', getUserLocation);

saveLocationBtn.addEventListener('click', saveLocation);

backBtn.addEventListener('click', () => {
    // Show confirmation if location is set but not saved
    if (isLocationSet && !sessionStorage.getItem('shop_location')) {
        if (confirm('You have set a location but not saved it. Are you sure you want to go back without saving?')) {
            window.history.back();
        }
    } else {
        window.history.back();
    }
});

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Disable save button initially
    saveLocationBtn.disabled = true;

    // Initialize the map
    initMap();

    // Check if we already have a location from session storage
    const savedLocation = sessionStorage.getItem('shop_location');
    if (savedLocation) {
        try {
            const locationData = JSON.parse(savedLocation);
            const savedLatLng = L.latLng(locationData.latitude, locationData.longitude);
            setMarker(savedLatLng);
            showModal('Loaded previously saved location. You can adjust it if needed.', 'info');
            setTimeout(() => modal.style.display = 'none', 3000);
        } catch (error) {
            console.error('Error loading saved location:', error);
        }
    }
});

// Handle page refresh/closing - save current state
window.addEventListener('beforeunload', function(event) {
    if (isLocationSet && !sessionStorage.getItem('shop_location')) {
        // Save unsaved location to prevent data loss
        if (currentLocation) {
            const locationData = {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng
            };
            sessionStorage.setItem('unsaved_location', JSON.stringify(locationData));
        }
    }
});

// Check for unsaved location on page load
window.addEventListener('load', function() {
    const unsavedLocation = sessionStorage.getItem('unsaved_location');
    if (unsavedLocation && !sessionStorage.getItem('shop_location')) {
        try {
            const locationData = JSON.parse(unsavedLocation);
            const savedLatLng = L.latLng(locationData.latitude, locationData.longitude);

            if (confirm('We found an unsaved location from your previous session. Would you like to restore it?')) {
                setMarker(savedLatLng);
            }

            // Clear unsaved location
            sessionStorage.removeItem('unsaved_location');
        } catch (error) {
            console.error('Error loading unsaved location:', error);
            sessionStorage.removeItem('unsaved_location');
        }
    }
});