const email = document.querySelector("input#email");
const password = document.querySelector("input#password");
const passwordView = document.querySelector("#section_2 > form > #password_container > img");
const error = document.querySelector("#section_2 > form > #error");
const resetPasswordButton = document.querySelector("#section_2 > form > #reset_password");

async function resetPassword() {
  if (!validatePassword(password.value)) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const token = urlParams.get("token");

  const response = await fetch("./reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, token, password: password.value }),
  });

  if (response.ok) {
    document.getElementById("transition").classList.remove("hide");
    setTimeout(() => {
      window.location = "./dashboard";
    }, 400);
  }
}

passwordView.addEventListener("click", () => {
  if (passwordView.classList.contains("hidden")) {
    passwordView.src = "assets/icons/eye-hide.png";
    passwordView.classList.remove("hidden");
    password.setAttribute("type", "text");
  } else {
    passwordView.src = "assets/icons/eye.png";
    passwordView.classList.add("hidden");
    password.setAttribute("type", "password");
  }
});

function validatePassword(pwd) {
  if (pwd.length == 0) {
    error.innerHTML = "&nbsp;";
    password.classList.remove("invalid");
    resetPasswordButton.disabled = true;
    return false;
  }

  if (pwd.length <= 5 || pwd.length >= 30) {
    error.innerHTML = "Password must be between 5 and 30 characters";
    password.classList.add("invalid");
    resetPasswordButton.disabled = true;
    return false;
  } else {
    password.classList.remove("invalid");
    error.innerHTML = "&nbsp;";
    resetPasswordButton.disabled = false;
  }

  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]+$/;
  if (!passwordRegex.test(pwd)) {
    error.innerHTML = "Invalid characters in password";
    password.classList.add("invalid");
    resetPasswordButton.disabled = true;
    return false;
  } else {
    password.classList.remove("invalid");
    error.innerHTML = "&nbsp;";
    resetPasswordButton.disabled = false;
  }

  return true;
}
