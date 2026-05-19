import 'swiper/css';
import 'swiper/css/effect-cards';
import Swiper from 'swiper';
import { EffectCards, Navigation } from 'swiper/modules';

const el = document.querySelector<HTMLElement>('.gb-swiper');
if (!el) throw new Error('GuestbookSwiper: .gb-swiper not found');

const total   = el.querySelectorAll('.swiper-slide').length;
const countEl = document.getElementById('gb-count');

function setCount(realIndex: number) {
  if (countEl) countEl.textContent = `${realIndex + 1} / ${total}`;
}

new Swiper(el, {
  modules:     [EffectCards, Navigation],
  effect:      'cards',
  grabCursor:  true,
  loop:        total > 2,
  navigation:  {
    prevEl:        '#gb-prev',
    nextEl:        '#gb-next',
    disabledClass: 'gb-nav-btn--disabled',
  },
  on: {
    init(s)        { setCount(s.realIndex); },
    slideChange(s) { setCount(s.realIndex); },
  },
});
