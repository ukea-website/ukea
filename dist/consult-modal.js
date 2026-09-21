const headerCta = document.querySelector('.nav-cta');
const mobileCta = document.querySelector('.mobile-cta');
const makeConsultButton = (className, text) => `<button class="${className}" type="button">${text}</button>`;

window.UkeaLeadApi = window.UkeaLeadApi || {
  async submit(form, message, source) {
    const submitButton = form.querySelector('[type="submit"]');
    const originalLabel = submitButton?.textContent;
    const data = new FormData(form);
    const payload = {
      fullName: data.get('fullName'),
      phone: data.get('phone'),
      email: data.get('email'),
      interest: data.get('interest'),
      consent: data.get('consent') === 'on',
      source,
      pageUrl: window.location.href,
      website: data.get('website') || '',
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Đang gửi…';
    }
    message.classList.remove('is-error', 'is-success');
    message.textContent = 'Đang gửi thông tin của bạn…';

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Chưa thể gửi đăng ký.');

      message.classList.add('is-success');
      message.textContent = 'Cảm ơn bạn! UKEA đã nhận thông tin và sẽ liên hệ sớm.';
      form.reset();
      return true;
    } catch (error) {
      message.classList.add('is-error');
      message.textContent = error.message || 'Có lỗi kết nối. Vui lòng thử lại sau.';
      return false;
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  },
};

if (headerCta) headerCta.outerHTML = makeConsultButton('nav-cta consult-trigger', 'Đăng ký tư vấn');
if (mobileCta) mobileCta.outerHTML = makeConsultButton('mobile-cta consult-trigger', 'Đăng ký tư vấn');

document.body.insertAdjacentHTML('beforeend', `
  <div class="consult-modal" id="consult-modal" role="dialog" aria-modal="true" aria-labelledby="consult-modal-title" aria-hidden="true">
    <div class="consult-modal-backdrop" data-close-consult></div>
    <section class="consult-modal-panel" role="document">
      <button class="consult-modal-close" type="button" aria-label="Đóng biểu mẫu" data-close-consult>×</button>
      <div class="consult-modal-kicker">UKEA • TƯ VẤN BÀI THI OTE</div>
      <h2 id="consult-modal-title">Đăng ký nhận tư vấn</h2>
      <p>Để lại thông tin, đội ngũ UKEA sẽ hỗ trợ bạn chọn bài thi phù hợp. Hotline: <a href="tel:0989999999">0989 999 999</a>.</p>
      <form id="consult-modal-form" class="ukea-form" novalidate>
        <div class="ukea-field">
          <input class="ukea-control" id="consult-full-name" name="fullName" autocomplete="name" placeholder=" " required aria-describedby="consult-full-name-error">
          <label for="consult-full-name">Họ và tên</label>
          <span class="ukea-field-message" id="consult-full-name-error" aria-live="polite"></span>
        </div>
        <div class="ukea-field">
          <input class="ukea-control" id="consult-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder=" " required aria-describedby="consult-phone-error">
          <label for="consult-phone">Số điện thoại</label>
          <span class="ukea-field-message" id="consult-phone-error" aria-live="polite"></span>
        </div>
        <div class="ukea-field">
          <input class="ukea-control" id="consult-email" name="email" type="email" autocomplete="email" placeholder=" " aria-describedby="consult-email-error">
          <label for="consult-email">Email (tùy chọn)</label>
          <span class="ukea-field-message" id="consult-email-error" aria-live="polite"></span>
        </div>
        <div class="ukea-field ukea-field--select">
          <select class="ukea-control" id="consult-interest" name="interest" aria-describedby="consult-interest-error">
            <option>Oxford Test of English</option>
            <option>OTE Advanced</option>
            <option>Địa điểm và lịch thi</option>
            <option>Khác</option>
          </select>
          <label for="consult-interest">Nhu cầu tư vấn</label>
          <span class="ukea-field-message" id="consult-interest-error" aria-live="polite"></span>
        </div>
        <div class="ukea-check-field">
          <label class="ukea-check" for="consult-consent">
            <input id="consult-consent" name="consent" type="checkbox" required aria-describedby="consult-consent-error">
            <span>Tôi đồng ý để UKEA liên hệ tư vấn về bài thi OTE.</span>
          </label>
          <span class="ukea-field-message" id="consult-consent-error" aria-live="polite"></span>
        </div>
        <button class="consult-submit" type="submit">Gửi đăng ký</button>
        <p class="consult-form-message" aria-live="polite"></p>
      </form>
    </section>
  </div>
`);

const validationMessage = control => {
  if (control.validity.valueMissing) {
    if (control.name === 'phone') return 'Vui lòng nhập số điện thoại.';
    if (control.name === 'fullName') return 'Vui lòng nhập họ và tên.';
    if (control.name === 'email') return 'Vui lòng nhập địa chỉ email.';
    if (control.name === 'consent') return 'Vui lòng xác nhận đồng ý trước khi gửi.';
    return 'Vui lòng hoàn thành trường này.';
  }
  if (control.validity.typeMismatch && control.type === 'email') return 'Vui lòng nhập địa chỉ email hợp lệ.';
  return control.validationMessage || 'Vui lòng kiểm tra lại thông tin này.';
};

const updateFieldState = (control, touched = false) => {
  const field = control.closest('.ukea-field, .ukea-check-field');
  if (!field) return;
  if (touched) field.classList.add('is-touched');

  const shouldValidate = field.classList.contains('is-touched');
  const invalid = shouldValidate && !control.validity.valid;
  const hasValue = control.type === 'checkbox' ? control.checked : String(control.value).trim() !== '';
  const message = field.querySelector('.ukea-field-message');

  field.classList.toggle('is-invalid', invalid);
  field.classList.toggle('is-valid', shouldValidate && !invalid && hasValue);
  if (invalid) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  if (message) message.textContent = invalid ? validationMessage(control) : '';
};

const initUkeaForm = form => {
  if (!form || form.dataset.formUiReady === 'true') return;
  form.dataset.formUiReady = 'true';
  const controls = [...form.querySelectorAll('input, textarea, select')];

  controls.forEach(control => {
    control.addEventListener('blur', () => updateFieldState(control, true));
    control.addEventListener('input', () => updateFieldState(control));
    control.addEventListener('change', () => updateFieldState(control));
  });

  form.addEventListener('invalid', event => updateFieldState(event.target, true), true);
  form.addEventListener('submit', event => {
    if (!form.noValidate || form.checkValidity()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    controls.forEach(control => updateFieldState(control, true));
    form.querySelector(':invalid')?.focus();
  }, true);
  form.addEventListener('reset', () => setTimeout(() => {
    form.querySelectorAll('.is-touched, .is-invalid, .is-valid').forEach(field => field.classList.remove('is-touched', 'is-invalid', 'is-valid'));
    controls.forEach(control => control.removeAttribute('aria-invalid'));
    form.querySelectorAll('.ukea-field-message').forEach(message => { message.textContent = ''; });
  }));
};

document.querySelectorAll('.ukea-form').forEach(initUkeaForm);

const consultModal = document.querySelector('#consult-modal');
const consultPanel = consultModal.querySelector('.consult-modal-panel');
const consultForm = consultModal.querySelector('form');
let opener;

const openConsult = event => {
  opener = event.currentTarget;
  consultModal.classList.add('is-open');
  consultModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('consult-locked');
  setTimeout(() => consultModal.querySelector('input').focus(), 20);
};

const closeConsult = () => {
  consultModal.classList.remove('is-open');
  consultModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('consult-locked');
  opener?.focus();
};

document.querySelectorAll('.consult-trigger').forEach(button => button.addEventListener('click', openConsult));
consultModal.querySelectorAll('[data-close-consult]').forEach(button => button.addEventListener('click', closeConsult));
consultModal.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    closeConsult();
  }
  if (event.key === 'Tab') {
    const focusable = [...consultPanel.querySelectorAll('button, input, select')].filter(element => !element.disabled);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

consultForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = consultForm.querySelector('.consult-form-message');
  if (!consultForm.checkValidity()) return;
  await window.UkeaLeadApi.submit(consultForm, message, 'consultation-modal');
});
