/* -------------------------------------------
   ---------- SmartRisk - Shared JS ----------
   ------------------------------------------- */

// ---------- CONTACT FORM ---------- //
function setButtonState(btn, state) {
    btn.classList.remove('state-sending', 'state-success', 'state-error');
    if (state) btn.classList.add(state);
}

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

/*
// ---------- MARQUEE ---------- //
function setMarqueeWidth() {
    const track     = document.querySelector('.marquee-track');
    const firstItem = document.querySelector('.marquee-item');
    if (!track || !firstItem) return;
    track.style.setProperty('--marquee-width', `-${firstItem.offsetWidth}px`);
}

document.fonts.load('600 0.9rem "Cal Sans"').then(() => {
    setMarqueeWidth();
});
window.addEventListener('resize', setMarqueeWidth);
*/