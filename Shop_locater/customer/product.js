// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backButton = document.getElementById('back-to-dashboard-btn');
// ... rest of your code
const locateButton = document.getElementById('locate-shop-btn');
const productName = document.getElementById('product-name');
const shopName = document.getElementById('shop-name');
const shopPhone = document.getElementById('shop-phone');
const productStock = document.getElementById('product-stock');
const productDescription = document.getElementById('product-description');
const productImage = document.getElementById('product-image');
const imagePlaceholder = document.getElementById('image-placeholder');

let currentItem = null;
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

// Get item ID from URL
function getItemIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('item_id');
}

// Load product data
async function loadProduct() {
    const itemId = getItemIdFromUrl();

    if (!itemId) {
        showModal('No product ID provided', 'error');
        return;
    }

    try {
        // First query: Get item details
        const { data: item, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (itemError) throw itemError;
        if (!item) throw new Error('Product not found');

        currentItem = item;

        // Second query: Get shop details
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('id', item.shop_id)
            .single();

        if (shopError) throw shopError;
        currentShop = shop;

        displayProductData(item, shop);
        saveToRecentlyViewed(itemId);

    } catch (error) {
        showModal('Error loading product: ' + error.message, 'error');
    }
}

function displayProductData(item, shop) {
    productName.textContent = item.item_name;
    shopName.textContent = shop.shop_name;
    shopPhone.textContent = shop.phone_number || 'No phone number available';
    productStock.textContent = `${item.units} ${item.unit_type}`;

    if (item.description) {
        productDescription.textContent = item.description;
    }

    if (item.photo_url) {
        productImage.src = item.photo_url;
        productImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';
    }
}

function saveToRecentlyViewed(itemId) {
    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(id => id !== itemId);

    // Add to beginning
    recentlyViewed.unshift(itemId);

    // Keep only last 10 items
    recentlyViewed = recentlyViewed.slice(0, 10);

    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

// Event listeners
backButton.addEventListener('click', () => {
    window.location.href = 'customer-dashboard.html';
});

locateButton.addEventListener('click', () => {
    if (currentShop) {
        window.location.href = `location.html?shop_id=${currentShop.id}`;
    } else {
        showModal('Shop information not available', 'error');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', loadProduct);