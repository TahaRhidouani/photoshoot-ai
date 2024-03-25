const scroll = new LocomotiveScroll({ el: document.querySelector("body"), smooth: true, getDirection: true, multiplier: 1, tablet: { smooth: false }, smartphone: { smooth: false } });

if (!scroll.options.isMobile && !scroll.options.isTablet) {
  styleSheet = document.createElement("style");
  styleSheet.innerText = "[data-scroll-container] {   position: fixed; }";
  document.head.appendChild(styleSheet);
}

scroll.start();

document.querySelector("nav > #menu > #overview").addEventListener("click", function () {
  scroll.scrollTo("#section_3");
});

document.querySelector("footer > #info > #links > div > #overview").addEventListener("click", function () {
  scroll.scrollTo("#section_3");
});

document.querySelector("nav > #menu > #pricing").addEventListener("click", function () {
  scroll.scrollTo("#section_4");
});

document.querySelector("footer > #info > #links > div > #pricing").addEventListener("click", function () {
  scroll.scrollTo("#section_4");
});

document.querySelector("nav > #menu > #faq").addEventListener("click", function () {
  scroll.scrollTo("#section_5");
});

document.querySelector("footer > #info > #links > div > #faq").addEventListener("click", function () {
  scroll.scrollTo("#section_5");
});

const details = document.querySelectorAll("details");
details.forEach((targetDetail) => {
  targetDetail.addEventListener("click", () => {
    details.forEach((detail) => {
      if (detail !== targetDetail) {
        detail.removeAttribute("open");
      }
    });
  });
});

scroll.on("call", (f) => {
  if (f === "fadein-text_2") {
    document.getElementById("text_2").classList.remove("hidden");
  } else if (f === "fadein-works") {
    document.querySelector("#secondary_3 > div:nth-child(1)").classList.remove("hidden");

    setTimeout(function () {
      document.querySelector("#secondary_3 > div:nth-child(2)").classList.remove("hidden");
    }, 500);

    setTimeout(function () {
      document.querySelector("#secondary_3 > div:nth-child(3)").classList.remove("hidden");
    }, 1000);
  } else if (f === "fadein-pricing") {
    document.querySelector("#section_4 > #secondary_4 > #main").classList.remove("hidden");

    setTimeout(function () {
      document.querySelector("#section_4 > #secondary_4 > #topup").classList.remove("hidden");
    }, 500);
  } else if (f === "fadein-faq") {
    const details = document.querySelectorAll("details");
    let delay = 0;

    details.forEach((targetDetail) => {
      delay += 100;
      setTimeout(function () {
        targetDetail.classList.remove("hidden");
      }, delay);
    });
  }
});

window.addEventListener("load", function () {
  scroll.update();
});
