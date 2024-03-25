let section = 1;

let images = {};
let imagesIndex = 0;
let setupComplete = false;

let clientSecret, elements, emailAddress, price;
let loginProvider = "local";

const dropArea = document.getElementById("drop");
const imagePreview = document.getElementById("preview");
const loader = document.querySelector(".loader");
const email = document.querySelector("input#email");
const password = document.querySelector("input#password");
const passwordContainer = document.querySelector("#section_2 > form > #password_container");
const error_1 = document.querySelector("#section_1 > #error");
const error_2 = document.querySelector("#section_2 > form > #error");
const error_3 = document.querySelector("#section_3 > #error");
const passwordView = document.querySelector("#section_2 > form > #password_container > img");
const next = document.querySelector("#form > #navigation > button");
const back = document.querySelector("#navigation > p");
const preview = document.getElementById("preview");
const scrollbarThumb = document.getElementById("scrollbar-thumb");
const stripe = Stripe("pk_live_51NInfDDsTy73ksaUbnz9CGjftpfXPCIZvXBdY06Iv0R84JcO7sopX523GTpmQ3bDKwZHv0N5URLlwR4AQu31zyI300Yx7U6mZt");

dropArea.addEventListener("dragenter", preventDefaults, false);
dropArea.addEventListener("dragover", preventDefaults, false);
dropArea.addEventListener("dragleave", preventDefaults, false);
dropArea.addEventListener("drop", preventDefaults, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

dropArea.addEventListener("dragenter", highlight, false);
dropArea.addEventListener("dragover", highlight, false);

function highlight() {
  dropArea.classList.add("highlight");
}

dropArea.addEventListener("dragleave", unhighlight, false);
dropArea.addEventListener("drop", unhighlight, false);

function unhighlight() {
  dropArea.classList.remove("highlight");
}

dropArea.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  let dt = e.dataTransfer;
  let files = dt.files;

  handleFiles(files);
}

function handleFiles(files) {
  files = [...files];

  let e = false;
  files.forEach((file) => {
    if (validImage(file)) {
      addFile(file);
    } else {
      e = true;
      updateError1();
    }

    if (!e) {
      error_1.classList = "";
      updateError1();
    }
  });
}

function validImage(file) {
  const validFormats = ["image/png", "image/jpeg", "image/gif"];
  const maxSize = 30 * 1024 * 1024; // 30MB in bytes

  if (!validFormats.includes(file.type)) {
    error_1.classList.add("invalidFile");
    return false;
  }

  if (file.size > maxSize) {
    error_1.classList.add("fileTooBig");
    return false;
  }

  return true;
}

function addFile(file) {
  images[imagesIndex] = file;
  addPreview(file, imagesIndex);
  imagesIndex++;
}

function removeFile(e) {
  delete images[e.target.dataset.id];
  e.target.remove();
  previewScroll();
  updateError1();
}

function addPreview(file, id) {
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = function () {
    let container = document.createElement("div");
    container.classList.add("preview_container");
    container.dataset.id = id;
    container.addEventListener("click", removeFile);

    let img = document.createElement("img");
    img.src = reader.result;

    container.appendChild(img);
    document.getElementById("preview").appendChild(container);
    previewScroll();
  };
}

imagePreview.addEventListener("wheel", function (e) {
  if (e.deltaY > 0) {
    imagePreview.scrollLeft += 10;
    e.preventDefault();
  } else if (e.deltaY < 0) {
    imagePreview.scrollLeft -= 10;
    e.preventDefault();
  }
});

async function setup() {
  function errorScreen(err) {
    document.getElementById("section_2").classList.add("visible");
    next.disabled = false;
    next.innerHTML = "Next";
    back.classList.remove("hidden");
    error_2.innerHTML = err?.message ? err.message : "An error occured. Please try again later.";
    return false;
  }

  if (loginProvider == "local") {
    const response = await fetch("./register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (!response.ok) {
      return errorScreen();
    }
  }

  let data = new FormData();

  for (let id in images) {
    data.append("image_" + id, images[id]);
  }

  data.append("gender", document.querySelector('input[name="gender"]:checked')?.id);

  try {
    const response = await fetch("./setup", {
      method: "POST",
      cache: "no-store",
      body: data,
    });

    if (response.ok) {
      document.querySelector("#section_1 > #drop").classList.add("disabled");
      document.querySelector("#section_1 .multiselect_wrapper").classList.add("disabled");
      document.getElementById("google").classList.add("disabled");
      document.getElementById("microsoft").classList.add("disabled");
      document.getElementById("facebook").classList.add("disabled");
      email.readOnly = true;
      password.readOnly = true;
      setupComplete = true;
      emailAddress = (await response.json()).email;
      return true;
    } else if (response.status == 409) {
      document.getElementById("transition").classList.remove("hide");
      setTimeout(() => {
        window.location = "./dashboard";
      }, 400);
    } else {
      throw (new Error().message = await response.json());
    }
  } catch (err) {
    return errorScreen(err);
  }
}

preview.addEventListener("scroll", previewScroll);

function previewScroll() {
  let scrollPercentage = preview.scrollLeft / (preview.scrollWidth - preview.clientWidth) || 0;
  let thumbWidth = (preview.clientWidth / preview.scrollWidth) * 100;
  let thumbPosition = scrollPercentage * (100 - thumbWidth);

  if (thumbWidth < 100) {
    scrollbarThumb.classList.remove("hidden");
  } else {
    scrollbarThumb.classList.add("hidden");
  }

  scrollbarThumb.style.width = thumbWidth + "%";
  scrollbarThumb.style.left = thumbPosition + "%";
}

document.querySelector("#section_1 #photo_type").addEventListener("click", () => {
  document.getElementById("section_1").classList.remove("visible");
  setTimeout(() => {
    document.getElementById("section_1_alt").classList.add("visible");
  }, 400);
});

document.querySelector("#section_1_alt #photo_type_back").addEventListener("click", () => {
  document.getElementById("section_1_alt").classList.remove("visible");
  setTimeout(() => {
    document.getElementById("section_1").classList.add("visible");
  }, 400);
});

next.addEventListener("click", async () => {
  if (section == 1) {
    document.getElementById("section_1").classList.remove("visible");
    document.getElementById("section_1_alt").classList.remove("visible");
    setTimeout(() => {
      next.innerHTML = "Next";
      back.classList.remove("hidden");
      updateError2();
      document.querySelector("#progress > hr:nth-child(2)").classList.add("complete");
      document.getElementById("section_2").classList.add("visible");
    }, 400);
    section = 2;
  } else if (section == 2) {
    let loaderTimeout;

    const goToPay = () => {
      setTimeout(() => {
        next.disabled = false;
        clearTimeout(loaderTimeout);
        loader.classList.add("hidden");
        back.classList.remove("hidden");
        document.querySelector("#progress > hr:nth-child(3)").classList.add("complete");
        document.getElementById("section_3").classList.add("visible");
      }, 400);
      section = 3;
    };

    document.getElementById("section_2").classList.remove("visible");

    if (!setupComplete) {
      next.disabled = true;
      next.innerHTML = "Uploading";
      back.classList.add("hidden");
      loaderTimeout = setTimeout(() => {
        loader.classList.remove("hidden");
      }, 400);
      if (await setup()) {
        await initialize();
        goToPay();
      } else {
        clearTimeout(loaderTimeout);
        loader.classList.add("hidden");
      }
    } else {
      goToPay();
    }
  } else if (section == 3) {
    next.disabled = true;
    next.innerHTML = "Processing";

    stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: location.href.split("/").slice(0, -1).join("/") + "/payment-complete",
          receipt_email: emailAddress,
        },
      })
      .then((res) => {
        error_3.innerHTML = res.error.message;
        next.disabled = false;
        next.innerHTML = "Pay $" + price;
      });
  }
});

back.addEventListener("click", () => {
  if (section == 2) {
    document.getElementById("section_2").classList.remove("visible");
    setTimeout(() => {
      back.classList.add("hidden");
      next.innerHTML = "Next";
      next.disabled = false;
      document.querySelector("#progress > hr:nth-child(2)").classList.remove("complete");
      document.getElementById("section_1").classList.add("visible");
    }, 400);
    section = 1;
  } else if (section == 3) {
    document.getElementById("section_3").classList.remove("visible");
    setTimeout(() => {
      updateError2();
      next.innerHTML = "Next";
      document.querySelector("#progress > hr:nth-child(3)").classList.remove("complete");
      document.getElementById("section_2").classList.add("visible");
    }, 400);
    section = 2;
  }
});

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

function validateEmail(eml) {
  if (email.readOnly) {
    return true;
  }

  const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)*|\[((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|IPv6:((((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){6}|::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){5}|[0-9A-Fa-f]{0,4}::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){4}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):)?(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){3}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,2}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){2}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,3}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,4}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,5}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,6}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)|(?!IPv6:)[0-9A-Za-z-]*[0-9A-Za-z]:[!-Z^-~]+)])/;
  if (!emailRegex.test(eml)) {
    error_2.classList.add("email-1");
    updateError2();
  } else {
    error_2.classList.remove("email-1");
    updateError2();
  }

  fetch("./valid-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: eml }),
  })
    .then((response) => {
      if (!response.ok) {
        error_2.classList.add("email-2");
      } else {
        error_2.classList.remove("email-2");
      }
      updateError2();
    })
    .catch(() => {
      error_2.classList.add("email-2");
      updateError2();
    });
}

function validatePassword(pwd) {
  if (pwd.length <= 5 || pwd.length >= 30) {
    error_2.classList.add("password-1");
    updateError2();
  } else {
    error_2.classList.remove("password-1");
    updateError2();
  }

  const passwordRegex = /^[a-zA-Z0-9!\-@#$%^&*]+$/;
  if (!passwordRegex.test(pwd)) {
    error_2.classList.add("password-2");
    updateError2();
  } else {
    error_2.classList.remove("password-2");
    updateError2();
  }

  if (pwd.length == 0) {
    error_2.classList.remove("password-1");
    error_2.classList.remove("password-2");
    updateError2();
  }
}

function updateError1() {
  const imgLength = Object.keys(images).length;

  const notEnoughImages = imgLength < 5;
  const tooManyImages = imgLength > 100;
  const pickedGender = document.querySelector('input[name="gender"]:checked');

  if (error_1.classList.contains("invalidFile")) {
    error_1.innerHTML = "Invalid image format (only jpg/jpeg or png)";
  } else if (error_1.classList.contains("fileTooBig")) {
    error_1.innerHTML = "One or more image is too big (max: 30MB)";
  } else if (notEnoughImages && imgLength !== 0) {
    error_1.innerHTML = "You need at least 5 images";
  } else if (tooManyImages) {
    error_1.innerHTML = "You cannot upload more than 100 images";
  }

  if (!notEnoughImages && !tooManyImages) {
    next.disabled = false;
    error_1.innerHTML = "&nbsp;";
  } else {
    next.disabled = true;
  }

  if (!pickedGender) {
    next.disabled = true;
  }
}

function updateError2() {
  if (password.value.trim().length > 0) {
    if (error_2.classList.contains("password-2")) {
      error_2.innerHTML = "Password contains invalid characters";
      password.classList.add("invalid");
      password.classList.remove("valid");
    } else if (error_2.classList.contains("password-1")) {
      error_2.innerHTML = "Password must be between 5 and 30 characters";
      password.classList.add("invalid");
      password.classList.remove("valid");
    } else {
      password.classList.add("valid");
      password.classList.remove("invalid");
    }
  } else {
    password.classList = "";
  }

  if (email.value.trim().length > 0) {
    if (error_2.classList.contains("email-2")) {
      error_2.innerHTML = "Email already in use";
      email.classList.add("invalid");
      email.classList.remove("valid");
    } else if (error_2.classList.contains("email-1")) {
      error_2.innerHTML = "Invalid email format";
      email.classList.add("invalid");
      email.classList.remove("valid");
    } else if (!email.classList.contains("disabled")) {
      email.classList.add("valid");
      email.classList.remove("invalid");
    }
  } else if (!email.classList.contains("disabled")) {
    email.classList = "";
  }

  if ((email.classList.contains("valid") && password.classList.contains("valid")) || email.classList.contains("disabled")) {
    next.disabled = false;
  } else {
    next.disabled = true;
  }

  if (error_2.classList.length == 0 || email.classList.contains("disabled")) {
    error_2.innerHTML = "&nbsp;";
  }
}

function signIn(provider) {
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
  }

  const popup = window.open(url, title, "width=500,height=600");

  const checkPopupClosed = setInterval(() => {
    if (!popup || popup.closed || popup.closed === undefined) {
      clearInterval(checkPopupClosed);

      fetch("./authenticated").then((response) => {
        if (response.status === 200) {
          response.json().then((res) => {
            if (res.doneSetup) {
              document.getElementById("transition").classList.remove("hide");
              setTimeout(() => {
                window.location = "./dashboard";
              }, 400);
            } else {
              document.getElementById(provider).classList.add("selected");
              document.querySelectorAll("#section_2 > form > .social_signin:not(.selected)")[0].classList.add("disabled");
              document.querySelectorAll("#section_2 > form > .social_signin:not(.selected)")[1].classList.add("disabled");
              document.querySelector("#section_2 > form > #separator").classList.add("disabled");
              email.classList.add("disabled");
              passwordContainer.classList.add("disabled");
              next.disabled = false;
              error_2.innerHTML = "&nbsp;";
              loginProvider = provider;
            }
          });
        } else {
          error_2.innerHTML = "An error occured. Please try another sign in method.";
        }
      });
    }
  }, 500);
}

async function initialize() {
  const response = await fetch("./create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item: "main" }),
  });

  const res = await response.json();

  price = res.price;
  next.innerHTML = "Pay $" + price;

  const options = {
    layout: {
      type: "tabs",
    },
  };

  elements = stripe.elements({
    clientSecret: res.clientSecret,
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#a127ce",
        borderRadius: "10px",
        fontFamily: "Circular",
        fontSizeBase: window.innerWidth < 900 ? "0.8em" : "1em",
        colorBackground: "#ececec",
        colorDanger: "red",
      },
      rules: {
        ".Input:focus, .Tab:focus, .Tab--selected:focus": {
          boxShadow: "none",
        },
      },
    },
    fonts: [
      {
        family: "Circular",
        src: "url(assets/fonts/CircularStd.woff)",
      },
    ],
  });

  const paymentElement = elements.create("payment", options);
  paymentElement.mount("#payment_inputs");
}
