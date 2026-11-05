const authForm = document.getElementById('auth-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const nameField = document.getElementById('name-field');
const roleField = document.getElementById('role-field');
const nameInput = document.getElementById('name');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('password-toggle');
const accountTitle = document.getElementById('account-title');
const accountSubtitle = document.getElementById('account-subtitle');
const submitButton = document.getElementById('submit-button');
const formMessage = document.getElementById('form-message');

let isRegistering = false;

function setMode(registering) {
    isRegistering = registering;

    nameField.hidden = !registering;
    roleField.hidden = !registering;
    nameInput.required = registering;
    passwordInput.minLength = registering ? 8 : 0;
    loginTab.setAttribute('aria-pressed', String(!registering));
    registerTab.setAttribute('aria-pressed', String(registering));

    passwordInput.autocomplete = registering
        ? 'new-password'
        : 'current-password';

    loginTab.classList.toggle('active', !registering);
    registerTab.classList.toggle('active', registering);

    accountTitle.textContent = registering
        ? 'Create your account'
        : 'Welcome back';

    accountSubtitle.textContent = registering
        ? 'Enter your details to get started.'
        : 'Enter your details to access your account.';

    submitButton.innerHTML = registering
        ? 'Create account <span aria-hidden="true">→</span>'
        : 'Sign in <span aria-hidden="true">→</span>';

    formMessage.textContent = '';
    formMessage.className = 'form-message';
}


passwordToggle.addEventListener('click', () => {
    const showingPassword = passwordInput.type === 'password';

    passwordInput.type = showingPassword ? 'text' : 'password';
    passwordToggle.setAttribute('aria-label',
        showingPassword ? 'Hide password' : 'Show password');
    passwordToggle.setAttribute('title',
        showingPassword ? 'Hide password' : 'Show password');
    passwordToggle.setAttribute('aria-pressed', String(showingPassword));

    passwordToggle.innerHTML = showingPassword
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0112 5c6.4 0 10 7 10 7a16 16 0 01-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.2 3.3-.6"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
});

loginTab.addEventListener('click', () => setMode(false));
registerTab.addEventListener('click', () => setMode(true));

const requestedRole = new URLSearchParams(window.location.search).get('role');

if (requestedRole === 'instructor') {
    setMode(true);
    document.getElementById('role').value = 'instructor';
} else {
    setMode(false);
}

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    formMessage.textContent = '';
    formMessage.className = 'form-message';

    const payload = {
        email: document.getElementById('email').value.trim(),
        password: passwordInput.value
    };

    if (isRegistering) {
        payload.name = nameInput.value.trim();
        payload.role = document.getElementById('role').value;
    }

    submitButton.disabled = true;
    loginTab.disabled = true;
    registerTab.disabled = true;
    submitButton.textContent = isRegistering
        ? 'Creating account...'
        : 'Signing in...';

    try {
        const endpoint = isRegistering
            ? '/api/auth/register'
            : '/api/auth/login';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong. Please try again.');
        }

        if (!isRegistering &&
            (!result.user || !['student', 'instructor'].includes(result.user.role))) {
            throw new Error('Your account response was incomplete. Please try signing in again.');
        }

        if (isRegistering) {
            authForm.reset();
            setMode(false);

            formMessage.textContent =
                'Your account has been created. Please sign in.';
            formMessage.classList.add('success');
            return;
        }

        formMessage.textContent = 'Sign-in successful. Redirecting...';
        formMessage.classList.add('success');

        const destination = result.user.role === 'instructor'
            ? '/instructor.html'
            : '/courses.html';

        window.location.assign(destination);
    } catch (error) {
        formMessage.textContent = error.message;
        formMessage.classList.add('error');
    } finally {
        submitButton.disabled = false;
        loginTab.disabled = false;
        registerTab.disabled = false;

        submitButton.innerHTML = isRegistering
            ? 'Create account <span aria-hidden="true">→</span>'
            : 'Sign in <span aria-hidden="true">→</span>';
    }
});
