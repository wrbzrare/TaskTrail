document.addEventListener('DOMContentLoaded', function() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const steps = document.querySelectorAll('.step');

    const emailForm = document.getElementById('emailForm');
    const codeForm = document.getElementById('codeForm');
    const passwordForm = document.getElementById('passwordForm');

    const backToLogin1 = document.getElementById('backToLogin1');
    const backToEmail = document.getElementById('backToEmail');
    const backToCode = document.getElementById('backToCode');

    const resendCode = document.getElementById('resendCode');
    const timerElement = document.getElementById('timer');

    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const savePasswordButton = document.getElementById('savePassword');
    const strengthMeter = document.getElementById('strengthMeter');
    const successMessage = document.getElementById('successMessage');

    const hiddenEmail = document.getElementById('hiddenEmail');
    
    let currentStep = 1;
    let timer = 60;
    let countdown;

    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        if (!email) return alert('Введите email');

        try {
            const res = await fetch('/api/recovery/send_code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email})
            });
            const data = await res.json();
            if (!data.success) return alert(data.message);

            hiddenEmail.value = email; // сохраняем email для следующих шагов
            navigateToStep(2);
            startTimer();
        } catch (err) {
            console.error(err);
            alert('Ошибка при отправке кода');
        }
    });

    codeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = hiddenEmail.value;
        const code = Array.from(document.querySelectorAll('.code-input')).map(i => i.value).join('');

        if (code.length !== 6) return alert('Введите 6-значный код');

        try {
            const res = await fetch('/api/recovery/verify_code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, code})
            });
            const data = await res.json();
            if (!data.success) return alert(data.message);

            navigateToStep(3);
        } catch (err) {
            console.error(err);
            alert('Ошибка проверки кода');
        }
    });

    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = hiddenEmail.value;
        const code = Array.from(document.querySelectorAll('.code-input')).map(i => i.value).join('');
        const newPassword = newPasswordInput.value;

        try {
            const res = await fetch('/api/recovery/reset_password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, code, new_password: newPassword})
            });
            const data = await res.json();
            if (!data.success) return alert(data.message);

            successMessage.style.display = 'block';
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } catch (err) {
            console.error(err);
            alert('Ошибка при сбросе пароля');
        }
    });

    resendCode.addEventListener('click', async function(e) {
        e.preventDefault();
        if (timer > 0) return;

        const email = hiddenEmail.value;
        try {
            const res = await fetch('/api/recovery/send_code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email})
            });
            const data = await res.json();
            if (!data.success) return alert(data.message);

            timer = 60;
            startTimer();
            alert('Новый код отправлен на email');
        } catch (err) {
            console.error(err);
            alert('Ошибка при повторной отправке кода');
        }
    });

    function navigateToStep(step) {
        [step1, step2, step3].forEach(s => s.classList.remove('active'));
        if (step === 1) step1.classList.add('active');
        else if (step === 2) step2.classList.add('active');
        else if (step === 3) step3.classList.add('active');

        steps.forEach((s, index) => {
            s.classList.remove('active', 'completed');
            if (index + 1 < step) s.classList.add('completed');
            else if (index + 1 === step) s.classList.add('active');
        });

        currentStep = step;
    }

    function startTimer() {
        clearInterval(countdown);
        timer = 60;
        updateTimerDisplay();

        countdown = setInterval(() => {
            timer--;
            updateTimerDisplay();
            if (timer <= 0) clearInterval(countdown);
        }, 1000);
    }

    function updateTimerDisplay() {
        timerElement.textContent = timer;
    }

    newPasswordInput.addEventListener('input', validatePassword);
    confirmPasswordInput.addEventListener('input', validatePassword);

    function validatePassword() {
        const password = newPasswordInput.value;
        const confirm = confirmPasswordInput.value;

        const hasMinLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        updateRequirement('reqLength', hasMinLength);
        updateRequirement('reqUpper', hasUpper && hasLower);
        updateRequirement('reqNumber', hasNumber);
        updateRequirement('reqSpecial', hasSpecial);

        let strength = 0;
        if (hasMinLength) strength++;
        if (hasUpper && hasLower) strength++;
        if (hasNumber) strength++;
        if (hasSpecial) strength++;

        strengthMeter.className = 'strength-meter';
        if (strength > 0) {
            if (strength <= 2) strengthMeter.classList.add('strength-weak');
            else if (strength === 3) strengthMeter.classList.add('strength-medium');
            else strengthMeter.classList.add('strength-strong');
        }

        const match = password === confirm && password.length > 0;
        savePasswordButton.disabled = !(hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && match);
    }

    function updateRequirement(id, met) {
        const el = document.getElementById(id);
        if (met) {
            el.classList.remove('unmet');
            el.classList.add('met');
            el.querySelector('i').className = 'fas fa-check-circle';
        } else {
            el.classList.remove('met');
            el.classList.add('unmet');
            el.querySelector('i').className = 'fas fa-circle';
        }
    }

    const codeInputs = document.querySelectorAll('.code-input');
    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < codeInputs.length - 1)
                codeInputs[index + 1].focus();
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0)
                codeInputs[index - 1].focus();
        });
    });

    backToLogin1.addEventListener('click', e => { e.preventDefault(); window.location.href = '/login'; });
    backToEmail.addEventListener('click', e => { e.preventDefault(); navigateToStep(1); });
    backToCode.addEventListener('click', e => { e.preventDefault(); navigateToStep(2); });
});