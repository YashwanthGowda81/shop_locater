// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backBtn = document.getElementById('back-btn');
// ... rest of your code
const itemForm = document.getElementById('item-form');
const cancelBtn = document.getElementById('cancel-btn');
const itemNameInput = document.getElementById('item_name');
const unitsInput = document.getElementById('units');
const unitTypeSelect = document.getElementById('unit_type');
const descriptionInput = document.getElementById('description');
const photoInput = document.getElementById('photo');

let shopId = null;
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

// Get shop ID from URL
function getShopIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shop_id');
}

// Check authentication
async function initialize() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = 'owner-login.html';
        return;
    }

    currentUser = user;
    shopId = getShopIdFromUrl();

    if (!shopId) {
        showModal('No shop specified', 'error');
        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 2000);
        return;
    }

    // Verify user owns this shop
    const { data: shop, error } = await supabase
        .from('shops')
        .select('id')
        .eq('id', shopId)
        .eq('user_id', currentUser.id)
        .single();

    if (error || !shop) {
        showModal('Access denied or shop not found', 'error');
        setTimeout(() => {
            window.location.href = 'shophome.html';
        }, 2000);
    }
}

// Handle photo upload
async function uploadPhoto(file) {
    if (!file) return null;

    try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Please select a valid image file (JPG, PNG, or WebP)');
        }

        // Generate unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${shopId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('item_photos')
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('item_photos')
            .getPublicUrl(filePath);

        return publicUrl;

    } catch (error) {
        console.error('Error uploading photo:', error);
        throw new Error('Failed to upload photo: ' + error.message);
    }
}

// Handle item creation
async function handleItemCreate(event) {
    event.preventDefault();

    const itemName = itemNameInput.value.trim();
    const units = parseFloat(unitsInput.value);
    const unitType = unitTypeSelect.value;
    const description = descriptionInput.value.trim();
    const photoFile = photoInput.files[0];

    // Validation
    if (!itemName) {
        showModal('Please enter an item name', 'error');
        return;
    }

    if (isNaN(units) || units <= 0) {
        showModal('Please enter a valid quantity', 'error');
        return;
    }

    if (!unitType) {
        showModal('Please select a unit type', 'error');
        return;
    }

    try {
        let photoUrl = null;

        // Upload photo if provided
        if (photoFile) {
            if (photoFile.size > 5 * 1024 * 1024) { // 5MB limit
                showModal('Photo must be less than 5MB', 'error');
                return;
            }
            photoUrl = await uploadPhoto(photoFile);
        }

        // Create item record
        const itemData = {
            shop_id: shopId,
            item_name: itemName,
            units: units,
            unit_type: unitType,
            description: description || null,
            photo_url: photoUrl
        };

        const { data, error } = await supabase
            .from('items')
            .insert([itemData])
            .select();

        if (error) throw error;

        showModal('Item created successfully!', 'success');

        // Reset form
        itemForm.reset();

        setTimeout(() => {
            window.location.href = `shopdashboard.html?shop_id=${shopId}`;
        }, 1500);

    } catch (error) {
        showModal('Error creating item: ' + error.message, 'error');
    }
}

// Event listeners
backBtn.addEventListener('click', () => {
    window.history.back();
});

cancelBtn.addEventListener('click', () => {
    if (shopId) {
        window.location.href = `shopdashboard.html?shop_id=${shopId}`;
    } else {
        window.location.href = 'shophome.html';
    }
});

itemForm.addEventListener('submit', handleItemCreate);

// Initialize
document.addEventListener('DOMContentLoaded', initialize);