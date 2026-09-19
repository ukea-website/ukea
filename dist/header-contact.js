const headerBar=document.querySelector('.professional-header');
if(headerBar&&!headerBar.querySelector('.nav-contactbar'))headerBar.insertAdjacentHTML('afterbegin','<div class="nav-contactbar"><div class="nav-contact-inner"><a href="mailto:info@sea-edu.vn">Email: info@sea-edu.vn</a><span aria-hidden="true">|</span><a href="tel:0886681666">Điện thoại: 0886.681.666</a></div></div>');
