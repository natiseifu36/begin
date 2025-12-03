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

    // Array to hold uploaded user records from signup.xlsx
    window.usersRecords = window.usersRecords || [];
    const usersFileInput = document.getElementById('usersFile');

    // Try to fetch `files/signup.xlsx` from the repository if available (works when serving the folder)
    (async function tryLoadRepoFile(){
        const githubRaw = 'https://raw.githubusercontent.com/natiseifu36/begin/03d384f2091e03eb1da9dd25fdd8964101785318/files/signup.xlsx';
        async function fetchAndParse(url){
            const res = await fetch(url);
            if(!res.ok) return null;
            const arrayBuffer = await res.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const ws = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(ws, {defval: ''});
            return json && json.length ? json : null;
        }

        try{
            // try GitHub raw first
            let json = null;
            try { json = await fetchAndParse(githubRaw); } catch(e) { json = null; }
            // fallback to local path
            if(!json){
                try { json = await fetchAndParse('files/signup.xlsx'); } catch(e){ json = null; }
            }
            if(json){
                window.usersRecords = json;
                msg && (msg.textContent = 'Loaded ' + json.length + ' user(s) from remote file');
            }
        }catch(err){
            // ignore - fallback to file input
        }
    })();

    // Helper to compute SHA-256 hex
    async function sha256Hex(str){
        if(!str) return '';
        const enc = new TextEncoder();
        const data = enc.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // Handle users file upload and parse to JSON records using SheetJS
    if(usersFileInput){
        usersFileInput.addEventListener('change', function(ev){
            const f = ev.target.files && ev.target.files[0];
            if(!f) return;
            const reader = new FileReader();
            reader.onload = function(e){
                try{
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const sheetName = workbook.SheetNames[0];
                    const ws = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(ws, {defval: ''});
                    window.usersRecords = json;
                    msg && (msg.textContent = 'Loaded ' + json.length + ' user(s) from file.');
                } catch(err){
                    console.error(err);
                    msg && (msg.textContent = 'Failed to load users file.');
                }
            };
            reader.readAsArrayBuffer(f);
        });
    }

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

    // Form submit validation + authentication using uploaded signup.xlsx
    if(form){
        form.addEventListener('submit', async function(e){
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

            // Need usersRecords loaded from uploaded signup.xlsx
            if(!window.usersRecords || window.usersRecords.length === 0){
                msg.textContent = 'No users file loaded — please upload signup.xlsx above.';
                return;
            }

            const hashed = await sha256Hex(password.value || '');
            const match = window.usersRecords.find(u => String(u.email || '').trim().toLowerCase() === String(email.value || '').trim().toLowerCase() && String(u.passwordHash || '').toLowerCase() === hashed.toLowerCase());
            if(match){
                // successful login — redirect to home
                msg.textContent = 'Login successful — redirecting...';
                setTimeout(()=>{ window.location.href = 'html/home.html'; }, 500);
            } else {
                msg.textContent = 'Invalid email or password.';
            }
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
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const firstHelp = document.getElementById('firstNameHelp');
    const lastHelp = document.getElementById('lastNameHelp');
    const age = document.getElementById('age');
    const gender = document.getElementById('gender');
    const ageHelp = document.getElementById('ageHelp');
    const genderHelp = document.getElementById('genderHelp');

    // Try to preload existing users from repo file if available
    (async function tryLoadRepoUsers(){
        try{
            const resp = await fetch('../files/signup.xlsx');
            if(!resp.ok) return;
            const arrayBuffer = await resp.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const ws = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(ws, {defval: ''});
            if(json && json.length){
                window.usersRecords = json;
                const statusMsg = document.getElementById('msg');
                if(statusMsg) statusMsg.textContent = 'Loaded ' + json.length + ' existing user(s) from repo.';
            }
        }catch(err){
            // silent fail; fallback is manual upload on login page
        }
    })();

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

    // Names must start with an alphabetic character
    function startsWithAlpha(value){
        return /^[A-Za-z]/.test(String(value || ''));
    }

    if(firstName){
        firstName.addEventListener('input', function(){
            if(!firstName.value) {
                firstName.setCustomValidity('');
                if(firstHelp) firstHelp.textContent = '';
                return;
            }
            if(!startsWithAlpha(firstName.value)){
                firstName.setCustomValidity('First name must start with a letter.');
                if(firstHelp) firstHelp.textContent = 'Must start with a letter.';
            } else {
                firstName.setCustomValidity('');
                if(firstHelp) firstHelp.textContent = '';
            }
        });
    }

    if(lastName){
        lastName.addEventListener('input', function(){
            if(!lastName.value) {
                lastName.setCustomValidity('');
                if(lastHelp) lastHelp.textContent = '';
                return;
            }
            if(!startsWithAlpha(lastName.value)){
                lastName.setCustomValidity('Last name must start with a letter.');
                if(lastHelp) lastHelp.textContent = 'Must start with a letter.';
            } else {
                lastName.setCustomValidity('');
                if(lastHelp) lastHelp.textContent = '';
            }
        });
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

    // Live checks for age and gender
    if(age){
        age.addEventListener('input', function(){
            if(!age.value){
                age.setCustomValidity('Age is required.');
                if(ageHelp) ageHelp.textContent = 'Enter your age.';
                return;
            }
            const val = Number(age.value);
            if(Number.isNaN(val) || val < Number(age.min) || val > Number(age.max)){
                age.setCustomValidity('Enter a valid age.');
                if(ageHelp) ageHelp.textContent = 'Please enter a valid age between ' + age.min + ' and ' + age.max + '.';
            } else {
                age.setCustomValidity('');
                if(ageHelp) ageHelp.textContent = '';
            }
        });
    }

    if(gender){
        gender.addEventListener('change', function(){
            if(!gender.value){
                gender.setCustomValidity('Please select a gender option.');
                if(genderHelp) genderHelp.textContent = 'Selection required.';
            } else {
                gender.setCustomValidity('');
                if(genderHelp) genderHelp.textContent = '';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // name validation: ensure first/last start with alphabet
        let firstInvalid = null;
        if(firstName){
            if(!startsWithAlpha(firstName.value)){
                firstName.setCustomValidity('First name must start with a letter.');
                if(firstHelp) firstHelp.textContent = 'Must start with a letter.';
                firstInvalid = firstInvalid || firstName;
            } else {
                firstName.setCustomValidity('');
                if(firstHelp) firstHelp.textContent = '';
            }
        }
        if(lastName){
            if(!startsWithAlpha(lastName.value)){
                lastName.setCustomValidity('Last name must start with a letter.');
                if(lastHelp) lastHelp.textContent = 'Must start with a letter.';
                firstInvalid = firstInvalid || lastName;
            } else {
                lastName.setCustomValidity('');
                if(lastHelp) lastHelp.textContent = '';
            }
        }

        // Age validation
        if(age){
            if(!age.value){
                age.setCustomValidity('Age is required.');
                if(ageHelp) ageHelp.textContent = 'Enter your age.';
                firstInvalid = firstInvalid || age;
            } else {
                const val = Number(age.value);
                if(Number.isNaN(val) || val < Number(age.min) || val > Number(age.max)){
                    age.setCustomValidity('Enter a valid age.');
                    if(ageHelp) ageHelp.textContent = 'Please enter a valid age between ' + age.min + ' and ' + age.max + '.';
                    firstInvalid = firstInvalid || age;
                } else {
                    age.setCustomValidity('');
                    if(ageHelp) ageHelp.textContent = '';
                }
            }
        }

        // Gender validation
        if(gender){
            if(!gender.value){
                gender.setCustomValidity('Please select a gender option.');
                if(genderHelp) genderHelp.textContent = 'Selection required.';
                firstInvalid = firstInvalid || gender;
            } else {
                gender.setCustomValidity('');
                if(genderHelp) genderHelp.textContent = '';
            }
        }

        if(terms && !terms.checked){
            if(termsError) termsError.textContent = 'You must accept the terms to continue.';
            if(!firstInvalid) firstInvalid = terms;
        } else if(termsError) {
            termsError.textContent = '';
        }

        if(firstInvalid){
            firstInvalid.focus && firstInvalid.focus();
            if(firstInvalid.reportValidity) firstInvalid.reportValidity();
            return;
        }

        if (!form.checkValidity()){
            form.reportValidity();
            return;
        }

        // Check if email already exists in loaded usersRecords (if any)
        const signupEmail = (document.getElementById('email') ? document.getElementById('email').value : '').trim().toLowerCase();
        if(window.usersRecords && window.usersRecords.length){
            const exists = window.usersRecords.find(u => String(u.email || '').trim().toLowerCase() === signupEmail);
            if(exists){
                const status = document.getElementById('msg');
                if(status) status.textContent = 'This email is already registered — please log in.';
                if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
                return;
            }
        }

        // Simulate submission and export to signup.xlsx
        if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }

        // helper: compute SHA-256 hex of password (avoid storing plaintext)
        async function sha256Hex(str){
            if(!str) return '';
            const enc = new TextEncoder();
            const data = enc.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
        }

        const pwdValue = pwd ? pwd.value : '';
        const pwdHash = await sha256Hex(pwdValue);

        const record = {
            firstName: firstName ? firstName.value : '',
            lastName: lastName ? lastName.value : '',
            email: document.getElementById('email') ? document.getElementById('email').value : '',
            age: age ? age.value : '',
            gender: gender ? gender.value : '',
            passwordHash: pwdHash,
            createdAt: new Date().toISOString()
        };

        try{
            if(typeof XLSX !== 'undefined'){
                const ws = XLSX.utils.json_to_sheet([record]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Signup');
                XLSX.writeFile(wb, 'signup.xlsx');
            } else {
                console.warn('XLSX library not found; cannot export signup.xlsx');
            }
        } catch(err){
            console.error('Export failed', err);
        }

        // Finish UI
        alert('Account created successfully (demo). An export has been downloaded.');
        form.reset();
        if(strengthBar) strengthBar.style.width = '0%';
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
    });

    // Focus first invalid field when invalid event fires
    form.addEventListener('invalid', (ev) => {
        ev.preventDefault();
        const field = ev.target;
        if(field && typeof field.focus === 'function') field.focus();
    }, true);
});


