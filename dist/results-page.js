(function () {
    'use strict';

    const tabList = document.querySelector('[role="tablist"]');
    const tabs = tabList ? Array.from(tabList.querySelectorAll('[role="tab"]')) : [];

    function activateTab(tab, moveFocus) {
        tabs.forEach((item) => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;

            const panel = document.getElementById(item.getAttribute('aria-controls'));
            if (panel) panel.hidden = !selected;
        });

        if (moveFocus) tab.focus();
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab, false));
        tab.addEventListener('keydown', (event) => {
            let nextIndex = null;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;
            if (nextIndex === null) return;
            event.preventDefault();
            activateTab(tabs[nextIndex], true);
        });
    });

    document.querySelectorAll('.rp-faq-list details').forEach((detail) => {
        const summary = detail.querySelector('summary');
        if (!summary) return;
        const syncExpanded = () => summary.setAttribute('aria-expanded', String(detail.open));
        syncExpanded();
        detail.addEventListener('toggle', syncExpanded);
    });

    const lightbox = document.getElementById('document-preview');
    const previewImage = lightbox ? lightbox.querySelector('img') : null;
    const previewTitle = lightbox ? lightbox.querySelector('h2') : null;
    const closeButton = lightbox ? lightbox.querySelector('.rp-lightbox-close') : null;
    let returnFocus = null;

    function openPreview(trigger) {
        if (!lightbox || !previewImage || !previewTitle || !closeButton) return;
        const src = trigger.dataset.docSrc;
        const alt = trigger.dataset.docAlt || 'Mẫu tài liệu Oxford Test of English';
        if (!src) return;

        returnFocus = trigger;
        previewImage.src = src;
        previewImage.alt = alt;
        previewTitle.textContent = alt;
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rp-preview-locked');
        closeButton.focus();
    }

    function closePreview() {
        if (!lightbox || !lightbox.classList.contains('is-open')) return;
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('rp-preview-locked');
        previewImage.removeAttribute('src');
        if (returnFocus) returnFocus.focus();
        returnFocus = null;
    }

    document.querySelectorAll('[data-doc-src]').forEach((trigger) => {
        trigger.addEventListener('click', () => openPreview(trigger));
    });

    if (lightbox) {
        lightbox.querySelectorAll('[data-close-preview]').forEach((control) => {
            control.addEventListener('click', closePreview);
        });

        lightbox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePreview();
            }
            if (event.key === 'Tab' && closeButton) {
                event.preventDefault();
                closeButton.focus();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePreview();
    });

    const subnavLinks = Array.from(document.querySelectorAll('.rp-subnav a[href^="#"]'));
    const observedSections = subnavLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    function setActiveSection(id) {
        subnavLinks.forEach((link) => {
            const active = link.getAttribute('href') === '#' + id;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }

    if ('IntersectionObserver' in window && observedSections.length) {
        const visible = new Map();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
                else visible.delete(entry.target.id);
            });

            const current = Array.from(visible.entries()).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
            if (current) setActiveSection(current[0]);
        }, { rootMargin: '-30% 0px -58% 0px', threshold: [0, 0.01] });

        observedSections.forEach((section) => observer.observe(section));
    }

    if (subnavLinks.length) setActiveSection('tong-quan');
})();
