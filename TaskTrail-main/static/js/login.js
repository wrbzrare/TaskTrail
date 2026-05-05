document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('error-message');

    errorBox.textContent = '';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            errorBox.textContent = data.message || 'Ошибка авторизации';
        }
    } catch (err) {
        errorBox.textContent = 'Ошибка соединения с сервером';
    }
});

document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/restore-password';
});