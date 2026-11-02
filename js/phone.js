// Scales each .phone-fit frame so the full 414×868 phone fits the viewport
// (body data-phones = phones per row, data-reserve = px kept free for labels)
(() => {
  const PHONE_W = 414;
  const PHONE_H = 868;
  const frames = [...document.querySelectorAll('.phone-fit')];

  const fit = () => {
    const perRow = Number(document.body.dataset.phones || 1);
    const maxH = (window.innerHeight - Number(document.body.dataset.reserve || 64)) / PHONE_H;
    const maxW = (Math.min(window.innerWidth, 1200) - 48 - (perRow - 1) * 40) / perRow / PHONE_W;
    const s = Math.min(1, maxH, maxW);
    frames.forEach((f) => {
      f.style.width = `${PHONE_W * s}px`;
      f.style.height = `${PHONE_H * s}px`;
      f.querySelector('.phone').style.setProperty('--s', s);
    });
  };
  window.addEventListener('resize', fit);
  fit();
})();
