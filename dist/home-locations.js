if((location.pathname.split('/').pop()||'index.html')==='index.html'){
  const locations=[
    {city:'Hà Nội',address:'Số 26 Phố Đinh Núp, Phường Yên Hoà, TP. Hà Nội'},
    {city:'Huế',address:'A34 Đường số 2, Khu An Cựu City, Phường An Cựu, TP. Huế'},
    {city:'Đà Nẵng',address:'Tầng 5, số 204 Lương Nhữ Hộc, phường Cẩm Lệ, TP. Đà Nẵng'},
    {city:'TP. Hồ Chí Minh',address:'40/4 Lam Sơn, Phường Tân Sơn Hoà, TP. Hồ Chí Minh'}
  ];
  const section=document.querySelector('.locations');
  if(section)section.innerHTML=`<div class="eyebrow">TRÊN TOÀN QUỐC</div><h2>Địa điểm thi</h2><p>Khám phá các địa điểm tổ chức thi OTE tại các thành phố lớn trên toàn quốc.</p><div class="home-location-grid">${locations.map(location=>`<article class="home-location-card"><h3>${location.city}</h3><p>${location.address}</p><div class="home-location-contact"><strong>Liên hệ</strong><span>Điện thoại: 0886.681.666</span><span>Email: info@sea-edu.vn</span></div><a href="dia-diem-thi.html">Xem địa điểm →</a></article>`).join('')}</div><div class="home-location-action"><a class="secondary" href="dia-diem-thi.html">Xem tất cả địa điểm thi</a></div>`;
}
