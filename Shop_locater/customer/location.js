// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

let map = null;
// ... rest of your code
let shopMarker = null;
let userMarker = null;
let routingControl = null;

// DOM elements
const backButton = document.getElementById('back-btn');

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

// Initialize map
function initMap() {
    map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Load shop location
async function loadShopLocation() {
    const shopId = getShopIdFromUrl();

    if (!shopId) {
        showModal('No shop ID provided', 'error');
        return;
    }

    try {
        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

        if (error) throw error;
        if (!shop) throw new Error('Shop not found');

        if (shop.latitude && shop.longitude) {
            displayShopLocation(shop);
            getUserLocation(shop);
        } else {
            showModal('Shop location not available', 'error');
        }

    } catch (error) {
        showModal('Error loading shop location: ' + error.message, 'error');
    }
}

function displayShopLocation(shop) {
    // Remove existing shop marker
    if (shopMarker) {
        map.removeLayer(shopMarker);
    }

    // Add shop marker
    shopMarker = L.marker([shop.latitude, shop.longitude])
        .addTo(map)
        .bindPopup(`
            <strong>${shop.shop_name}</strong><br>
            ${shop.phone_number || 'No phone'}<br>
            <em>Shop Location</em>
        `)
        .openPopup();

    // Center map on shop
    map.setView([shop.latitude, shop.longitude], 13);
}

function getUserLocation(shop) {
    if (!navigator.geolocation) {
        showModal('Geolocation is not supported by this browser', 'error');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // Remove existing user marker
            if (userMarker) {
                map.removeLayer(userMarker);
            }

            // Add user marker
            userMarker = L.marker([userLat, userLng])
                .addTo(map)
                .bindPopup('<strong>Your Location</strong>')
                .openPopup();

            // Add routing
            addRouting(userLat, userLng, shop.latitude, shop.longitude, shop.shop_name);

            // Fit map to show both locations
            const bounds = L.latLngBounds(
                [userLat, userLng], [shop.latitude, shop.longitude]
            );
            map.fitBounds(bounds, { padding: [50, 50] });

        },
        (error) => {
            console.error('Geolocation error:', error);
            showModal('Unable to get your location. Showing shop location only.', 'info');
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function addRouting(userLat, userLng, shopLat, shopLng, shopName) {
    // Remove existing routing
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // Add new routing
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userLat, userLng),
            L.latLng(shopLat, shopLng)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
            styles: [{ color: '#10b981', weight: 6, opacity: 0.7 }]
        },
        createMarker: function() { return null; }, // Don't create default markers
        instructionsContainer: 'instructions',
        show: true
    }).addTo(map);

    // Customize the route line
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes[0]) {
            const summary = routes[0].summary;
            console.log('Route distance: ' + (summary.totalDistance / 1000).toFixed(2) + ' km');
            console.log('Route time: ' + (summary.totalTime / 60).toFixed(2) + ' minutes');
        }
    });
}

// Event listeners
backButton.addEventListener('click', () => {
    window.history.back();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadShopLocation();
});