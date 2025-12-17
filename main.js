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

    // Typing Animation
    const typingText = document.getElementById('typing-text');
    const phrases = [
        "Full Stack Developer",
        "Laravel Expert",
        "React Native Dev",
        "Bug Fixer"
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
            typeSpeed = 50;
        } else {
            typingText.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 100;
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
                    entry.target.classList.contains('experience-timeline')) {

                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        setTimeout(() => {
                            child.classList.add('reveal');
                        }, index * 150); // 150ms delay between each item
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
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '1'; // Ensure visible for JS handling
        section.classList.add('hidden-up'); // Initial state
        revealObserver.observe(section);
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

            const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
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

    // Easter Egg
    const secretTrigger = document.getElementById('secret-trigger');
    const secretModal = document.getElementById('secret-modal');
    const closeModal = document.querySelector('.close-modal');

    if (secretTrigger) {
        secretTrigger.addEventListener('click', () => {
            secretModal.style.display = 'block';
            console.log("%c🎉 You found the secret dev mode!", "font-size: 24px; color: gold;");
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

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            const formData = new FormData(contactForm);

            btn.innerText = 'Sending...';
            btn.disabled = true;

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    btn.innerText = 'Message Sent! (to your inbox)';
                    btn.style.background = '#0aff0a';
                    contactForm.reset();

                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = '';
                        btn.disabled = false;
                    }, 3000);
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                btn.innerText = 'Error! (Check console)';
                btn.style.background = '#ff5f56';
                console.error('Form submission error:', error);

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = '';
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
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            if (navLinks.style.display === 'flex') {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '70px';
                navLinks.style.right = '0';
                navLinks.style.background = 'rgba(10, 10, 10, 0.95)';
                navLinks.style.width = '100%';
                navLinks.style.padding = '1rem';
                navLinks.style.textAlign = 'center';
            }
        });
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
                if (window.innerWidth <= 768 && navLinks.style.display === 'flex') {
                    navLinks.style.display = 'none';
                }
            }
        });
    });

    // Custom Cursor Trail
    document.addEventListener('mousemove', (e) => {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = e.pageX + 'px';
        trail.style.top = e.pageY + 'px';
        trail.style.position = 'absolute';
        trail.style.width = '5px';
        trail.style.height = '5px';
        trail.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        trail.style.borderRadius = '50%';
        setTimeout(() => {
            trail.remove();
        }, 500);
    });

    // --- Gamification Logic ---
    const interestFill = document.getElementById('interest-fill');
    const avatarMood = document.getElementById('avatar-mood');
    const speechBubble = document.getElementById('speech-bubble');
    const sunglasses = document.getElementById('sunglasses');
    const avatarWrapper = document.getElementById('avatar-wrapper');
    const avatarContainer = document.querySelector('.avatar-container');

    let lastScrollTop = 0;
    let scrollTimeout;

    // Update Interest Level & Mood on Scroll
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;

        // Update Interest Bar
        if (interestFill) {
            interestFill.style.width = scrolled + "%";
        }

        // Mood: Scrolling too fast (Mind Blown)
        const st = window.pageYOffset || document.documentElement.scrollTop;
        const speed = Math.abs(st - lastScrollTop);
        lastScrollTop = st;

        if (speed > 50) {
            setMood('🤯', "Whoa! Slow down!");
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => setMood('😐', "Keep scrolling..."), 1000);
        }
    });

    // Mood: Hovering Projects (Happy)
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', () => setMood('😄', "Ooh, shiny code!"));
        card.addEventListener('mouseleave', () => setMood('😐', ""));
    });

    // Mood: Reached Contact (Cool)
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setMood('😎', "Let's talk business.");
            }
        }, { threshold: 0.5 });
        observer.observe(contactSection);
    }

    // Helper to set mood
    function setMood(emoji, text) {
        if (avatarMood) avatarMood.textContent = emoji;
        if (speechBubble && text) {
            speechBubble.textContent = text;
            speechBubble.classList.add('visible');
            setTimeout(() => speechBubble.classList.remove('visible'), 2000);
        }
    }

    // Easter Egg: Triple Click
    let clickCount = 0;
    if (avatarWrapper) {
        avatarWrapper.addEventListener('click', () => {
            clickCount++;
            avatarContainer.classList.add('shake');
            setTimeout(() => avatarContainer.classList.remove('shake'), 500);

            if (clickCount === 3) {
                setMood('🔥', "Developer Mode Activated!");
                document.body.style.border = "5px solid var(--primary-color)";
                setTimeout(() => document.body.style.border = "none", 3000);
                clickCount = 0;
            }
        });
    }

    // Easter Egg: Konami Code
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activateKonamiMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    function activateKonamiMode() {
        if (sunglasses) sunglasses.classList.add('active');
        setMood('😎', "Cheat Code Activated!");
        document.body.style.fontFamily = "'Comic Sans MS', cursive"; // Joke font
        setTimeout(() => {
            if (sunglasses) sunglasses.classList.remove('active');
            document.body.style.fontFamily = "";
        }, 5000);
    }
});