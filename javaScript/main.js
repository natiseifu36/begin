// Simple validator: writes "invalid" when the value doesn't contain '@' and '.com'
function isSimpleEmailValid(value) {
    if (typeof value !== 'string') value = String(value || '');
    return value.includes('@') && value.includes('.com');
}

function validateAndShow(value, feedbackEl) {
    if (!isSimpleEmailValid(value)) {
        feedbackEl.textContent = 'invalid';
        feedbackEl.setAttribute('aria-invalid', 'true');
    } else {
        feedbackEl.textContent = '';
        feedbackEl.removeAttribute('aria-invalid');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const input = document.querySelector('input[data-validate="simple-email"], input[type="email"]');
    if (!input) return;

    let feedback = document.getElementById('email-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'email-feedback';
        feedback.setAttribute('aria-live', 'polite');
        input.insertAdjacentElement('afterend', feedback);
    }

    // Validate on input (live feedback) and on blur
    input.addEventListener('input', function () {
        validateAndShow(input.value, feedback);
    });
    input.addEventListener('blur', function () {
        validateAndShow(input.value, feedback);
    });
});

// Expose functions for manual calls in console
window.isSimpleEmailValid = isSimpleEmailValid;
window.validateAndShow = validateAndShow;
