if (window.location.pathname.includes('/en/')) {
    const base = '/smartrisk/en/'

    document.getElementById('404-title').textContent = "Page Not Found | SmartRisk";
    document.getElementById('404-message-h1').innerHTML = "Page <em>not found.</em>";
    document.getElementById('404-message-text').innerHTML = "The page you're looking for doesn't exist or has been moved. Let's get you back on track.";
    document.getElementById('404-btn-home').textContent = "Back to Home";
    document.getElementById('404-btn-home').href = base;
    document.getElementById('404-btn-contact').textContent = "Contact Us";
    document.getElementById('404-btn-contact').href = base + "contact";
}