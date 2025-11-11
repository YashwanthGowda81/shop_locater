// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backToHomeBtn = document.getElementById('back-to-home-btn');
// ... rest of your code
const shopNameHeader = document.getElementById('shop-name-header');
const currentShopName = document.getElementById('current-shop-name');
const shopPhoneDisplay = document.getElementById('shop-phone-display');
const dashboardBtn = document.getElementById('dashboard-btn');
const editShopBtn = document.getElementById('edit-shop-btn');
const createBtn = document.getElementById('create-btn');

let shopId = null;
let currentShop = null;

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

// Load shop data
async function loadShopData() {
    shopId = getShopIdFromUrl();

    if (!shopId) {
        showModal('No shop ID provided', 'error');
        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 2000);
        return;
    }

    try {
        // Check if user owns this shop
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'owner-login.html';
            return;
        }

        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .eq('user_id', user.id) // Security: ensure user owns this shop
            .single();

        if (error) throw error;
        if (!shop) throw new Error('Shop not found or access denied');

        currentShop = shop;
        updateShopDisplay(shop);

    } catch (error) {
        showModal('Error loading shop: ' + error.message, 'error');
        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 2000);
    }
}

function updateShopDisplay(shop) {
    shopNameHeader.textContent = `${shop.shop_name} - Menu`;
    currentShopName.textContent = shop.shop_name;
    shopPhoneDisplay.textContent = shop.phone_number || 'No phone number set';
}

// Event listeners
backToHomeBtn.addEventListener('click', () => {
    window.location.href = 'shophome.html';
});

dashboardBtn.addEventListener('click', () => {
    if (shopId) {
        window.location.href = `shopdashboard.html?shop_id=${shopId}`;
    }
});

editShopBtn.addEventListener('click', () => {
    if (shopId) {
        window.location.href = `manage-shop.html?shop_id=${shopId}`;
    }
});

createBtn.addEventListener('click', () => {
    if (shopId) {
        window.location.href = `create-item.html?shop_id=${shopId}`;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', loadShopData);