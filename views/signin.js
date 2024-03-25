const email = document.querySelector("input#email");
const emailForgot = document.querySelector("input#email_forgot");
const password = document.querySelector("input#password");
const passwordView = document.querySelector("#section_2 > form > #password_container > img");
const error = document.querySelector("#section_2 > form > #error");
const errorForgot = document.querySelector("#section_2_alt > form > #error");
const signin = document.querySelector("#signin");
const forgotPasswordButton = document.getElementById("forgot_password");
const resetPasswordButton = document.getElementById("reset_password");

let section = 1;

async function signIn(provider) {
  let url, title;

  if (provider == "google") {
    url = "./auth/google";
    title = "Google Sign In";
  } else if (provider == "microsoft") {
    url = "./auth/microsoft";
    title = "Microsoft Sign In";
  } else if (provider == "facebook") {
    url = "./auth/facebook";
    title = "Facebook Sign In";
  } else if (provider == "local") {
    email.classList.remove("invalid");
    password.classList.remove("invalid");
    error.innerHTML = "&nbsp;";

    if (!email.value || !password.value) {
      if (!email.value) email.classList.add("invalid");
      if (!password.value) password.classList.add("invalid");
      error.innerHTML = "Empty fields";
      return;
    }

    const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)*|\[((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|IPv6:((((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){6}|::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){5}|[0-9A-Fa-f]{0,4}::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){4}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):)?(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){3}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,2}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){2}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,3}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,4}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,5}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,6}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)|(?!IPv6:)[0-9A-Za-z-]*[0-9A-Za-z]:[!-Z^-~]+)])/;
    if (!emailRegex.test(email.value)) {
      email.classList.add("invalid");
      error.innerHTML = "Invalid email";
      return;
    }

    const response = await fetch("./signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (response.ok) {
      document.getElementById("transition").classList.remove("hide");
      setTimeout(() => {
        window.location = "./setup";
      }, 400);
    } else if (response.status == 401) {
      email.classList.add("invalid");
      password.classList.add("invalid");
      error.innerHTML = "Incorrect credentials";
    } else {
      error.innerHTML = "An error occured";
    }

    return;
  }

  const popup = window.open(url, title, "width=500,height=600");

  const checkPopupClosed = setInterval(() => {
    if (!popup || popup.closed || popup.closed === undefined) {
      clearInterval(checkPopupClosed);

      fetch("./authenticated").then((response) => {
        if (response.status === 200) {
          response.json().then((res) => {
            document.getElementById("transition").classList.remove("hide");
            setTimeout(() => {
              if (res.doneSetup) {
                window.location = "./dashboard";
              } else {
                window.location = "./setup";
              }
            }, 400);
          });
        } else {
          error_2.innerHTML = "An error occured. Please try another sign in method.";
        }
      });
    }
  }, 500);
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

function switchMenu() {
  if (section == 1) {
    document.getElementById("section_2").classList.remove("visible");
    signin.disabled = true;
    setTimeout(() => {
      document.getElementById("section_2_alt").classList.add("visible");
      forgotPasswordButton.innerHTML = "Go back";
      section = 2;
    }, 400);
  } else {
    document.getElementById("section_2_alt").classList.remove("visible");
    setTimeout(() => {
      document.getElementById("section_2").classList.add("visible");
      signin.disabled = false;
      forgotPasswordButton.innerHTML = "Forgot password?";
      section = 1;
    }, 400);
  }
}

async function resetPassword() {
  emailForgot.classList.remove("invalid");
  errorForgot.innerHTML = "&nbsp;";
  resetPasswordButton.disabled = true;

  if (!emailForgot.value) {
    emailForgot.classList.add("invalid");
    errorForgot.innerHTML = "Empty field";
    return;
  }

  const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)*|\[((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|IPv6:((((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){6}|::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){5}|[0-9A-Fa-f]{0,4}::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){4}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):)?(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){3}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,2}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){2}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,3}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,4}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,5}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,6}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)|(?!IPv6:)[0-9A-Za-z-]*[0-9A-Za-z]:[!-Z^-~]+)])/;
  if (!emailRegex.test(emailForgot.value)) {
    emailForgot.classList.add("invalid");
    errorForgot.innerHTML = "Invalid email";
    return;
  }

  const response = await fetch("./forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailForgot.value }),
  });

  if (response.ok) {
    document.getElementById("transition").classList.remove("hide");
    setTimeout(() => {
      window.location = "./signin";
    }, 400);
  } else if (response.status == 404) {
    resetPasswordButton.disabled = false;
    emailForgot.classList.add("invalid");
    errorForgot.innerHTML = "Email does not exist";
  } else if (response.status == 405) {
    resetPasswordButton.disabled = false;
    emailForgot.classList.add("invalid");
    errorForgot.innerHTML = "Cannot reset a social password";
  } else {
    resetPasswordButton.disabled = false;
    errorForgot.innerHTML = "An error occured";
  }
}
