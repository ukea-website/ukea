const notice=document.querySelector('.notice'), close=document.querySelector('.notice button'), menu=document.querySelector('.menu'), links=document.querySelector('.links'), topButton=document.querySelector('.top'), form=document.querySelector('form');
close.addEventListener('click',()=>notice.remove());
menu.addEventListener('click',()=>{const open=links.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
document.querySelectorAll('.links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
window.addEventListener('scroll',()=>topButton.classList.toggle('show',scrollY>500));topButton.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
form.addEventListener('submit',e=>{e.preventDefault();form.querySelector('.form-message').textContent='Đã gửi — cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.';form.reset()});
