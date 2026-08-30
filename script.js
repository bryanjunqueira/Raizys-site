document.addEventListener('DOMContentLoaded', () => {
    
    const revealItems = document.querySelectorAll('.reveal-item, .pillar-card');

    const observerOptions = {
        threshold: 0.1 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
            } else {
                
                entry.target.classList.remove('reveal');
            }
        });
    }, observerOptions);

    revealItems.forEach(item => {
        observer.observe(item);
    });

    
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            
            
            question.classList.toggle('active');
            
            
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = 0;
            }
            
            
            
            
        });
    });

    
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = newsletterForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'ENVIANDO...';
            submitBtn.disabled = true;

            const formData = new FormData(newsletterForm);
            try {
                let response = await fetch('send_mail.php', {
                    method: 'POST',
                    body: formData
                });
                let result = await response.json().catch(() => ({}));
                if (!result.success || result.success === 'false') {
                    response = await fetch(newsletterForm.action || 'https://formsubmit.co/ajax/diego.caselato@raizys.com.br', {
                        method: 'POST',
                        body: formData,
                        headers: { 'Accept': 'application/json' }
                    });
                    result = await response.json().catch(() => ({}));
                }

                if (result.success === true || result.success === 'true') {
                    newsletterForm.innerHTML = '<p style="color: #4a6d3c; font-weight: bold; padding: 10px; background: rgba(74, 109, 60, 0.1); border-radius: 5px; text-align: center;">Obrigado por se inscrever! Em breve você receberá nossas novidades.</p>';
                } else {
                    alert(result.message || 'Ocorreu um erro. Por favor, tente novamente.');
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Erro de conexão. Verifique sua internet.');
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

