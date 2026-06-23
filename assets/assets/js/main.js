/* -------------------------------------------
   ---------- SmartRisk - Shared JS ----------
   ------------------------------------------- */

// ---------- ACTIVE NAV ---------- //
function setActiveNav() {
    // Get the current URL path
    const parts = window.location.pathname.split('/').filter(Boolean);
    const currentLocation = parts[parts.length - 1] || '';

    // Highlights home link when on the homepage
    // currentLocation is '' on homepage (no path segment after root)
    if (currentLocation === '') {
        const homeLink = [...document.querySelectorAll('.nav-links a')].find(a => {
            const href = a.getAttribute('href');
            try {
                const url = new URL(href);
                return url.pathname === window.location.pathname;
            } catch(e) { return false; }
        });
        if (homeLink) homeLink.classList.add('active');
    }

    // Highlights nav links based on currentLocation
    const menuLinks = document.querySelectorAll('.nav-links a');
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        const linkPage = href.split('/').filter(Boolean).pop() || '';
        if (linkPage && linkPage === currentLocation) {
            link.classList.add('active');
        }
    });

}
setActiveNav();


// ---------- SCROLL REVEAL ---------- //
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


// ---------- HAMBURGER MENU ---------- //
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
    // Flag to prevent outside-click handler firing on the same click that opens the menu
    let menuJustOpened = false;
    
    // Toggle menu open/closed on hamburger click
    hamburger.addEventListener('click', () => {
        menuJustOpened = true;
        setTimeout(() => { menuJustOpened = false; }, 10)

        const navHeight = document.querySelector('nav').offsetHeight;
        mobileMenu.style.top = navHeight + 'px';
        const open = mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', open);
        // Prevent page scrolling behind the open menu
        // document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close menu when any link inside is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
        });
    });
    
    // Close menu when clicking outside the mobile menu
    document.addEventListener('click', e => {
        if (menuJustOpened) return;
        if (
            mobileMenu.classList.contains('open') &&
            !mobileMenu.contains(e.target) &&
            !hamburger.contains(e.target)
        ) {
            closeMenu();
        }
    });

    // Close menu on Escape key and return focus to hamburger
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
            closeMenu();
            hamburger.focus();
        }
    });
}



// ---------- SIDEBAR ---------- //
// Active highlight on scroll //
(function () {
    // Works for both services and projects pages
    const sidebar = document.querySelector('.services-sidebar, .projects-sidebar');
    if (!sidebar) return;

    const links    = sidebar.querySelectorAll('.sidebar-link');
    const sections = [];

    links.forEach(link => {
        const href = link.getAttribute('href');
        const id   = href && href.startsWith('#') ? href.slice(1) : null;
        if (id) {
            const el = document.getElementById(id);
            if (el) sections.push({ el, link });
        }
    });

    if (!sections.length) return;

    const setActive = (link) => {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    };

    // IntersectionObserver: highlight the section that occupies the most viewport
    const sidebarObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const match = sections.find(s => s.el === entry.target);
                    if (match) setActive(match.link);
                }
            });
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(s => sidebarObserver.observe(s.el));
})();



// ---------- CONTACT FORM ---------- //
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Attaching submit handler if a form is on the page 
    // AJAX form submission - page doesn't reload on submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn    = form.querySelector('.btn-submit');
        const status = document.getElementById('form-status');

        btn.textContent = 'Sending...';
        btn.disabled    = true;
        setButtonState(btn, 'state-sending');

        try {
            const res = await fetch(form.action, {
                method  : 'POST',
                body    : new FormData(form),
                headers : { 'Accept': 'application/json' }
            });
            if (res.ok) {
                btn.textContent = 'Message Sent ✓';
                setButtonState(btn, 'state-success');
                if (status) 
                    status.textContent = 'Your message has been sent. We\'ll be in touch soon.';
                form.reset();
                // Reset button to default state after 5 seconds
                setTimeout(() => {
                    btn.textContent = 'Send Message';
                    setButtonState(btn, null); // null removes all state classes
                    if (status) 
                        status.textContent = '';
                    btn.disabled = false;
                }, 5000);
            } else { throw new Error(); }
        } catch {
            btn.textContent = 'Try again.';
            setButtonState(btn, 'state-error');
            if (status) 
                status.textContent = 'Something went wrong. Please try again or email us directly.';
            btn.disabled = false;
        }
    });
});




// ---------- HELPERS ---------- //
function setButtonState(btn, state) {
    btn.classList.remove('state-sending', 'state-success', 'state-error');
    if (state) btn.classList.add(state);
}

function closeMenu() {
    setTimeout(() => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        // Re-enable page scrolling
        document.body.style.overflow = '';
    }, 250);
}

/* ---------- SET --nav-h DYNAMICALLY ---------- */
function setNavHeightVar() {
    const nav = document.querySelector('nav'); // adjust selector if your nav has a specific class/id
    if (nav) {
        document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
    }
}
setNavHeightVar();
window.addEventListener('resize', setNavHeightVar);
window.addEventListener('load', setNavHeightVar);