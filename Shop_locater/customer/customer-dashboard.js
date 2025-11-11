// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const loginBtn = document.getElementById('login-btn');
// ... rest of your code
const logoutBtn = document.getElementById('logout-btn');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const refreshLocationBtn = document.getElementById('refresh-location-btn');
const nearbyItemsContainer = document.getElementById('nearby-items');
const searchResultsContainer = document.getElementById('search-results');
const searchResultsHeader = document.getElementById('search-results-header');
const resultsCount = document.getElementById('results-count');
const recentlyViewedContainer = document.getElementById('recently-viewed');
const recentlyViewedHeader = document.getElementById('recently-viewed-header');
const noResults = document.getElementById('no-results');

let userLocation = null;
let isSearching = false;

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

// Auth functions
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showModal('Error logging out: ' + error.message, 'error');
    } else {
        window.location.href = '../index.html';
    }
}

// Location functions
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                resolve(userLocation);
            },
            (error) => {
                let errorMessage = 'Unable to get your location. ';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please enable location access to see nearby items.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                        break;
                }

                reject(new Error(errorMessage));
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

// Format distance for display
function formatDistance(distance) {
    if (distance < 1) {
        return `${Math.round(distance * 1000)}m away`;
    } else {
        return `${distance.toFixed(1)}km away`;
    }
}

// Load nearby items
async function loadNearbyItems() {
    if (!userLocation) {
        nearbyItemsContainer.innerHTML = `
            <div class="no-location-message">
                <p>Enable location access to see items near you</p>
                <button onclick="getUserLocation().then(loadNearbyItems).catch(showModal)" class="btn btn-sm">
                    Enable Location
                </button>
            </div>
        `;
        return;
    }

    try {
        nearbyItemsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // Get all items and shops (we'll calculate distance client-side)
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*');

        if (itemsError) throw itemsError;

        const { data: shops, error: shopsError } = await supabase
            .from('shops')
            .select('*');

        if (shopsError) throw shopsError;

        // Create shop map for quick lookup
        const shopMap = {};
        shops.forEach(shop => {
            shopMap[shop.id] = shop;
        });

        // Calculate distances and filter nearby items (within 10km)
        const nearbyItems = items
            .map(item => {
                const shop = shopMap[item.shop_id];
                if (!shop || !shop.latitude || !shop.longitude) return null;

                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    shop.latitude,
                    shop.longitude
                );

                return {
                    ...item,
                    shop,
                    distance
                };
            })
            .filter(item => item !== null && item.distance <= 10) // Within 10km
            .sort((a, b) => a.distance - b.distance) // Sort by distance
            .slice(0, 6); // Show top 6 nearest items

        displayItems(nearbyItems, nearbyItemsContainer, true);

    } catch (error) {
        nearbyItemsContainer.innerHTML = `<p class="error-message">Error loading nearby items: ${error.message}</p>`;
    }
}

// Load recently viewed items
async function loadRecentlyViewed() {
    try {
        const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

        if (recentlyViewedIds.length === 0) {
            recentlyViewedContainer.innerHTML = `
                <div class="no-recent-items">
                    <p>Items you view will appear here</p>
                </div>
            `;
            return;
        }

        // Get recently viewed items
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .in('id', recentlyViewedIds.slice(0, 6)); // Show last 6 viewed

        if (itemsError) throw itemsError;

        if (!items || items.length === 0) {
            recentlyViewedContainer.innerHTML = `
                <div class="no-recent-items">
                    <p>No recently viewed items</p>
                </div>
            `;
            return;
        }

        // Get shops for these items
        const shopIds = [...new Set(items.map(item => item.shop_id))];
        const { data: shops, error: shopsError } = await supabase
            .from('shops')
            .select('*')
            .in('id', shopIds);

        if (shopsError) throw shopsError;

        const shopMap = {};
        shops.forEach(shop => {
            shopMap[shop.id] = shop;
        });

        // Combine items with shop data
        const itemsWithShops = items.map(item => ({
            ...item,
            shop: shopMap[item.shop_id]
        }));

        displayItems(itemsWithShops, recentlyViewedContainer, false);

    } catch (error) {
        recentlyViewedContainer.innerHTML = `<p class="error-message">Error loading recently viewed items</p>`;
    }
}

// Display items in a container
function displayItems(items, container, showDistance = false) {
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="no-items-message">
                <p>No items found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
                const stockClass = item.units === 0 ? 'out-of-stock' : (item.units < 10 ? 'low-stock' : '');

                return `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-card-header">
                    <div>
                        <h3 class="item-name">${item.item_name}</h3>
                        <p class="shop-name">${item.shop.shop_name}</p>
                    </div>
                    ${showDistance && item.distance ? 
                        `<span class="distance-badge">${formatDistance(item.distance)}</span>` : ''
                    }
                </div>
                
                <div class="stock-info">
                    <span class="stock-amount ${stockClass}">${item.units}</span>
                    <span class="unit-type">${item.unit_type}</span>
                </div>
                
                ${item.description ? `
                    <p class="item-description">${item.description}</p>
                ` : ''}
                
                <div class="item-actions">
                    <button class="view-details-btn" onclick="viewItemDetails(${item.id})">
                        View Details
                    </button>
                    <button class="locate-shop-btn" onclick="locateShop(${item.shop.id})">
                        📍 Locate
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add click event to entire card
    container.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if button was clicked
            if (!e.target.closest('button')) {
                const itemId = card.dataset.itemId;
                viewItemDetails(itemId);
            }
        });
    });
}

// Search functionality
async function handleSearch(event) {
    event.preventDefault();
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        showModal('Please enter a search term', 'error');
        return;
    }

    isSearching = true;
    
    try {
        searchResultsContainer.innerHTML = '<div class="loading-spinner"></div>';
        searchResultsHeader.style.display = 'flex';

        // First query: Search items
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .ilike('item_name', `%${searchTerm}%`);

        if (itemsError) throw itemsError;

        if (!items || items.length === 0) {
            searchResultsContainer.innerHTML = '';
            resultsCount.textContent = '0 results';
            noResults.style.display = 'block';
            return;
        }

        // Second query: Get shops for these items
        const shopIds = [...new Set(items.map(item => item.shop_id))];
        const { data: shops, error: shopsError } = await supabase
            .from('shops')
            .select('*')
            .in('id', shopIds);

        if (shopsError) throw shopsError;

        // Combine items with shop data
        const shopMap = {};
        shops.forEach(shop => {
            shopMap[shop.id] = shop;
        });

        const itemsWithShops = items.map(item => ({
            ...item,
            shop: shopMap[item.shop_id],
            distance: userLocation ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                shopMap[item.shop_id]?.latitude,
                shopMap[item.shop_id]?.longitude
            ) : null
        }));

        // Sort by distance if available
        if (userLocation) {
            itemsWithShops.sort((a, b) => {
                if (a.distance && b.distance) return a.distance - b.distance;
                return 0;
            });
        }

        displayItems(itemsWithShops, searchResultsContainer, !!userLocation);
        resultsCount.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`;
        noResults.style.display = 'none';
        
    } catch (error) {
        showModal('Error searching: ' + error.message, 'error');
        searchResultsContainer.innerHTML = '';
    } finally {
        isSearching = false;
    }
}

// Navigation functions
function viewItemDetails(itemId) {
    // Save to recently viewed
    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    recentlyViewed = recentlyViewed.filter(id => id !== itemId);
    recentlyViewed.unshift(itemId);
    recentlyViewed = recentlyViewed.slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    
    window.location.href = `product.html?item_id=${itemId}`;
}

function locateShop(shopId) {
    window.location.href = `location.html?shop_id=${shopId}`;
}

// Initialize
async function initialize() {
    await checkAuth();
    
    try {
        userLocation = await getUserLocation();
        showModal('Location found! Loading nearby items...', 'success');
        setTimeout(() => modal.style.display = 'none', 1500);
    } catch (error) {
        console.log('Location not available:', error.message);
        // Continue without location
    }
    
    await loadNearbyItems();
    await loadRecentlyViewed();
}

// Event listeners
loginBtn.addEventListener('click', () => {
    window.location.href = 'customer-login.html';
});

logoutBtn.addEventListener('click',() => {
    window.location.href = '../index.html';
});
searchForm.addEventListener('submit', handleSearch);

refreshLocationBtn.addEventListener('click', async () => {
    try {
        userLocation = await getUserLocation();
        showModal('Location updated!', 'success');
        setTimeout(() => modal.style.display = 'none', 1500);
        await loadNearbyItems();
        
        // Also refresh search results if we're searching
        if (isSearching) {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                searchForm.dispatchEvent(new Event('submit'));
            }
        }
    } catch (error) {
        showModal(error.message, 'error');
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);