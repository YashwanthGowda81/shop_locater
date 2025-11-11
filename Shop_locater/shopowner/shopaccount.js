// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backBtn = document.getElementById('back-btn');
// ... rest of your code
const accountForm = document.getElementById('account-form');
const cancelBtn = document.getElementById('cancel-btn');
const fullNameInput = document.getElementById('full_name');
const emailInput = document.getElementById('email');
const totalShopsEl = document.getElementById('total-shops');
const totalItemsEl = document.getElementById('total-items');

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

// Check authentication and load data
async function initialize() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = 'owner-login.html';
        return;
    }

    currentUser = user;
    await loadProfileData();
    await loadBusinessStats();
}

// Load profile data
async function loadProfileData() {
    try {
        // Get user email from auth
        emailInput.value = currentUser.email;

        // Get profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

        if (profile) {
            fullNameInput.value = profile.full_name || '';
        }

    } catch (error) {
        showModal('Error loading profile: ' + error.message, 'error');
    }
}

// Load business statistics
async function loadBusinessStats() {
    try {
        // Get total shops
        const { data: shops, error: shopsError } = await supabase
            .from('shops')
            .select('id')
            .eq('user_id', currentUser.id);

        if (shopsError) throw shopsError;

        const totalShops = shops ? shops.length : 0;
        totalShopsEl.textContent = totalShops;

        // Get total items across all shops
        if (totalShops > 0) {
            const shopIds = shops.map(shop => shop.id);
            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('id')
                .in('shop_id', shopIds);

            if (itemsError) throw itemsError;

            const totalItems = items ? items.length : 0;
            totalItemsEl.textContent = totalItems;
        } else {
            totalItemsEl.textContent = '0';
        }

    } catch (error) {
        console.error('Error loading stats:', error);
        totalShopsEl.textContent = '0';
        totalItemsEl.textContent = '0';
    }
}

// Handle profile update
async function handleProfileUpdate(event) {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();

    if (!fullName) {
        showModal('Please enter your full name', 'error');
        return;
    }

    try {
        // Use upsert to create or update profile
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: currentUser.id,
                full_name: fullName
            }, {
                onConflict: 'id'
            });

        if (error) throw error;

        showModal('Profile updated successfully!', 'success');

    } catch (error) {
        showModal('Error updating profile: ' + error.message, 'error');
    }
}

// Event listeners
backBtn.addEventListener('click', () => {
    window.history.back();
});

cancelBtn.addEventListener('click', () => {
    // Reload original data
    loadProfileData();
});

accountForm.addEventListener('submit', handleProfileUpdate);

// Initialize
document.addEventListener('DOMContentLoaded', initialize);