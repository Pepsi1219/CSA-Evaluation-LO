// Copyright (c) 2025 Pongsathon. All rights reserved.
// Proprietary — see LICENSE. Do not copy, redistribute, or reverse engineer.
// ============================================================
// MAIN — entry point. Loaded as the single <script type="module">.
//   A: SW register, version stamp, no-zoom guards, theme + language.
//   B: check the frontend login gate — hasSession() → enter the app;
//      otherwise show the login card and wait for a valid code.
// The auth backend was removed; sign-in is a plain allowlist check.
// ============================================================
import { APP_VERSION } from './version.js';
import { translations } from './translations.js';
import {
    initGA4, initTheme, restoreFormState, restoreStopwatchState,
    _bumpSessionCount, drainFeedbackQueue, showOnboardingIfNeeded,
    changeLanguage, calculateAll, _flushHeavyUpdate, loadWebFonts,
    FLAG_SVG,
} from './app.js';
import { t, currentLang } from './state.js';
import { updateTutProgressBadge } from './tutorial.js';
import { hasSession, signIn, currentCode } from './auth.js';
import './wiring.js';

// ============================================================
// Phase A — always runs.
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // BASE_URL is '/' during dev/preview and '/CSA-Evaluation-LO/' on the
        // Pages build. Registering the SW at the base + '/sw.js' keeps the
        // scope aligned with the deployed subpath.
        const swUrl = (import.meta.env.BASE_URL || '/') + 'sw.js';
        navigator.serviceWorker.register(swUrl).catch(() => {});
    });
}

const _appVersionEl = document.getElementById('appVersion');
if (_appVersionEl) _appVersionEl.textContent = 'v' + APP_VERSION;

['gesturestart', 'gesturechange', 'gestureend'].forEach(evt =>
    document.addEventListener(evt, e => e.preventDefault(), { passive: false })
);

initGA4();
initTheme();
const _savedLang = (() => { try { return localStorage.getItem('csa_lang'); } catch { return null; } })();
changeLanguage(_savedLang && translations[_savedLang] ? _savedLang : 'th');

// Flush pending debounced saves before hide/unload.
window.addEventListener('pagehide', _flushHeavyUpdate);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushHeavyUpdate();
});

// ============================================================
// Login overlay wiring
// ============================================================
const loginOverlay      = document.getElementById('loginOverlay');
const loginForm         = document.getElementById('loginForm');
const loginCode         = document.getElementById('loginCode');
const loginCodeToggle   = document.getElementById('loginCodeToggle');
const loginError        = document.getElementById('loginError');
const loginSubmitBtn    = document.getElementById('loginSubmitBtn');

function showLoginOverlay() {
    document.body.classList.remove('boot-app');
    document.body.classList.add('boot-login');
    document.body.style.overflow = 'hidden';
    if (loginError) loginError.textContent = '';
}
function hideLoginOverlay() {
    document.body.classList.remove('boot-login');
    document.body.classList.add('boot-app');
    document.body.style.overflow = '';
}

// Eye-icon toggle: reveal / mask the entered code.
loginCodeToggle?.addEventListener('click', () => {
    if (!loginCode) return;
    const reveal = loginCode.type === 'password';
    loginCode.type = reveal ? 'text' : 'password';
    loginCodeToggle.setAttribute('aria-pressed', reveal ? 'true' : 'false');
});

// Compact language row inside the login card (the header is hidden behind
// the overlay). Uses FLAG_SVG so it stays in sync with the header picker.
const loginLang = document.getElementById('loginLang');
function renderLoginLang() {
    if (!loginLang) return;
    const codes = ['th', 'en', 'vn', 'la'];
    loginLang.innerHTML = codes.map(c => `
        <button type="button" class="login-lang-btn ${c === currentLang ? 'active' : ''}"
                data-lang="${c}" aria-label="${c.toUpperCase()}"
                aria-pressed="${c === currentLang}">
            ${FLAG_SVG[c]}
        </button>`).join('');
}
renderLoginLang();
loginLang?.addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    changeLanguage(btn.dataset.lang);
    renderLoginLang();
});

loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    if (!loginCode) return;
    const code = loginCode.value.trim();
    if (loginError) loginError.textContent = '';
    if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.dataset.loading = '1';
        loginSubmitBtn.textContent = t('login_signing_in');
    }
    try {
        signIn(code);
        enterApp();
    } catch (err) {
        if (loginError) loginError.textContent = t(err.tkey || 'login_err_invalid');
    } finally {
        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = false;
            delete loginSubmitBtn.dataset.loading;
            loginSubmitBtn.textContent = t('login_signin_btn');
        }
    }
});

// ============================================================
// Enter the app
// ============================================================
let _appStarted = false;
function enterApp() {
    if (_appStarted) return;
    _appStarted = true;
    hideLoginOverlay();

    // Show the employee code in the Settings → Account row.
    const accountEmail = document.getElementById('accountEmail');
    if (accountEmail) accountEmail.textContent = currentCode();

    restoreFormState();
    restoreStopwatchState();
    _bumpSessionCount();
    drainFeedbackQueue();
    showOnboardingIfNeeded();
    updateTutProgressBadge();
    calculateAll();
    _flushHeavyUpdate();
    if (document.readyState === 'complete') loadWebFonts();
    else window.addEventListener('load', loadWebFonts);
}

// ============================================================
// Boot decision
// ============================================================
if (hasSession()) enterApp();
else showLoginOverlay();
