document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('diagnosticForm');
    if (!form) return;

    const steps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-btn');
    const prevBtns = document.querySelectorAll('.prev-btn');
    const progressBar = document.getElementById('progressBar');
    const successMessage = document.getElementById('successMessage');

    let currentStep = 1;
    const totalSteps = steps.length;

    function updateProgress() {
        if (!progressBar) return;
        const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = percentage + '%';
    }

    updateProgress();

    // Option card interaction enhancements
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        const input = card.querySelector('input');
        if (!input) return;

        if (input.checked) {
            card.classList.add('selected');
        }

        card.addEventListener('click', (e) => {
            if (input.type === 'radio') {
                const activeStep = card.closest('.form-step');
                if (activeStep) {
                    const groupInputs = activeStep.querySelectorAll(`input[name="${input.name}"]`);
                    groupInputs.forEach(i => {
                        const parentCard = i.closest('.option-card');
                        if (parentCard) parentCard.classList.remove('selected');
                    });
                }
                input.checked = true;
                card.classList.add('selected');
            } else if (input.type === 'checkbox') {
                // Prevent native label toggle so JS controls it exclusively
                e.preventDefault();
                input.checked = !input.checked;
                if (input.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            }
        });
    });

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                }
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateStep(currentStep)) return;

        const submitBtn = form.querySelector('.submit-btn.final');
        const originalText = submitBtn ? submitBtn.innerText : 'Enviar';
        if (submitBtn) {
            submitBtn.innerText = 'Enviando...';
            submitBtn.disabled = true;
        }

        const formData = new FormData(form);

        try {
            let response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            let result = await response.json().catch(() => ({}));

            if (!result.success || result.success === 'false') {
                // Fallback to FormSubmit if server PHP script is not available
                response = await fetch('https://formsubmit.co/ajax/diego.caselato@raizys.com.br', {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                result = await response.json().catch(() => ({}));
            }

            if (result.success === true || result.success === 'true') {
                form.style.display = 'none';
                if (progressBar && progressBar.parentElement) {
                    progressBar.parentElement.style.display = 'none';
                }
                if (successMessage) {
                    successMessage.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    let timeLeft = 10;
                    const countdownEl = document.createElement('p');
                    countdownEl.style.marginTop = '20px';
                    countdownEl.style.color = '#64748b';
                    countdownEl.innerHTML = `Você será redirecionado para a página inicial em <span id="timerText">${timeLeft}</span> segundos...`;
                    successMessage.appendChild(countdownEl);

                    const timerInterval = setInterval(() => {
                        timeLeft--;
                        const timerText = document.getElementById('timerText');
                        if (timerText) timerText.innerText = timeLeft;

                        if (timeLeft <= 0) {
                            clearInterval(timerInterval);
                            window.location.href = 'home';
                        }
                    }, 1000);
                }
            } else {
                alert(result.message || 'Ocorreu um erro ao enviar. Por favor, tente novamente ou entre em contato via WhatsApp.');
                if (submitBtn) {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ocorreu um erro ao enviar. Por favor, tente novamente ou entre em contato via WhatsApp.');
            if (submitBtn) {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    function goToStep(stepNumber) {
        steps.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === stepNumber) {
                step.classList.add('active');
            }
        });
        currentStep = stepNumber;
        updateProgress();

        // Scroll to the top of the wizard with offset for the fixed header
        const wizardContainer = document.querySelector('.diagnostic-wizard') || document.querySelector('.diagnostic-section');
        if (wizardContainer) {
            const header = document.querySelector('.rz-header-wrapper') || document.querySelector('.rz-header');
            const headerHeight = header ? header.offsetHeight : 0;
            // Add extra padding (topbar + header + breathing room)
            const offset = headerHeight + 40;
            const elementTop = wizardContainer.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
        }
    }

    function validateStep(step) {
        const activeStep = document.querySelector(`.form-step[data-step="${step}"]`);
        if (!activeStep) return true;

        const inputs = activeStep.querySelectorAll('input[required], select[required], textarea[required]');
        let valid = true;

        inputs.forEach(input => {
            if (input.type === 'radio') {
                const name = input.name;
                const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
                if (!checked) {
                    valid = false;
                    const grid = input.closest('.options-grid');
                    if (grid) highlightError(grid);
                }
            } else {
                if (!input.value.trim()) {
                    valid = false;
                    highlightError(input);
                }
            }
        });

        return valid;
    }

    function highlightError(element) {
        element.classList.add('shake-error');
        setTimeout(() => element.classList.remove('shake-error'), 500);
    }
});
