/**
 * Authentication Module
 * Handles login, registration, token persistence, demo profiles, and view navigation.
 */

const Auth = {
  TOKEN_KEY: 'alphapulse_jwt_token',
  USER_KEY: 'alphapulse_user_profile',

  currentUser: null,
  token: null,

  init() {
    this.token = localStorage.getItem(this.TOKEN_KEY);
    const savedUser = localStorage.getItem(this.USER_KEY);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }

    this.bindEvents();

    // Check if session is already active
    if (this.token && this.currentUser) {
      this.showDashboard();
      this.updateUserUI(this.currentUser);
      // Validate token with backend asynchronously
      this.verifySession();
    } else {
      this.showLogin();
    }
  },

  bindEvents() {
    // Tab switching (Sign In vs Register)
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    if (tabLoginBtn && tabRegBtn) {
      tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegBtn.classList.remove('active');
        loginForm.classList.remove('view-hidden');
        regForm.classList.add('view-hidden');
        this.clearError();
      });

      tabRegBtn.addEventListener('click', () => {
        tabRegBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        regForm.classList.remove('view-hidden');
        loginForm.classList.add('view-hidden');
        this.clearError();
      });
    }

    // Toggle password visibility
    const togglePwdBtn = document.getElementById('toggle-login-pwd-btn');
    const pwdInput = document.getElementById('login-password');
    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        togglePwdBtn.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        await this.handleLogin(username, password);
      });
    }

    // Register Form Submit
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        await this.handleRegister(name, email, password);
      });
    }

    // Demo Account Buttons
    const demo1Btn = document.getElementById('demo-user-1-btn');
    const demo2Btn = document.getElementById('demo-user-2-btn');

    if (demo1Btn) {
      demo1Btn.addEventListener('click', () => {
        document.getElementById('login-username').value = 'sandeep';
        document.getElementById('login-password').value = 'password123';
        this.handleLogin('sandeep', 'password123');
      });
    }

    if (demo2Btn) {
      demo2Btn.addEventListener('click', () => {
        document.getElementById('login-username').value = 'admin';
        document.getElementById('login-password').value = 'admin123';
        this.handleLogin('admin', 'admin123');
      });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  },

  async handleLogin(username, password) {
    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying credentials...</span>';
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      this.saveSession(data.token, data.user);
      this.clearError();
      this.showDashboard();
      this.updateUserUI(data.user);

      if (window.App && typeof window.App.onLoginSuccess === 'function') {
        window.App.onLoginSuccess();
      }

      if (window.showToast) {
        window.showToast(`Welcome back, ${data.user.name}!`, 'success');
      }
    } catch (err) {
      this.showError(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Enter Terminal</span> <span>→</span>';
      }
    }
  },

  async handleRegister(name, email, password) {
    const submitBtn = document.getElementById('register-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Setting up profile...</span>';
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      this.saveSession(data.token, data.user);
      this.clearError();
      this.showDashboard();
      this.updateUserUI(data.user);

      if (window.App && typeof window.App.onLoginSuccess === 'function') {
        window.App.onLoginSuccess();
      }

      if (window.showToast) {
        window.showToast(`Account created for ${data.user.name}`, 'success');
      }
    } catch (err) {
      this.showError(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Trader Account</span> <span>→</span>';
      }
    }
  },

  async verifySession() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!response.ok) {
        this.logout(false);
      }
    } catch (e) {
      console.warn('Session verification error:', e.message);
    }
  },

  saveSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout(showNotification = true) {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.showLogin();

    if (showNotification && window.showToast) {
      window.showToast('You have been signed out safely.', 'info');
    }
  },

  showLogin() {
    document.getElementById('login-view').classList.remove('view-hidden');
    document.getElementById('dashboard-view').classList.add('view-hidden');
  },

  showDashboard() {
    document.getElementById('login-view').classList.add('view-hidden');
    document.getElementById('dashboard-view').classList.remove('view-hidden');
  },

  updateUserUI(user) {
    const avatarEl = document.getElementById('nav-user-avatar');
    const nameEl = document.getElementById('nav-user-name');
    const roleEl = document.getElementById('nav-user-role');

    if (avatarEl && user.avatar) avatarEl.src = user.avatar;
    if (nameEl) nameEl.textContent = user.name || user.username;
    if (roleEl) roleEl.textContent = user.role || 'Equity Trader';
  },

  showError(msg) {
    const errorBox = document.getElementById('auth-error-box');
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorBox && errorMsg) {
      errorMsg.textContent = msg;
      errorBox.style.display = 'flex';
    }
  },

  clearError() {
    const errorBox = document.getElementById('auth-error-box');
    if (errorBox) {
      errorBox.style.display = 'none';
    }
  }
};

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
