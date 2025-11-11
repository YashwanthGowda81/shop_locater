// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

// DOM elements
const backToMenuBtn = document.getElementById('back-to-menu-btn');
// ... rest of your code
const editShopBtn = document.getElementById('edit-shop-btn');
const addItemBtn = document.getElementById('add-item-btn');
const firstItemBtn = document.getElementById('first-item-btn');
const shopNameHeader = document.getElementById('shop-name-header');
const itemsTableBody = document.getElementById('items-table-body');
const noItems = document.getElementById('no-items');
const totalItemsEl = document.getElementById('total-items');
const inStockItemsEl = document.getElementById('in-stock-items');
const lowStockItemsEl = document.getElementById('low-stock-items');

let shopId = null;
let currentUser = null;
let currentItems = [];

// Modal elements
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.querySelector('.modal-input');
const modalActions = document.querySelector('.modal-actions');
const modalActionsDelete = document.querySelector('.modal-actions-delete');
const editUnitsInput = document.getElementById('edit-units-input');
const editUnitTypeSelect = document.getElementById('edit-unit-type-select');
const confirmEdit = document.getElementById('confirm-edit');
const cancelEdit = document.getElementById('cancel-edit');
const confirmDelete = document.getElementById('confirm-delete');
const cancelDelete = document.getElementById('cancel-delete');
const closeModal = document.querySelector('.close');

let currentEditItemId = null;

function showModal(message, type = 'info', showInput = false, showActions = false, showDeleteActions = false) {
    modalMessage.textContent = message;
    modalMessage.className = type;
    modalInput.style.display = showInput ? 'block' : 'none';
    modalActions.style.display = showActions ? 'flex' : 'none';
    modalActionsDelete.style.display = showDeleteActions ? 'flex' : 'none';
    modal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    resetModal();
});

cancelEdit.addEventListener('click', () => {
    modal.style.display = 'none';
    resetModal();
});

cancelDelete.addEventListener('click', () => {
    modal.style.display = 'none';
    resetModal();
});

function resetModal() {
    currentEditItemId = null;
    editUnitsInput.value = '';
    editUnitTypeSelect.value = '';
}

// Get shop ID from URL
function getShopIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shop_id');
}

// Check authentication and load data
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

    await loadShopData();
    await loadItems();
}

// Load shop data
async function loadShopData() {
    try {
        const { data: shop, error } = await supabase
            .from('shops')
            .select('shop_name')
            .eq('id', shopId)
            .eq('user_id', currentUser.id)
            .single();

        if (error) throw error;
        if (!shop) throw new Error('Shop not found');

        shopNameHeader.textContent = `${shop.shop_name} - Dashboard`;

    } catch (error) {
        showModal('Error loading shop: ' + error.message, 'error');
    }
}

// Load items for this shop
async function loadItems() {
    try {
        itemsTableBody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div></td></tr>';

        const { data: items, error } = await supabase
            .from('items')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentItems = items || [];
        displayItems(currentItems);
        updateStats(currentItems);

    } catch (error) {
        console.error('Error loading items:', error);
        showModal('Error loading items: ' + error.message, 'error');
        itemsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">Error loading items. Please try again.</td></tr>';
    }
}

function displayItems(items) {
    if (!items || items.length === 0) {
        itemsTableBody.innerHTML = '';
        itemsTableBody.style.display = 'none';
        noItems.style.display = 'block';
        return;
    }

    itemsTableBody.style.display = 'table-row-group';
    noItems.style.display = 'none';
    itemsTableBody.innerHTML = '';

    items.forEach(item => {
                const row = document.createElement('tr');

                // Determine stock status
                let stockClass = 'stock-amount';
                if (item.units === 0) {
                    stockClass += ' out-of-stock';
                } else if (item.units < 10) {
                    stockClass += ' low-stock';
                }

                row.innerHTML = `
            <td>
                <div class="item-name">${item.item_name}</div>
                ${item.photo_url ? `<div style="font-size: 0.8rem; color: #6b7280;">📷 Photo Available</div>` : ''}
            </td>
            <td>
                <div class="stock-info">
                    <span class="${stockClass}">${item.units}</span>
                </div>
            </td>
            <td>
                <span class="unit-type">${item.unit_type}</span>
            </td>
            <td>
                <div class="item-description" title="${item.description || 'No description'}">
                    ${item.description || '-'}
                </div>
            </td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline edit-btn" data-id="${item.id}" data-units="${item.units}" data-unit-type="${item.unit_type}">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}" data-name="${item.item_name}">
                    Delete
                </button>
            </td>
        `;

        itemsTableBody.appendChild(row);
    });

    // Add event listeners using event delegation - FIXED
    itemsTableBody.addEventListener('click', function(event) {
        // Handle edit button clicks
        if (event.target.classList.contains('edit-btn')) {
            const itemId = event.target.dataset.id;
            const currentUnits = event.target.dataset.units;
            const currentUnitType = event.target.dataset.unitType;
            handleEditClick(itemId, currentUnits, currentUnitType);
        }
        
        // Handle delete button clicks
        if (event.target.classList.contains('delete-btn')) {
            const itemId = event.target.dataset.id;
            const itemName = event.target.dataset.name;
            handleDeleteClick(itemId, itemName);
        }
    });
}

// Separate function for edit click
function handleEditClick(itemId, currentUnits, currentUnitType) {
    currentEditItemId = itemId;
    editUnitsInput.value = currentUnits;
    editUnitTypeSelect.value = currentUnitType;

    showModal(
        'Edit item quantity and unit type:',
        'info',
        true,
        true,
        false
    );
}

// Separate function for delete click
function handleDeleteClick(itemId, itemName) {
    currentEditItemId = itemId;

    showModal(
        `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        'error',
        false,
        false,
        true
    );
}

function updateStats(items) {
    const totalItems = items.length;
    const inStockItems = items.filter(item => item.units > 0).length;
    const lowStockItems = items.filter(item => item.units > 0 && item.units < 10).length;

    totalItemsEl.textContent = totalItems;
    inStockItemsEl.textContent = inStockItems;
    lowStockItemsEl.textContent = lowStockItems;
}

async function handleEditSave() {
    if (!currentEditItemId) return;

    const newUnits = parseFloat(editUnitsInput.value);
    const newUnitType = editUnitTypeSelect.value;

    if (isNaN(newUnits) || newUnits < 0) {
        showModal('Please enter a valid quantity', 'error');
        return;
    }

    if (!newUnitType) {
        showModal('Please select a unit type', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('items')
            .update({
                units: newUnits,
                unit_type: newUnitType
            })
            .eq('id', currentEditItemId)
            .eq('shop_id', shopId);

        if (error) throw error;

        showModal('Item updated successfully!', 'success');
        await loadItems(); // Refresh the list
        resetModal();
        
    } catch (error) {
        showModal('Error updating item: ' + error.message, 'error');
    }
}

async function handleDeleteConfirm() {
    if (!currentEditItemId) return;

    try {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', currentEditItemId)
            .eq('shop_id', shopId);

        if (error) throw error;

        showModal('Item deleted successfully!', 'success');
        await loadItems(); // Refresh the list
        resetModal();
        
    } catch (error) {
        showModal('Error deleting item: ' + error.message, 'error');
    }
}

// Event listeners
backToMenuBtn.addEventListener('click', () => {
    window.location.href = `shop-menu.html?shop_id=${shopId}`;
});

editShopBtn.addEventListener('click', () => {
    window.location.href = `manage-shop.html?shop_id=${shopId}`;
});

addItemBtn.addEventListener('click', () => {
    window.location.href = `create-item.html?shop_id=${shopId}`;
});

firstItemBtn.addEventListener('click', () => {
    window.location.href = `create-item.html?shop_id=${shopId}`;
});

confirmEdit.addEventListener('click', handleEditSave);
confirmDelete.addEventListener('click', handleDeleteConfirm);

// Initialize
document.addEventListener('DOMContentLoaded', initialize);