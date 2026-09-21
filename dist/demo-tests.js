(() => {
const demoTests = [
  {
    id: 'ote',
    badge: 'A1–B2',
    title: 'Oxford Test of English',
    description: 'Phiên bản tiêu chuẩn dành cho người học và người đi làm muốn đánh giá năng lực tiếng Anh toàn diện.',
    url: 'https://fdslive.oup.com/www.oup.com/elt/general_content/global/ote/demo-v3/'
  },
  {
    id: 'ote-advanced',
    badge: 'B2–C1',
    title: 'Oxford Test of English Advanced',
    description: 'Phiên bản nâng cao dành cho người cần chứng minh năng lực tiếng Anh ở trình độ B2 và C1.',
    url: 'https://oup-elt.assessor.rm.com/engine/index.php/lms/index'
  },
  {
    id: 'ote-for-schools',
    badge: 'A1–B2',
    title: 'Oxford Test of English for Schools',
    description: 'Phiên bản sử dụng chủ đề và bối cảnh phù hợp với học sinh, nhưng giữ nguyên cấu trúc và mức độ đánh giá.',
    url: 'https://fdslive.oup.com/www.oup.com/elt/general_content/global/ote/demo-forschools/'
  }
];

const escapeDemoHtml = value => String(value).replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const skills = ['Nói', 'Nghe', 'Đọc', 'Viết'];
const cardIcon = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h22a4 4 0 0 1 4 4v24H12a4 4 0 0 1-4-4z"/><path d="M34 18h6v20H16M15 17h12M15 23h12M15 29h8"/></svg>`;

const renderDemoCard = item => {
  const action = item.url
    ? `<a class="demo-card-action" href="${escapeDemoHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Bắt đầu trải nghiệm ${escapeDemoHtml(item.title)} trên hệ thống Oxford">Bắt đầu trải nghiệm <span aria-hidden="true">↗</span></a>`
    : `<button class="demo-card-action is-disabled" type="button" disabled aria-disabled="true" title="Liên kết demo chính thức đang được cập nhật">Liên kết đang cập nhật</button>`;

  return `<article class="demo-test-card demo-test-card-${escapeDemoHtml(item.id)}">
    <div class="demo-card-top">
      <span class="demo-card-icon">${cardIcon}</span>
      <span class="demo-card-badge">CEFR ${escapeDemoHtml(item.badge)}</span>
    </div>
    <h3>${escapeDemoHtml(item.title)}</h3>
    <p>${escapeDemoHtml(item.description)}</p>
    <div class="demo-skill-list" aria-label="Bốn kỹ năng">${skills.map(skill => `<span>${skill}</span>`).join('')}</div>
    ${action}
  </article>`;
};

const grid = document.querySelector('#demo-test-grid');
if (grid) grid.innerHTML = demoTests.map(renderDemoCard).join('');
})();
