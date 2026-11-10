// Hide the page transition once everything has loaded, but no later than 1 s after the DOM is ready
function hideTransition() {
  document.getElementById("transition").classList.add("hide");
}
window.addEventListener("load", hideTransition);
document.addEventListener("DOMContentLoaded", () => setTimeout(hideTransition, 1000));

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
