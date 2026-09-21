const form = document.querySelector('#admin-login-form');
const message = document.querySelector('#login-message');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Đang đăng nhập…';
  message.textContent = '';
  message.className = 'form-feedback';
  try {
    const payload = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Không thể đăng nhập.');
    message.classList.add('is-success');
    message.textContent = 'Đăng nhập thành công. Đang chuyển hướng…';
    window.location.replace('/quan-tri');
  } catch (error) {
    message.classList.add('is-error');
    message.textContent = error.message || 'Email hoặc mật khẩu không chính xác.';
  } finally {
    button.disabled = false;
    button.textContent = 'Đăng nhập';
  }
});
