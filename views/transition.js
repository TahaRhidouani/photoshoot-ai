window.addEventListener("load", function () {
  document.getElementById("transition").classList.add("hide");
});

document.querySelectorAll("a").forEach((a) => {
  if (!a.classList.contains("skip_fade") && a.getAttribute("href")) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("transition").classList.remove("hide");
      setTimeout(() => {
        window.location = this.href;
      }, 400);
    });
  }
});
