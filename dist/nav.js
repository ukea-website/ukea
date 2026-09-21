const navigation = [
  { label: 'Trang chủ', href: 'index.html' },
  { label: 'Giới thiệu', href: 'gioi-thieu.html' },
  {
    label: 'Bài thi OTE', children: [
      { label: 'Oxford Test of English (OTE)', href: 'bai-thi-ote.html' },
      { label: 'Oxford Test of English Advanced', href: 'ote-advanced.html' },
      { label: 'So sánh các bài thi', href: 'so-sanh.html' },
      { label: 'Kết quả & Chứng chỉ', href: 'ket-qua-chung-chi.html' },
      { label: 'Bài thi mẫu', href: 'bai-thi-mau.html' }]
  },
  {
    label: 'Thông tin dự thi', wide: true, children: [
      { label: 'Cách thức đăng ký', href: 'cach-dang-ky.html' },
      { label: 'Quy định phòng thi', href: 'quy-dinh-phong-thi.html' },
      { label: 'Hướng dẫn dành cho thí sinh', href: 'quy-dinh-phong-thi.html#main' },
      { label: 'Địa điểm thi', href: 'dia-diem-thi.html' },
      { label: 'Chuyển ngày thi và hủy thi', href: 'cach-dang-ky.html#main' },
      { label: 'Phúc khảo', href: 'ket-qua-chung-chi.html#main' },
      { label: 'Hỏi đáp', href: 'dang-ky.html#main' }]
  },
  {
    label: 'Tin tức', children: [
      { label: 'Thông báo', href: 'tin-tuc.html' },
      { label: 'Hoạt động - Sự kiện', href: 'tin-tuc.html#main' }]
  }
];

const currentPage = location.pathname.split('/').pop() || 'index.html';
const hasCurrent = item => item.href?.split('#')[0] === currentPage || item.children?.some(hasCurrent);
const escapeHtml = value => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const link = item => `<a href="${item.href}"${hasCurrent(item) ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
const desktopItem = (item, index) => item.children ? `<li class="nav-item has-menu${hasCurrent(item) ? ' is-current' : ''}"><button class="nav-trigger" type="button" aria-expanded="false" aria-controls="nav-panel-${index}"><span>${escapeHtml(item.label)}</span><svg class="chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button><div class="dropdown${item.wide ? ' is-wide' : ''}" id="nav-panel-${index}" role="group"><div class="dropdown-list">${item.children.map(link).join('')}</div></div></li>` : `<li class="nav-item${hasCurrent(item) ? ' is-current' : ''}">${link(item)}</li>`;
const mobileItem = (item, index) => item.children ? `<li class="mobile-item"><div class="mobile-parent"><span>${escapeHtml(item.label)}</span><button type="button" class="mobile-toggle" aria-expanded="false" aria-controls="mobile-panel-${index}" aria-label="Mở menu ${escapeHtml(item.label)}"><span aria-hidden="true">+</span></button></div><div class="mobile-submenu" id="mobile-panel-${index}"><div>${item.children.map(link).join('')}</div></div></li>` : `<li class="mobile-item">${link(item)}</li>`;

const siteHeader = document.querySelector('#site-header');
siteHeader.innerHTML = `<a class="skip" href="#main">Bỏ qua đến nội dung</a><header class="professional-header"><div class="nav-shell"><a class="nav-brand" href="index.html" aria-label="UKEA – UK English Academy - Trang chủ"><span class="nav-brand-logo-frame"><img src="assets/ukea-logo-color.png" alt="UKEA – UK English Academy"></span></a><nav class="desktop-nav" aria-label="Điều hướng chính"><ul>${navigation.map(desktopItem).join('')}</ul></nav><a class="nav-cta" href="dia-diem-thi.html">Xem địa điểm thi</a><button class="nav-menu-button" type="button" aria-expanded="false" aria-controls="mobile-navigation" aria-label="Mở menu"><span></span><span></span><span></span></button></div></header><div class="nav-overlay" hidden></div><aside class="mobile-drawer" id="mobile-navigation" aria-label="Điều hướng di động" aria-hidden="true"><div class="mobile-drawer-head"><span>Danh mục</span><button class="drawer-close" type="button" aria-label="Đóng menu">×</button></div><nav><ul>${navigation.map(mobileItem).join('')}</ul><a class="mobile-cta" href="dang-ky.html">Đăng ký tư vấn</a></nav></aside>`;

const header = document.querySelector('.professional-header');
const navItems = [...document.querySelectorAll('.has-menu')];
let closeTimer;
const closeMenus = () => { navItems.forEach(item => { item.classList.remove('is-open'); item.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false') }) };
const openMenu = item => { clearTimeout(closeTimer); closeMenus(); item.classList.add('is-open'); item.querySelector('.nav-trigger').setAttribute('aria-expanded', 'true') };
navItems.forEach(item => { const trigger = item.querySelector('.nav-trigger'); trigger.addEventListener('click', event => { event.stopPropagation(); item.classList.contains('is-open') ? closeMenus() : openMenu(item) }); item.addEventListener('pointerenter', () => { if (matchMedia('(min-width: 992px)').matches) openMenu(item) }); item.addEventListener('pointerleave', () => { if (matchMedia('(min-width: 992px)').matches) { closeTimer = setTimeout(closeMenus, 120) } }); item.addEventListener('focusin', () => openMenu(item)); item.addEventListener('focusout', event => { if (!item.contains(event.relatedTarget)) closeTimer = setTimeout(closeMenus, 120) }) });
document.addEventListener('click', event => { if (!event.target.closest('.desktop-nav')) closeMenus() });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenus(); closeDrawer(); document.querySelector('.nav-menu-button').focus() } });

const drawer = document.querySelector('.mobile-drawer'), overlay = document.querySelector('.nav-overlay'), menuButton = document.querySelector('.nav-menu-button');
const openDrawer = () => { drawer.classList.add('is-open'); overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('is-visible')); drawer.setAttribute('aria-hidden', 'false'); menuButton.setAttribute('aria-expanded', 'true'); document.body.classList.add('nav-locked'); drawer.querySelector('.drawer-close').focus() };
function closeDrawer() { drawer.classList.remove('is-open'); overlay.classList.remove('is-visible'); drawer.setAttribute('aria-hidden', 'true'); menuButton.setAttribute('aria-expanded', 'false'); document.body.classList.remove('nav-locked'); setTimeout(() => { if (!drawer.classList.contains('is-open')) overlay.hidden = true }, 220) }
menuButton.addEventListener('click', () => drawer.classList.contains('is-open') ? closeDrawer() : openDrawer());
document.querySelector('.drawer-close').addEventListener('click', closeDrawer); overlay.addEventListener('click', closeDrawer);
document.querySelectorAll('.mobile-toggle').forEach(button => button.addEventListener('click', () => { const panel = document.getElementById(button.getAttribute('aria-controls')); const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); panel.classList.toggle('is-open', !expanded); button.querySelector('span').textContent = expanded ? '+' : '−' }));
addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
