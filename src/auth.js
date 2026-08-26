// Copyright (c) 2025 Pongsathon. All rights reserved.
// Proprietary — see LICENSE. Do not copy, redistribute, or reverse engineer.
// ============================================================
// AUTH — frontend-only employee-code gate. No backend.
//
// The Firebase Auth + Firestore backend was removed. Login is now a plain
// allowlist check against ALLOWED_CODES below. On success we write a marker
// to localStorage so the user isn't re-prompted on reload; sign-out clears it.
//
// NOTE ON SECURITY: this is a soft gate. Anyone with the shipped bundle can
// read the codes out of the obfuscated JS. Do not use it to protect anything
// that isn't already OK to leak. It only keeps casual users out.
// ============================================================

// Employee codes allowed to sign in. Edit this list to grant / revoke access.
export const ALLOWED_CODES = [
    '1018225',
    '1034959',
    '2508004',
    '1019283',
    '1020315',
    '1034212',
    '1035012',
    '13114',
    '13814',
    '15205',
    '2606004',
    '2506086',
];

// Session marker: written on successful sign-in, read on boot, cleared on
// sign-out. A stamped value means "let the app render"; absent = show login.
const SESSION_KEY = 'csa_login';

function _norm(code) { return String(code ?? '').trim(); }

export function hasSession() {
    try { return !!localStorage.getItem(SESSION_KEY); } catch { return false; }
}

// Return the signed-in employee code (or '' if not signed in).
export function currentCode() {
    try { return localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

// Validate a submitted code against the allowlist. Case-insensitive against
// the stored strings; leading/trailing whitespace stripped. Throws with a
// translation-key `.tkey` so the caller can render a localized message.
export function signIn(code) {
    const c = _norm(code);
    if (!c) throw Object.assign(new Error('empty'), { tkey: 'login_err_invalid' });
    const ok = ALLOWED_CODES.some(x => _norm(x).toLowerCase() === c.toLowerCase());
    if (!ok) throw Object.assign(new Error('not-allowed'), { tkey: 'login_err_invalid' });
    try { localStorage.setItem(SESSION_KEY, c); } catch {}
    return c;
}

export function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
}
