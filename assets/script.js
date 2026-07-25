const year = document.querySelector("#year");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (year) {
  year.textContent = new Date().getFullYear();
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
});
