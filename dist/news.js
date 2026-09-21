(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDate = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  const card = post => `<article class="cms-news-card">${post.featured_image ? `<a class="cms-news-image" href="/tin-tuc/${escapeHtml(post.slug)}"><img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.featured_image_alt || post.title)}" loading="lazy"></a>` : ''}<div class="cms-news-card-body"><p class="cms-news-meta"><span>${escapeHtml(post.post_categories?.name || 'Tin tức')}</span><time datetime="${escapeHtml(post.published_at)}">${formatDate(post.published_at)}</time></p><h2><a href="/tin-tuc/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''}<a class="cms-news-link" href="/tin-tuc/${escapeHtml(post.slug)}">Đọc bài viết →</a></div></article>`;
  const load = async (container, { category = '', limit = 12 } = {}) => {
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = '<p class="cms-news-state">Đang tải tin tức…</p>';
    try {
      const query = new URLSearchParams({ limit });
      if (category) query.set('category', category);
      const response = await fetch(`/api/news?${query}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Chưa thể tải tin tức.');
      container.innerHTML = result.posts?.length ? result.posts.map(card).join('') : '<p class="cms-news-state">Chưa có bài viết được xuất bản trong danh mục này.</p>';
    } catch (error) {
      container.innerHTML = `<p class="cms-news-state is-error">${escapeHtml(error.message || 'Chưa thể tải tin tức.')}</p>`;
    } finally {
      container.removeAttribute('aria-busy');
    }
  };

  document.querySelectorAll('[data-cms-news-list]').forEach(container => load(container, { category: container.dataset.category || '', limit: container.dataset.limit || 12 }));
  document.querySelectorAll('[data-news-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-news-filter]').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    const container = document.querySelector('[data-cms-news-list]');
    load(container, { category: button.dataset.newsFilter, limit: 12 });
  }));
})();
