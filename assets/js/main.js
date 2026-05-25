/* -------------------------------------------
   ---------- SmartRisk - Shared JS ----------
   ------------------------------------------- */

// ---------- ACTIVE NAV ---------- //
function setActiveNav() {
    // Get the current URL path
    const parts = window.location.pathname.split('/').filter(Boolean);
    const currentLocation = parts[parts.length - 1] || '';

    // Highlights nav links based on currentLocation
    const menuLinks = document.querySelectorAll('.nav-links a');
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        const linkPage = href.split('/').filter(Boolean).pop() || '';
        // currentLocation is '' on homepage
        // won't match any nav link, so IntersectionObserver handles it
        if (linkPage && linkPage === currentLocation) {
            link.classList.add('active');
        }
    });

    // Highlights nav links on scroll based on visible section
    const navLinks = [...document.querySelectorAll('.nav-links a')];
    const sections = [...document.querySelectorAll('main section[id]')];

    if (sections.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(a => a.classList.remove('active'));
                    // match by anchor (#services) or by page name (about -> #about)
                    const match = navLinks.find(a => {
                        const href = a.getAttribute('href');
                        return href === '#' + entry.target.id ||
                            href.replace(/\/$/, '').split('/').pop() === entry.target.id;
                    });
                    if (match) match.classList.add('active');
                }
            });
        }, { threshold: 0.2 });

        sections.forEach(s => sectionObserver.observe(s));
    }

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