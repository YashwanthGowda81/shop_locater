// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const myAccountBtn = document.getElementById('my-account-btn');
// ... rest of your code
const logoutBtn = document.getElementById('logout-btn');
const addShopBtn = document.getElementById('add-shop-btn');
const firstShopBtn = document.getElementById('first-shop-btn');
const shopsContainer = document.getElementById('shops-container');
const noShops = document.getElementById('no-shops');

let currentUser = null;

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

// Check authentication
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = 'owner-login.html';
        return;
    }

    currentUser = user;
    await loadShops();
}

// Load shops - SECURE: Only current user's shops
async function loadShops() {
    try {
        const { data: shops, error } = await supabase
            .from('shops')
            .select('*')
            .eq('user_id', currentUser.id) // SECURITY: Only show user's shops
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!shops || shops.length === 0) {
            shopsContainer.style.display = 'none';
            noShops.style.display = 'block';
            return;
        }

        displayShops(shops);

    } catch (error) {
        showModal('Error loading shops: ' + error.message, 'error');
    }
}

function displayShops(shops) {
    shopsContainer.innerHTML = '';
    shopsContainer.style.display = 'grid';
    noShops.style.display = 'none';

    shops.forEach(async(shop) => {
                // Get item count for this shop
                const { data: items, error } = await supabase
                    .from('items')
                    .select('id')
                    .eq('shop_id', shop.id);

                const itemCount = items ? items.length : 0;

                const shopCard = document.createElement('div');
                shopCard.className = 'shop-card';
                shopCard.innerHTML = `
            <div class="shop-card-header">
                <div>
                    <h3 class="shop-name">${shop.shop_name}</h3>
                    <p class="shop-phone">${shop.phone_number || 'No phone number'}</p>
                    ${shop.latitude && shop.longitude ? 
                        `<p class="shop-location">📍 Location Set</p>` : 
                        `<p class="shop-location" style="color: #ef4444;">📍 Location Not Set</p>`
                    }
                </div>
            </div>
            <div class="shop-stats">
                <div class="stat">
                    <div class="stat-value">${itemCount}</div>
                    <div class="stat-label">Items</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${shop.latitude && shop.longitude ? 'Yes' : 'No'}</div>
                    <div class="stat-label">Location</div>
                </div>
            </div>
        `;
        
        shopCard.addEventListener('click', () => {
            window.location.href = `shop-menu.html?shop_id=${shop.id}`;
        });

        shopsContainer.appendChild(shopCard);
    });
}

// Logout function
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showModal('Error logging out: ' + error.message, 'error');
    } else {
        window.location.href = '../index.html';
    }
}

// Event listeners
myAccountBtn.addEventListener('click', () => {
    window.location.href = 'shopaccount.html';
});

logoutBtn.addEventListener('click', logout);
addShopBtn.addEventListener('click', () => {
    window.location.href = 'manage-shop.html';
});
firstShopBtn.addEventListener('click', () => {
    window.location.href = 'manage-shop.html';
});

// Initialize
document.addEventListener('DOMContentLoaded', checkAuth);