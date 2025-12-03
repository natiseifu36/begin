// Simple validator: writes "invalid" when the value doesn't contain '@' and '.com'
function isSimpleEmailValid(value) {
    if (typeof value !== 'string') value = String(value || '');
    return value.includes('@') && value.includes('.com');
}

function validateAndShow(value, feedbackEl) {
    if (!isSimpleEmailValid(value)) {
        feedbackEl.textContent = 'invalid';
        feedbackEl.setAttribute('aria-invalid', 'true');
        feedbackEl.classList && feedbackEl.classList.add('msg');
    } else {
        feedbackEl.textContent = '';
        feedbackEl.removeAttribute('aria-invalid');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const form = document.getElementById('loginForm');
    const email = document.querySelector('input[data-validate="simple-email"], input[type="email"]');
    const password = document.getElementById('password');
    const toggle = document.getElementById('togglePwd');
    const msg = document.getElementById('msg');

    // Create email feedback element if missing
    let feedback = document.getElementById('email-feedback');
    if (!feedback && email) {
        feedback = document.createElement('div');
        feedback.id = 'email-feedback';
        feedback.setAttribute('aria-live', 'polite');
        feedback.style.color = '';
        email.insertAdjacentElement('afterend', feedback);
    }

    function clearFieldState(el){
        if(!el) return;
        el.classList.remove('invalid');
        el.removeAttribute('aria-invalid');
    }

    function setFieldInvalid(el){
        if(!el) return;
        el.classList.add('invalid');
        el.setAttribute('aria-invalid','true');
    }

    // Live email validation
    if(email){
        email.addEventListener('input', function(){
            validateAndShow(email.value, feedback);
            if(isSimpleEmailValid(email.value)) clearFieldState(email);
            else setFieldInvalid(email);
        });
        email.addEventListener('blur', function(){
            validateAndShow(email.value, feedback);
        });
    }

    // Toggle password visibility
    if(toggle && password){
        toggle.addEventListener('click', function(){
            const isPwd = password.type === 'password';
            password.type = isPwd ? 'text' : 'password';
            toggle.textContent = isPwd ? 'Hide' : 'Show';
            toggle.setAttribute('aria-pressed', String(isPwd));
            password.focus();
        });
    }

    // Form submit validation
    if(form){
        form.addEventListener('submit', function(e){
            e.preventDefault();
            let firstInvalid = null;
            if(!email || !isSimpleEmailValid(email.value)){
                setFieldInvalid(email);
                if(feedback) feedback.textContent = 'invalid';
                if(!firstInvalid) firstInvalid = email;
            } else {
                clearFieldState(email);
                if(feedback) feedback.textContent = '';
            }

            if(!password || password.value.trim().length === 0){
                setFieldInvalid(password);
                if(!firstInvalid) firstInvalid = password;
            } else {
                clearFieldState(password);
            }

            if(firstInvalid){
                msg.textContent = 'Please fix the highlighted fields';
                firstInvalid.focus();
                return;
            }

            // If passed, simulate submit success
            msg.textContent = 'Signed in (demo)';
            msg.style.color = '';
            // In a real app, submit the form or call the API here.
        });
    }
});

// Expose functions for manual calls in console
window.isSimpleEmailValid = isSimpleEmailValid;
window.validateAndShow = validateAndShow;

// Signup page behavior: show/hide password, strength meter, confirmation and terms handling
document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('signupForm');
    if(!form) return; // nothing to do on other pages

    const pwd = document.getElementById('password');
    const confirmPwd = document.getElementById('confirmPassword');
    const toggle = document.getElementById('togglePwd');
    const strengthBar = document.getElementById('strengthBar');
    const pwdError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmError');
    const terms = document.getElementById('terms');
    const termsError = document.getElementById('termsError');
    const submitBtn = document.getElementById('submitBtn');

    if(toggle && pwd){
        toggle.addEventListener('click', () => {
            const isHidden = pwd.type === 'password';
            pwd.type = isHidden ? 'text' : 'password';
            if(confirmPwd) confirmPwd.type = isHidden ? 'text' : 'password';
            toggle.textContent = isHidden ? 'Hide' : 'Show';
            toggle.setAttribute('aria-pressed', String(isHidden));
        });
    }

    function estimateStrength(value){
        let score = 0;
        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;
        return score; // 0..4
    }

    if(pwd){
        pwd.addEventListener('input', () => {
            const score = estimateStrength(pwd.value);
            if(strengthBar) strengthBar.style.width = (score / 4 * 100) + '%';
            if(strengthBar){
                if (score <= 1) strengthBar.style.background = '#ef4444';
                else if (score === 2) strengthBar.style.background = '#f59e0b';
                else strengthBar.style.background = 'linear-gradient(90deg,#f59e0b,#10b981)';
            }
            if (pwd.value && score < 2) {
                pwd.setCustomValidity('Password is too weak.');
                if(pwdError) pwdError.textContent = 'Choose a stronger password (mix letters and numbers).';
            } else {
                pwd.setCustomValidity('');
                if(pwdError) pwdError.textContent = '';
            }
            if(confirmPwd) checkConfirm();
        });
    }

    function checkConfirm(){
        if (!confirmPwd) return;
        if (!confirmPwd.value) {
            confirmPwd.setCustomValidity('');
            if(confirmError) confirmError.textContent = '';
            return;
        }
        if (pwd && pwd.value !== confirmPwd.value) {
            confirmPwd.setCustomValidity('Passwords do not match.');
            if(confirmError) confirmError.textContent = 'Passwords do not match.';
        } else {
            confirmPwd.setCustomValidity('');
            if(confirmError) confirmError.textContent = '';
        }
    }

    if(confirmPwd) confirmPwd.addEventListener('input', checkConfirm);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if(terms && !terms.checked){
            if(termsError) termsError.textContent = 'You must accept the terms to continue.';
            terms.focus();
            return;
        } else if(termsError) {
            termsError.textContent = '';
        }

        if (!form.checkValidity()){
            form.reportValidity();
            return;
        }

        // Simulate submission
        if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }
        setTimeout(()=>{
            alert('Account created successfully (demo).');
            form.reset();
            if(strengthBar) strengthBar.style.width = '0%';
            if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
        }, 900);
    });

    // Focus first invalid field when invalid event fires
    form.addEventListener('invalid', (ev) => {
        ev.preventDefault();
        const field = ev.target;
        if(field && typeof field.focus === 'function') field.focus();
    }, true);
});


