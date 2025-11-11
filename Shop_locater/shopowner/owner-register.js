// Import the shared Supabase client
import { supabase } from './supabaseClient.js';

const registerForm = document.getElementById('register-form');
// ... rest of your code

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



// Handle registration
async function handleRegister(event) {
    event.preventDefault();

    const fullName = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // ... (all your checks for empty fields, password match, etc.)
    if (!fullName || !email || !password || !confirmPassword) {
        showModal('Please fill in all fields', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showModal('Passwords do not match', 'error');
        return;
    }
    if (password.length < 6) {
        showModal('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Register user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName // Pass full_name as metadata
                }
            }
        });

        if (authError) throw authError;

        // !! NO MORE INSERT NEEDED !!
        // The database trigger is handling the profile creation automatically.

        showModal('Registration successful! Please check your email for verification.', 'success');
        setTimeout(() => {
            // Send to the correct login page
            if (window.location.pathname.includes('owner')) {
                window.location.href = 'owner-login.html';
            } else {
                window.location.href = 'customer-login.html';
            }
        }, 3000);

    } catch (error) {
        showModal('Registration failed: ' + error.message, 'error');
    }
}

// Handle registration
// async function handleRegister(event) {
//     event.preventDefault();

//     const fullName = document.getElementById('full_name').value;
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;
//     const confirmPassword = document.getElementById('confirm_password').value;

//     if (!fullName || !email || !password || !confirmPassword) {
//         showModal('Please fill in all fields', 'error');
//         return;
//     }

//     if (password !== confirmPassword) {
//         showModal('Passwords do not match', 'error');
//         return;
//     }

//     if (password.length < 6) {
//         showModal('Password must be at least 6 characters', 'error');
//         return;
//     }

//     try {
//         // Register user
//         const { data: authData, error: authError } = await supabase.auth.signUp({
//             email: email,
//             password: password,
//         });

//         if (authError) throw authError;

//         // Create profile
//         const { error: profileError } = await supabase
//             .from('profiles')
//             .insert([{
//                 id: authData.user.id,
//                 full_name: fullName
//             }]);

//         if (profileError) throw profileError;

//         showModal('Registration successful! Please check your email for verification.', 'success');
//         setTimeout(() => {
//             window.location.href = 'owner-login.html';
//         }, 3000);

//     } catch (error) {
//         showModal('Registration failed: ' + error.message, 'error');
//     }
// }

// Event listeners
registerForm.addEventListener('submit', handleRegister);