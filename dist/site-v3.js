const nav3 = [
  ['index.html', 'Trang chủ'],
  ['bai-thi-ote.html', 'Bài thi OTE'],
  ['ote-advanced.html', 'OTE Advanced'],
  ['so-sanh.html', 'So sánh'],
  ['cach-dang-ky.html', 'Thông tin dự thi'],
  ['dia-diem-thi.html', 'Địa điểm thi'],
  ['tin-tuc.html', 'Tin tức'],
  ['dang-ky.html', 'Đăng ký tư vấn']
];

const pageName = location.pathname.split('/').pop() || 'index.html';
const fallbackHeader = document.querySelector('#site-header');
const siteFooter = document.querySelector('#site-footer');

fallbackHeader.innerHTML = `<a class="skip" href="#main">Bỏ qua đến nội dung</a><header class="site-header"><div class="notice"><div><strong>UKEA – UK English Academy</strong><span>Thông tin và tư vấn bài thi Oxford Test of English.</span></div><a href="dang-ky.html">Đăng ký tư vấn →</a></div><div class="contact"><a href="tel:0876767396">Hotline: 0876 767 396</a><a href="mailto:contact@ukea.edu.vn">Email: contact@ukea.edu.vn</a></div><nav class="nav" aria-label="Điều hướng chính"><a class="brand brand-with-logo" href="index.html"><img src="assets/ukea-logo-color.png" alt="UKEA – UK English Academy" width="1774" height="887"></a><button class="menu" aria-label="Mở menu" aria-expanded="false">☰</button><div class="links">${nav3.map(([url, label]) => `<a class="${url === pageName ? 'active' : ''}" href="${url}">${label}</a>`).join('')}</div><div class="actions"><a class="primary small" href="dang-ky.html">Đăng ký tư vấn</a></div></nav></header>`;

siteFooter.innerHTML = `<footer><div class="footer-grid ukea-footer-grid"><div class="ukea-footer-brand"><a class="ukea-footer-logo" href="index.html" aria-label="UKEA – UK English Academy - Trang chủ"><span><img src="assets/ukea-logo-white.png" alt="UKEA – UK English Academy" width="1774" height="887"></span></a><p>Thông tin về Oxford Test of English và đăng ký tư vấn cùng UKEA – UK English Academy.</p><div class="ukea-footer-contact"><a href="tel:0876767396"><strong>Hotline:</strong> 0876 767 396</a><a href="mailto:contact@ukea.edu.vn"><strong>Email:</strong> contact@ukea.edu.vn</a><p><strong>Địa chỉ:</strong> Tòa A3, 234 Đ. Phạm Văn Đồng, Khu chung cư Green Stars, Phú Diễn, Hà Nội, Việt Nam.</p></div></div><div><h4>KHÁM PHÁ</h4><a href="gioi-thieu.html">Giới thiệu</a><a href="bai-thi-ote.html">Bài thi OTE</a><a href="ote-advanced.html">OTE Advanced</a><a href="so-sanh.html">So sánh các bài thi</a><a href="ket-qua-chung-chi.html">Kết quả &amp; Chứng chỉ</a><a href="bai-thi-mau.html">Bài thi mẫu</a></div><div><h4>HỖ TRỢ</h4><a href="tin-tuc.html">Tin tức</a><a href="cach-dang-ky.html">Cách thức đăng ký</a><a href="quy-dinh-phong-thi.html">Quy định phòng thi</a><a href="dia-diem-thi.html">Địa điểm thi</a><a href="dang-ky.html#main">Hỏi đáp</a><a href="dang-ky.html">Đăng ký tư vấn</a></div></div><div class="copyright">© 2026 UKEA – UK English Academy. Thông tin được dùng cho mục đích giới thiệu và tư vấn bài thi OTE.</div></footer><button class="top" aria-label="Lên đầu trang">↑</button>`;

const menu = document.querySelector('.menu');
const links = document.querySelector('.links');
if (menu && links) {
  menu.onclick = () => {
    const expanded = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', expanded);
  };
}

const pageTopButton = document.querySelector('.top');
addEventListener('scroll', () => pageTopButton.classList.toggle('show', scrollY > 400));
pageTopButton.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });

document.querySelectorAll('a[href^="http"]').forEach(anchor => anchor.replaceWith(document.createTextNode(anchor.textContent)));

if (pageName === 'index.html') {
  document.querySelector('.recognition')?.insertAdjacentHTML('afterend', `<section class="home-news"><div class="section home-news-inner"><header class="home-news-header"><div class="eyebrow">CẬP NHẬT</div><h2>Tin tức &amp; thông báo</h2><p>Các nội dung đáng chú ý để bạn chuẩn bị cho kỳ thi OTE.</p></header><div class="news-grid"><article><time>Thông tin dự thi</time><h3>Chọn bài thi phù hợp với mục tiêu của bạn</h3><p>So sánh OTE và OTE Advanced theo cấp độ CEFR, thời lượng và đối tượng phù hợp.</p><a href="so-sanh.html"><span>Xem so sánh</span><span aria-hidden="true">→</span></a></article><article><time>Chuẩn bị kỳ thi</time><h3>Những điều cần chuẩn bị trước ngày thi</h3><p>Xem giấy tờ cần mang theo, thời gian có mặt và các quy định trong phòng thi.</p><a href="quy-dinh-phong-thi.html"><span>Xem quy định</span><span aria-hidden="true">→</span></a></article><article><time>Tư vấn</time><h3>Đăng ký nhận tư vấn về OTE</h3><p>Để lại nhu cầu để UKEA hỗ trợ chọn bài thi và định hướng chuẩn bị phù hợp.</p><a href="dang-ky.html"><span>Đăng ký tư vấn</span><span aria-hidden="true">→</span></a></article></div><div class="home-news-all-wrap"><a class="home-news-all" href="tin-tuc.html"><span>Xem tất cả tin tức</span><span aria-hidden="true">→</span></a></div></div></section>`);
}
