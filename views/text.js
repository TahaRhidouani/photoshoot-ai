const scroll = new LocomotiveScroll({ el: document.querySelector("body"), smooth: true, getDirection: true, multiplier: 1, tablet: { smooth: false }, smartphone: { smooth: false } });

if (!scroll.options.isMobile && !scroll.options.isTablet) {
  styleSheet = document.createElement("style");
  styleSheet.innerText = "[data-scroll-container] {   position: fixed; }";
  document.head.appendChild(styleSheet);
}

scroll.start();

window.addEventListener("load", function () {
  scroll.update();
});
