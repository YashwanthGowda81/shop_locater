// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backBtn = document.getElementById('back-btn');
// ... rest of your code
const shopForm = document.getElementById('shop-form');
const shopNameInput = document.getElementById('shop_name');
const phoneNumberInput = document.getElementById('phone_number');
const setLocationBtn = document.getElementById('set-location-btn');
const locationStatus = document.getElementById('location-status');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-shop-btn');
const pageTitle = document.getElementById('page-title');

let shopId = null;
let currentUser = null;
let locationData = null;
let isEditing = false;

// Store form data before navigation
let formData = {
    shop_name: '',
    phone_number: ''
};

// Modal functionality
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalActions = document.getElementById('modal-actions');
const confirmDelete = document.getElementById('confirm-delete');
const cancelDelete = document.getElementById('cancel-delete');
const closeModal = document.querySelector('.close');

function showModal(message, type = 'info', showActions = false) {
    modalMessage.textContent = message;
    modalMessage.className = type;
    modalActions.style.display = showActions ? 'flex' : 'none';
    modal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

cancelDelete.addEventListener('click', () => {
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

// Save form data to session storage
function saveFormData() {
    formData = {
        shop_name: shopNameInput.value,
        phone_number: phoneNumberInput.value
    };
    sessionStorage.setItem('shop_form_data', JSON.stringify(formData));
}

// Load form data from session storage
function loadFormData() {
    const savedData = sessionStorage.getItem('shop_form_data');
    if (savedData) {
        formData = JSON.parse(savedData);
        shopNameInput.value = formData.shop_name;
        phoneNumberInput.value = formData.phone_number;
    }
}

// Clear saved form data
function clearFormData() {
    sessionStorage.removeItem('shop_form_data');
    sessionStorage.removeItem('shop_location');
}

// Check authentication and load shop data
async function initialize() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = 'owner-login.html';
        return;
    }

    currentUser = user;
    shopId = getShopIdFromUrl();

    // Load saved form data first (for new shops)
    loadFormData();

    if (shopId) {
        // Editing existing shop
        isEditing = true;
        pageTitle.textContent = 'Edit Shop';
        deleteBtn.style.display = 'block';
        await loadShopData();
    } else {
        // Creating new shop
        pageTitle.textContent = 'Create New Shop';
        deleteBtn.style.display = 'none';

        // Check for location data from sessionStorage
        const savedLocation = sessionStorage.getItem('shop_location');
        if (savedLocation) {
            locationData = JSON.parse(savedLocation);
            updateLocationStatus();
        }
    }

    // Add input listeners to save form data
    shopNameInput.addEventListener('input', saveFormData);
    phoneNumberInput.addEventListener('input', saveFormData);
}

// Load shop data for editing
async function loadShopData() {
    try {
        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .eq('user_id', currentUser.id)
            .single();

        if (error) throw error;
        if (!shop) throw new Error('Shop not found');

        // Populate form - override any saved data
        shopNameInput.value = shop.shop_name || '';
        phoneNumberInput.value = shop.phone_number || '';

        // Clear any saved form data for editing mode
        clearFormData();

        // Set location data
        if (shop.latitude && shop.longitude) {
            locationData = {
                latitude: shop.latitude,
                longitude: shop.longitude
            };
            updateLocationStatus();
        }

    } catch (error) {
        showModal('Error loading shop: ' + error.message, 'error');
    }
}

function updateLocationStatus() {
    if (locationData) {
        locationStatus.innerHTML = `
            <span class="status-icon">📍</span>
            <span class="status-text">
                Location set: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
            </span>
        `;
        locationStatus.style.color = '#059669';
    } else {
        locationStatus.innerHTML = `
            <span class="status-icon">📍</span>
            <span class="status-text">Location not set</span>
        `;
        locationStatus.style.color = '#374151';
    }
}

// Handle shop save
async function handleShopSave(event) {
    event.preventDefault();

    const shopName = shopNameInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim();

    if (!shopName) {
        showModal('Please enter a shop name', 'error');
        return;
    }

    if (!locationData && isEditing) {
        showModal('Please set a location for your shop', 'error');
        return;
    }

    try {
        const shopData = {
            shop_name: shopName,
            phone_number: phoneNumber,
            user_id: currentUser.id
        };

        // Add location if available
        if (locationData) {
            shopData.latitude = locationData.latitude;
            shopData.longitude = locationData.longitude;
        }

        let result;
        if (isEditing) {
            // Update existing shop
            shopData.id = shopId;
            result = await supabase
                .from('shops')
                .upsert(shopData);
        } else {
            // Create new shop
            result = await supabase
                .from('shops')
                .insert([shopData])
                .select();
        }

        if (result.error) throw result.error;

        showModal(
            isEditing ? 'Shop updated successfully!' : 'Shop created successfully!',
            'success'
        );

        // Clear session storage
        clearFormData();

        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 1500);

    } catch (error) {
        showModal('Error saving shop: ' + error.message, 'error');
    }
}

// Handle shop deletion
async function handleShopDelete() {
    if (!isEditing) return;

    showModal(
        'Are you sure you want to delete this shop? This action cannot be undone.',
        'error',
        true
    );
}

async function confirmShopDelete() {
    try {
        // First, delete all items associated with this shop
        const { error: itemsError } = await supabase
            .from('items')
            .delete()
            .eq('shop_id', shopId);

        if (itemsError) throw itemsError;

        // Then delete the shop
        const { error: shopError } = await supabase
            .from('shops')
            .delete()
            .eq('id', shopId)
            .eq('user_id', currentUser.id);

        if (shopError) throw shopError;

        showModal('Shop deleted successfully!', 'success');

        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 1500);

    } catch (error) {
        showModal('Error deleting shop: ' + error.message, 'error');
    }
}

// Event listeners
backBtn.addEventListener('click', () => {
    // Clear saved data when going back
    if (!isEditing) {
        clearFormData();
    }
    window.history.back();
});

shopForm.addEventListener('submit', handleShopSave);

setLocationBtn.addEventListener('click', () => {
            // Save current form data before navigating
            saveFormData();
            window.location.href = `add_shop_location.html${isEditing ? `?shop_id=${shopId}` : ''}`;
});

deleteBtn.addEventListener('click', handleShopDelete);
confirmDelete.addEventListener('click', confirmShopDelete);

// Initialize
document.addEventListener('DOMContentLoaded', initialize);