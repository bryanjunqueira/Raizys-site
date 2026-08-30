document.addEventListener('DOMContentLoaded', () => {
    // Header Scroll Effect (Full width at top -> Floating pill card on scroll)
    const headerWrapper = document.querySelector('.rz-header-wrapper');
    const header = document.querySelector('.rz-header');

    if (headerWrapper || header) {
        window.addEventListener('scroll', () => {
            const scrollPos = window.pageYOffset;
            if (scrollPos > 15) {
                if (headerWrapper) headerWrapper.classList.add('rz-header-wrapper--scrolled');
                if (header) header.classList.add('rz-header--scrolled');
            } else {
                if (headerWrapper) headerWrapper.classList.remove('rz-header-wrapper--scrolled');
                if (header) header.classList.remove('rz-header--scrolled');
            }
        }, { passive: true });
    }

    // Mega Menu Dropdowns (Solutions & Partners)
    const megaOverlay = document.querySelector('.rz-mega-overlay');

    function setupHeaderDropdown(triggerSelector, menuSelector) {
        const trigger = document.querySelector(triggerSelector);
        const menu = document.querySelector(menuSelector);
        if (!trigger || !menu) return;
        let timeout = null;

        function openDropdown() {
            clearTimeout(timeout);
            // Close other open mega menus first
            document.querySelectorAll('.rz-solutions-mega, .rz-partners-mega').forEach(m => {
                if (m !== menu) m.classList.remove('is-open');
            });
            document.querySelectorAll('.rz-nav-solutions-trigger, .rz-nav-partners-trigger').forEach(t => {
                if (t !== trigger) t.classList.remove('is-open');
            });

            menu.classList.add('is-open');
            trigger.classList.add('is-open');
            if (megaOverlay) megaOverlay.classList.add('is-visible');
        }

        function closeDropdown() {
            timeout = setTimeout(() => {
                menu.classList.remove('is-open');
                trigger.classList.remove('is-open');
                const anyOpen = document.querySelector('.rz-solutions-mega.is-open, .rz-partners-mega.is-open');
                if (!anyOpen && megaOverlay) megaOverlay.classList.remove('is-visible');
            }, 150);
        }

        trigger.addEventListener('mouseenter', openDropdown);
        trigger.addEventListener('mouseleave', closeDropdown);
        menu.addEventListener('mouseenter', () => clearTimeout(timeout));
        menu.addEventListener('mouseleave', closeDropdown);

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (menu.classList.contains('is-open')) {
                menu.classList.remove('is-open');
                trigger.classList.remove('is-open');
                const anyOpen = document.querySelector('.rz-solutions-mega.is-open, .rz-partners-mega.is-open');
                if (!anyOpen && megaOverlay) megaOverlay.classList.remove('is-visible');
            } else {
                openDropdown();
            }
        });
    }

    setupHeaderDropdown('.rz-nav-solutions-trigger', '.rz-solutions-mega');
    setupHeaderDropdown('.rz-nav-partners-trigger', '.rz-partners-mega');

    if (megaOverlay) {
        megaOverlay.addEventListener('click', () => {
            document.querySelectorAll('.rz-solutions-mega, .rz-partners-mega').forEach(m => m.classList.remove('is-open'));
            document.querySelectorAll('.rz-nav-solutions-trigger, .rz-nav-partners-trigger').forEach(t => t.classList.remove('is-open'));
            megaOverlay.classList.remove('is-visible');
        });
    }

    // Mobile Drawer Logic
    const mobileToggle = document.querySelector('.rz-mobile-toggle');
    const mobileDrawer = document.querySelector('.rz-mobile-drawer');
    const mobileOverlay = document.querySelector('.rz-mobile-overlay');
    const drawerCloseBtn = document.querySelector('.rz-drawer-close');

    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener('click', closeMobileMenu);
    }

    function openMobileMenu() {
        if (!mobileToggle || !mobileDrawer || !mobileOverlay) return;
        mobileToggle.classList.add('active');
        mobileDrawer.classList.add('open');
        mobileOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        if (!mobileToggle || !mobileDrawer || !mobileOverlay) return;
        mobileToggle.classList.remove('active');
        mobileDrawer.classList.remove('open');
        mobileOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            if (mobileDrawer.classList.contains('open')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            document.querySelectorAll('.rz-solutions-mega, .rz-partners-mega').forEach(m => m.classList.remove('is-open'));
            document.querySelectorAll('.rz-nav-solutions-trigger, .rz-nav-partners-trigger').forEach(t => t.classList.remove('is-open'));
            if (megaOverlay) megaOverlay.classList.remove('is-visible');
        }
    });

    const mobileLinks = document.querySelectorAll('.rz-mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(closeMobileMenu, 150);
        });
    });

    // Highlight Active Page
    let currentPath = window.location.pathname.replace(/\/$/, '').split('/').pop().replace('.html', '');
    if (!currentPath || currentPath === 'index') {
        currentPath = 'home';
    }

    const navLinks = document.querySelectorAll('.rz-nav-link[data-page]');
    navLinks.forEach(link => {
        link.classList.remove('rz-nav-link--active');
        const pageName = link.getAttribute('data-page');
        if (pageName && currentPath === pageName) {
            link.classList.add('rz-nav-link--active');
        }
    });

    const mobileLinksList = document.querySelectorAll('.rz-mobile-link[data-page]');
    mobileLinksList.forEach(link => {
        link.classList.remove('rz-mobile-link--active');
        const pageName = link.getAttribute('data-page');
        if (pageName && currentPath === pageName) {
            link.classList.add('rz-mobile-link--active');
        }
    });

    // ============================================================
    // Home Hero Slideshow Logic with Progress Loading Animation
    // ============================================================
    (function initHomeHeroSlideshow() {
        const slides = document.querySelectorAll('.hp-hero-slide');
        const dots = document.querySelectorAll('.hp-dot');
        if (!slides.length || !dots.length) return;

        let currentSlide = 0;
        let slideInterval = null;
        const intervalTime = 5000; // 5 seconds per slide

        function goToSlide(index) {
            // Update slides
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
            // Update dots and restart progress animation
            dots.forEach((dot, i) => {
                const isActive = (i === index);
                dot.classList.toggle('active', isActive);
                const progress = dot.querySelector('.hp-dot-progress');
                if (progress) {
                    // Reset animation
                    progress.style.animation = 'none';
                    if (isActive) {
                        void progress.offsetWidth; // Force reflow to restart animation
                        progress.style.animation = `hpSlideProgress ${intervalTime}ms linear forwards`;
                    }
                }
            });
            currentSlide = index;
        }

        function nextSlide() {
            const next = (currentSlide + 1) % slides.length;
            goToSlide(next);
        }

        function startTimer() {
            stopTimer();
            slideInterval = setInterval(nextSlide, intervalTime);
        }

        function stopTimer() {
            if (slideInterval) clearInterval(slideInterval);
        }

        // Click on a dot → jump directly to that slide and restart timer
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                goToSlide(i);
                startTimer(); // Restart the auto-advance timer
            });
        });

        // Initialize: show first slide with progress animation
        goToSlide(0);
        startTimer();
    })();
});
