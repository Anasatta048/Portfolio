document.addEventListener('DOMContentLoaded', () => {

    // Console Log Jokes
    console.log("%c👋 Hey developer, nice inspecting!", "color: #00f3ff; font-size: 20px; font-weight: bold; background: #000; padding: 10px; border-radius: 5px;");
    console.log("%c🚀 Hire me before someone else does!", "color: #bc13fe; font-size: 16px; font-weight: bold;");
    console.log("%c🐛 Found a bug? No you didn't. It's an undocumented feature.", "color: #0aff0a; font-style: italic;");

    // Scroll Progress Bar
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + "%";
    });

    // --- Construction Metaphor: Hero Scaffolding ---
    function createScaffold() {
        const scaffoldContainer = document.getElementById('hero-scaffold');
        if (!scaffoldContainer) return;

        const count = 12;
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.className = 'scaffold-line';
            line.style.position = 'absolute';
            line.style.background = 'var(--primary-color)';
            line.style.opacity = '0.2';

            if (i % 2 === 0) {
                // Horizontal lines
                line.style.width = '100%';
                line.style.height = '1px';
                line.style.left = '0';
                line.style.top = `${(i / count) * 100}%`;
            } else {
                // Vertical lines
                line.style.width = '1px';
                line.style.height = '100%';
                line.style.top = '0';
                line.style.left = `${((i - 1) / count) * 100}%`;
            }
            scaffoldContainer.appendChild(line);
        }
    }
    createScaffold();

    // --- Typing & Assembly Animation ---
    const typingText = document.getElementById('typing-text');
    const phrases = [
        "DEPLOYING_BRILLIANCE.sh",
        "OPTIMIZING_REALITY.exe",
        "REFACTORING_THE_FUTURE.js",
        "COMPILED_WITH_PASSION.log"
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        if (!typingText) return;
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typingText.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 40;
        } else {
            typingText.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 80;
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(type, typeSpeed);
    }
    type();

    // Enhanced Scroll Animations (Staggered Reveal)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
                entry.target.classList.add('visible'); // For section titles

                // Stagger children if it's a grid or list
                if (entry.target.classList.contains('projects-grid') ||
                    entry.target.classList.contains('skills-grid') ||
                    entry.target.classList.contains('experience-timeline') ||
                    entry.target.classList.contains('about-grid')) {

                    const children = entry.target.querySelectorAll('.skill-card, .project-card, .timeline-item, .about-text-panel, .foundation-texture, .foundation-frame');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.classList.add('reveal');
                        }, index * 150);
                    });
                }
            }
        });
    }, observerOptions);

    // Observe Sections and Grids
    document.querySelectorAll('.section-title').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.projects-grid').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.skills-grid').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.experience-timeline').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.about-grid').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '1';
        revealObserver.observe(section);
    });

    // --- Developer Peeks Logic ---
    function initDevPeek() {
        const devPeek = document.getElementById('dev-peek');
        if (!devPeek) return;

        setInterval(() => {
            const shouldPeek = Math.random() > 0.7;
            if (shouldPeek) {
                devPeek.classList.add('active');
                setTimeout(() => {
                    devPeek.classList.remove('active');
                }, 2000);
            }
        }, 5000);

        devPeek.addEventListener('mouseenter', () => {
            devPeek.classList.add('active');
            setMood('😲', "Busted! Back to work...");
        });
    }
    initDevPeek();

    // --- Compilation Log Logic ---
    const logText = document.getElementById('log-text');
    const skillLogs = [
        "FETCHING_UX_PLANS...",
        "INJECTING_CSS3_RESIN...",
        "FLUSHING_BACKEND_PIPES...",
        "GREASING_API_ELEVATORS...",
        "SYSTEM_STABLE: READY_FOR_DEPLOY"
    ];

    window.addEventListener('scroll', () => {
        const skillsSection = document.getElementById('skills');
        if (!skillsSection || !logText) return;

        const rect = skillsSection.getBoundingClientRect();
        const viewHeight = window.innerHeight;

        if (rect.top < viewHeight && rect.bottom > 0) {
            const progress = (viewHeight - rect.top) / (viewHeight + rect.height);
            const logIndex = Math.floor(progress * skillLogs.length);
            if (skillLogs[logIndex]) {
                logText.textContent = skillLogs[logIndex];
            }
        }
    });

    // 3D Tilt Effect for Cards (Vanilla JS)
    const cards = document.querySelectorAll('.project-card, .skill-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Reduced tilt for room/scaffold feel
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // Magnetic Buttons
    const buttons = document.querySelectorAll('.cta-button, .project-link, .submit-btn');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const moveX = (x - centerX) * 0.3;
            const moveY = (y - centerY) * 0.3;

            btn.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });

    // Background Particles
    function createParticles() {
        const hero = document.querySelector('.hero-section');
        if (!hero) return;

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * 5 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;

            const duration = Math.random() * 20 + 10;
            particle.style.animation = `float ${duration}s infinite linear`;
            particle.style.opacity = Math.random() * 0.5;

            hero.appendChild(particle);
        }
    }
    createParticles();

    // --- System HUD Logic ---
    const hudStatus = document.getElementById('hud-status');
    const hudMsg = document.getElementById('hud-msg');

    const statusMapping = {
        'hero': 'STATUS: INITIATING_BUILD',
        'about': 'STATUS: ANALYZING_FOUNDATION',
        'skills': 'STATUS: VERIFYING_STRUCTURE',
        'projects': 'STATUS: INSPECTING_UNITS',
        'experience': 'STATUS: REVIEWING_BLUEPRINTS',
        'contact': 'STATUS: ACCESSING_CONTROL'
    };

    const systemMessages = [
        "COMPILED_WITH_PASSION...",
        "BUG_FREE_OPTIMISM_LOADED...",
        "CAFFEINE_LEVELS_CRITICAL...",
        "REFACTORING_PERSONALITY...",
        "STACK_TRACE_CLEAN..."
    ];

    window.addEventListener('scroll', () => {
        let currentSection = 'hero';
        document.querySelectorAll('section').forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight / 2) {
                currentSection = section.id;
            }
        });

        if (hudStatus) hudStatus.textContent = statusMapping[currentSection] || 'STATUS: ONLINE';

        // Random messages
        if (hudMsg && Math.random() > 0.995) {
            hudMsg.textContent = systemMessages[Math.floor(Math.random() * systemMessages.length)];
        }
    });

    // Helper to set mood (Used by Peeking Dev)
    function setMood(emoji, text) {
        if (hudMsg) {
            hudMsg.textContent = `DEV_SAYS: ${text.toUpperCase()}`;
            setTimeout(() => {
                const currentStatus = statusMapping[document.querySelector('section:hover')?.id || 'hero'] || 'ONLINE';
                hudMsg.textContent = "COMPILING_PERSONALITY...";
            }, 3000);
        }
    }

    // Contact Form Terminal Style
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerHTML;
            const formData = new FormData(contactForm);

            btn.innerHTML = '<span class="btn-prefix">></span> TRANSMITTING_SIGNAL...';
            btn.disabled = true;

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST', body: formData, headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    btn.innerHTML = '<span class="btn-prefix">></span> SIGNAL_RECEIVED_SUCCESS';
                    btn.style.borderColor = 'var(--accent-color)';
                    btn.style.color = 'var(--accent-color)';
                    contactForm.reset();
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.borderColor = '';
                        btn.style.color = '';
                        btn.disabled = false;
                    }, 3000);
                } else { throw new Error(); }
            } catch (error) {
                btn.innerHTML = '<span class="btn-prefix">></span> TRANSMISSION_ERROR';
                btn.style.borderColor = '#ff5f56';
                btn.style.color = '#ff5f56';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.disabled = false;
                }, 3000);
            }
        });
    }

    // Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const isOpen = navLinks.style.display === 'flex';
            navLinks.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '60px';
                navLinks.style.right = '0';
                navLinks.style.background = 'rgba(10, 10, 10, 0.95)';
                navLinks.style.width = '100%';
                navLinks.style.padding = '2rem';
                navLinks.style.textAlign = 'center';
            }
        });
    }

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                if (window.innerWidth <= 768 && navLinks && navLinks.style.display === 'flex') {
                    navLinks.style.display = 'none';
                }
            }
        });
    });

    // Custom Cursor Trail (Construction version)
    document.addEventListener('mousemove', (e) => {
        if (Math.random() > 0.8) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.left = e.pageX + 'px';
            trail.style.top = e.pageY + 'px';
            trail.style.position = 'absolute';
            trail.style.width = '2px';
            trail.style.height = '2px';
            trail.style.background = 'var(--primary-color)';
            trail.style.pointerEvents = 'none';
            document.body.appendChild(trail);
            setTimeout(() => trail.remove(), 500);
        }
    });

    // Easter Eggs
    const secretTrigger = document.getElementById('secret-trigger');
    const secretModal = document.getElementById('secret-modal');
    const closeModal = document.querySelector('.close-modal');

    if (secretTrigger) {
        secretTrigger.addEventListener('click', () => {
            secretModal.style.display = 'block';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            secretModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === secretModal) {
            secretModal.style.display = 'none';
        }
    });

    // Logo Triple Click
    let clickCount = 0;
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 3) {
                setMood('🔥', "REVENGE_OF_THE_ARCHITECT!");
                document.body.style.filter = "invert(1)";
                setTimeout(() => document.body.style.filter = "none", 3000);
                clickCount = 0;
            }
        });
    }
});