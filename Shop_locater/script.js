// --- 1. Navigation for Role Cards ---
// These functions are called by the 'onclick' attributes in your index.html

function navigateToCustomer() {
    // This is the correct path to your customer dashboard
    window.location.href = 'customer/customer-login.html';
}

function navigateToOwner() {
    // This is the correct path to your owner login
    window.location.href = 'shopowner/owner-login.html';
}


// --- 2. "How It Works" Tab Functionality ---
// This code runs after the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Find all the tab buttons
    const tabs = document.querySelectorAll('.user-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the target ID (e.g., "customer" or "shop-owner")
            const targetId = this.getAttribute('data-target');
            
            // Remove 'active' class from all tabs and content
            document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.user-content').forEach(c => c.classList.remove('active'));
            
            // Add 'active' class to the clicked tab and the target content
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // I have removed the old, duplicate code that was here.
});