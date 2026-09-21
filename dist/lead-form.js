const leadForm = document.querySelector('#lead-form');

if (leadForm) {
  leadForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!leadForm.checkValidity()) {
      leadForm.reportValidity();
      return;
    }
    const message = leadForm.querySelector('[role="status"]');
    await window.UkeaLeadApi.submit(leadForm, message, 'consultation-page');
  });
}
