const stripe = Stripe("pk_live_51NInfDDsTy73ksaUbnz9CGjftpfXPCIZvXBdY06Iv0R84JcO7sopX523GTpmQ3bDKwZHv0N5URLlwR4AQu31zyI300Yx7U6mZt");
const photoshootsNumber = document.getElementById("photoshoots_number");
const payButton = document.querySelector("#section_3 > .content > #topup_payment > #pay");
const payError = document.querySelector("#section_3 > .content > #topup_payment > #payment > .error");
const gallery = document.getElementById("gallery");
const toggleLikedButton = document.getElementById("toggle_liked");
let dropArea = document.getElementById("drop");

let overlayCard, overlayImage;
let emailAddress;
let copycatImage;
let fetchImage, imageTimeout;
let copycatCustomImage = null;
let photoContent = {};
let showingLiked = false;
let showLiked = false;
let credits = 100;

document.querySelectorAll("input[name='tabs']").forEach((input) => {
  input.addEventListener("change", (input) => switchSection(input.target.dataset.section));
});

function switchSection(section) {
  if (section == 2) {
    loadHistory();
  }

  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.remove("visible");
  });

  document.getElementById("section_" + section).classList.add("visible");
}

function toggleExpandCard(id) {
  const card = document.getElementById("shoot_" + id);
  const btn = document.querySelector("#shoot_" + id + " > .expand");

  if (btn.classList.contains("close")) {
    clearInterval(fetchImage);
    clearTimeout(imageTimeout);
    card.scrollIntoView({ behavior: "instant", block: "center" });
    window.getComputedStyle(overlayCard).position;

    overlayCard.style.top = card.getBoundingClientRect().top;
    overlayCard.style.left = card.getBoundingClientRect().left;
    overlayCard.style.width = card.offsetWidth;
    overlayCard.style.height = card.offsetHeight;

    const labels = card.querySelectorAll("label");
    const inputs = card.querySelectorAll("input");

    labels.forEach((label) => {
      label.setAttribute("for", label.getAttribute("for").slice(0, -9));
    });

    inputs.forEach((input) => {
      input.setAttribute("name", input.getAttribute("name").slice(0, -9));
      input.id = input.id.slice(0, -9);
    });

    btn.classList.remove("close");
    overlayCard.querySelector(".expand").classList.remove("close");
    overlayCard.querySelector("#credits").classList.remove("show");
    overlayCard.querySelector(".card_content").classList.add("hide");

    setTimeout(() => {
      overlayCard.classList.remove("fullscreen");

      setTimeout(() => {
        overlayCard.remove();
      }, 500);
    }, 300);
  } else {
    overlayCard = card.cloneNode(true);
    overlayCard.style.position = "absolute";
    overlayCard.style.boxShadow = "unset";
    overlayCard.style.zIndex = 99999;

    overlayCard.style.top = card.getBoundingClientRect().top;
    overlayCard.style.left = card.getBoundingClientRect().left;
    overlayCard.style.width = card.offsetWidth;
    overlayCard.style.height = card.offsetHeight;

    dropArea = overlayCard.querySelector("#drop");
    if (dropArea) {
      dropArea.addEventListener("dragenter", preventDefaults, false);
      dropArea.addEventListener("dragover", preventDefaults, false);
      dropArea.addEventListener("dragleave", preventDefaults, false);
      dropArea.addEventListener("drop", preventDefaults, false);
      dropArea.addEventListener("dragenter", highlight, false);
      dropArea.addEventListener("dragover", highlight, false);
      dropArea.addEventListener("dragleave", unhighlight, false);
      dropArea.addEventListener("drop", unhighlight, false);
      dropArea.addEventListener("drop", handleDrop, false);
    }

    const labels = card.querySelectorAll("label");
    const inputs = card.querySelectorAll("input");

    labels.forEach((label) => {
      label.setAttribute("for", label.getAttribute("for") + "_template");
    });

    inputs.forEach((input) => {
      input.setAttribute("name", input.getAttribute("name") + "_template");
      input.id = input.id + "_template";
    });

    document.querySelector("body").appendChild(overlayCard);
    window.getComputedStyle(overlayCard).position;
    overlayCard.classList.add("fullscreen");
    overlayCard.querySelector(".expand").classList.add("close");
    btn.classList.add("close");

    photoContent = {};

    if (credits <= 0) {
      overlayCard.querySelector(".generate_wrapper > button").disabled = true;
    }

    setTimeout(() => {
      overlayCard.querySelector(".card_content").classList.remove("hide");
      overlayCard.querySelector("#credits").classList.add("show");
    }, 500);
  }
}

function getSelectedAspectRatio(ar = null) {
  const aspectRatio = overlayCard?.querySelector('input[name="aspect_ratio_quick"]:checked')?.id.split("_")[0] ?? overlayCard?.querySelector('input[name="aspect_ratio_custom"]:checked')?.id.split("_")[0];

  if (ar) return ar;
  else if (aspectRatio == "square") return 1;
  else if (aspectRatio == "portrait") return 512 / 704;
  else if (aspectRatio == "landscape") return 704 / 512;
  else return 1;
}

function updateAspectRatioPreview(ar = null) {
  overlayCard.querySelector(".photoshoots img").classList.add("hide");
  overlayCard.querySelector(".photoshoots .button_wrapper").classList.add("hide");
  overlayCard.querySelector(".photoshoots_wrapper > .photoshoots").style.aspectRatio = getSelectedAspectRatio(ar);
  window.getComputedStyle(overlayCard).aspectRatio;
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropArea.classList.add("highlight");
}

function unhighlight() {
  dropArea.classList.remove("highlight");
}

function handleDrop(e) {
  let dt = e.dataTransfer;
  let file = dt.files[0];

  addPreview(file);
}

function addPreview(file) {
  copycatImage = file;

  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = function () {
    const img = overlayCard.querySelector("#pick_image > #copycat_preview > img");
    img.src = reader.result;
    img.style.opacity = 1;
    copycatCustomImage = true;
    img.addEventListener("load", () => updateAspectRatioPreview(img.naturalWidth / img.naturalHeight));

    if (credits > 0) {
      overlayCard.querySelector(".generate_wrapper > button").disabled = false;
    }
  };
}

async function browseCategory(category = null, show = true) {
  const settings = overlayCard.querySelector(".settings");
  const categoryMenu = overlayCard.querySelector(".submenu");

  if (show) {
    settings.classList.add("hide");
    categoryMenu.querySelector("#category").innerHTML = category;

    const response = await fetch("./categories/" + category, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const res = await response.json();
      const categoryGallery = categoryMenu.querySelector(".submenu_gallery");

      categoryGallery.innerHTML = "";
      categoryMenu.querySelector(".submenu_gallery_wrapper").scrollTo(0, 0);

      const imageContainer = document.createElement("div");
      imageContainer.classList.add("image_container");
      imageContainer.addEventListener("click", () => {
        const btn = overlayCard.querySelector("#photo_content_settings > #" + category);
        btn.innerHTML = "Pick " + category;
        btn.style.backgroundImage = "unset";
        delete photoContent[category];
        browseCategory("", false);
      });

      const text = document.createElement("h4");
      text.innerHTML = "Remove selection";

      imageContainer.appendChild(text);
      categoryGallery.appendChild(imageContainer);

      res.categories.forEach((option) => {
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image_container");
        imageContainer.addEventListener("click", () => {
          const btn = overlayCard.querySelector("#photo_content_settings > #" + category);

          btn.innerHTML = "<span class='maintext'>" + option.name + "</span><span class='subtext'>Click to change " + category + "</span>";
          btn.style.backgroundImage = "url('" + option.image + "')";

          photoContent[category] = option?.prompt ?? option.name;
          browseCategory(option.name, false);
        });

        const image = document.createElement("img");
        image.src = option.image;
        image.setAttribute("loading", "lazy");

        const text = document.createElement("h4");
        text.innerHTML = option.name;

        imageContainer.appendChild(image);
        imageContainer.appendChild(text);
        categoryGallery.appendChild(imageContainer);
      });

      setTimeout(() => {
        categoryMenu.classList.remove("hide");
      }, 400);
    }
  } else {
    categoryMenu.classList.add("hide");
    setTimeout(() => {
      settings.classList.remove("hide");
    }, 400);
  }
}

async function browseTemplate(show = true) {
  const settings = overlayCard.querySelector(".settings");
  const copycatTemplate = overlayCard.querySelector(".submenu");
  const copycatGallery = copycatTemplate.querySelector(".submenu_gallery");

  if (show) {
    settings.classList.add("hide");

    if (copycatGallery.childNodes.length <= 1) {
      const response = await fetch("./copycat-gallery", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const res = await response.json();

        res.images.forEach((img) => {
          const imageContainer = document.createElement("div");
          imageContainer.classList.add("image_container");

          const image = document.createElement("img");
          image.src = img;
          image.setAttribute("loading", "lazy");
          image.addEventListener("click", () => {
            const imgElem = overlayCard.querySelector("#pick_image > #copycat_preview > img");
            imgElem.src = img;
            imgElem.style.opacity = 1;
            copycatCustomImage = false;
            imgElem.addEventListener("load", () => updateAspectRatioPreview(imgElem.naturalWidth / imgElem.naturalHeight));

            if (credits > 0) {
              overlayCard.querySelector(".generate_wrapper > button").disabled = false;
            }

            browseTemplate(false);
          });

          imageContainer.appendChild(image);
          copycatGallery.appendChild(imageContainer);
        });
      }
    }

    setTimeout(() => {
      copycatTemplate.classList.remove("hide");
    }, 400);
  } else {
    copycatTemplate.classList.add("hide");
    setTimeout(() => {
      settings.classList.remove("hide");
    }, 400);
  }
}

async function generatePicture(card) {
  let body = {};
  const generateButton = overlayCard.querySelector(".generate_wrapper > button");

  if (credits <= 0) {
    generateButton.disabled = true;
  }

  if (card == 1) {
    body["source"] = "quick";
    body["aspect-ratio"] = overlayCard.querySelector('input[name="aspect_ratio_quick"]:checked')?.id.split("_")[0];
    body["photo-content"] = photoContent;

    if (!body["aspect-ratio"]) {
      generateButton.disabled = true;
      return;
    }
  } else if (card == 2) {
    body["source"] = "customize";
    body["aspect-ratio"] = overlayCard.querySelector('input[name="aspect_ratio_custom"]:checked')?.id.split("_")[0];
    body["prompt"] = overlayCard.querySelector("#prompt").value;
    body["negative-prompt"] = overlayCard.querySelector("#negative_prompt").value;

    if (!body["aspect-ratio"]) {
      generateButton.disabled = true;
      return;
    }
  } else if (card == 3) {
    body["source"] = "copycat";
    body["isCustomImage"] = copycatCustomImage;
    body["image"] = overlayCard.querySelector("#copycat_preview > img")?.src;
    body["strength"] = overlayCard.querySelector('input[name="copy_amount"]:checked')?.id;

    if (!body["image"] || !body["strength"] || copycatCustomImage == null) {
      generateButton.disabled = true;
      return;
    }
  }

  disableSettings(true);
  updateCredits(credits - 1);

  const response = await fetch("./pictures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const res = await response.json();
    const imgId = res.imgId;
    const responseId = res.id;

    updateCredits(res.credits);

    if (res.coldBoot) {
      const status = overlayCard.querySelector(".status");
      status.innerHTML = "Your model is booting up (est. 2-3 mins)...";
      status.classList.add("show");
    }

    imageTimeout = setTimeout(() => {
      const status = overlayCard.querySelector(".status");
      status.innerHTML = "An error occured, please try again later.";
      status.classList.add("show");

      clearInterval(fetchImage);
      updateCredits();
    }, 900000);

    fetchImage = setInterval(async () => {
      const imgReady = await fetch("./pictures/" + imgId + "?id=" + responseId, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (imgReady.ok) {
        clearInterval(fetchImage);
        clearTimeout(imageTimeout);

        overlayCard.querySelector(".status").classList.remove("show");

        updateCredits();
        setTimeout(loadHistory, 2000);

        const wrapper = overlayCard.querySelector(".photoshoots");
        const image = wrapper.querySelector("img");
        const imageButtons = wrapper.querySelector(".button_wrapper");

        wrapper.id = "img_" + imgId;

        imageButtons.querySelector(".heart_toggle").addEventListener("click", () => {
          toggleLiked(imgId);
        });

        const downloadButton = imageButtons.querySelector(".download_button");
        downloadButton.href = "pictures/" + imgId;
        downloadButton.setAttribute("download", imgId + ".png");

        image.addEventListener("click", () => {
          toggleExpandImage(imgId, true, overlayCard);
        });

        image.src = "pictures/" + imgId;

        image.addEventListener("load", () => {
          wrapper.classList.remove("loading");
          image.classList.remove("hide");
          imageButtons.classList.remove("hide");

          if (window.matchMedia("(max-width: 800px)").matches) {
            overlayCard.querySelector("#generate_back").classList.remove("disabled");
          } else {
            disableSettings(false);
          }
        });
      } else if (imgReady.status === 404) {
        const imgReadyJson = await imgReady.json();
        const status = overlayCard.querySelector(".status");

        if (imgReadyJson.starting === true) {
          status.innerHTML = "Your model is booting up (est. 2-3 mins)...";
          status.classList.add("show");
        } else if (imgReadyJson.starting === false) {
          status.classList.remove("show");
        } else {
          status.innerHTML = "An error occured, please try again later.";
          status.classList.add("show");

          clearInterval(fetchImage);
          clearTimeout(imageTimeout);
          updateCredits();
        }
      }
    }, 3000);
  }
}

function disableSettings(disable) {
  const generateButton = overlayCard.querySelector(".generate_wrapper > button");
  const settings = overlayCard.querySelector(".settings");
  const photoshootContainer = overlayCard.querySelector(".photoshoots_container");
  const photoshoot = overlayCard.querySelector(".photoshoots");

  if (disable) {
    generateButton.innerHTML = "Generating...";
    generateButton.disabled = true;
    settings.classList.add("disabled");
    setTimeout(() => {
      photoshootContainer.classList.remove("hide");
    }, 400);
    overlayCard.querySelector("#generate_back").classList.add("disabled");

    photoshoot.classList.add("loading");
    photoshoot.querySelector("img").classList.add("hide");
    photoshoot.querySelector(".button_wrapper").classList.add("hide");
  } else {
    generateButton.innerHTML = "Generate";
    generateButton.disabled = false;
    photoshootContainer.classList.add("hide");
    setTimeout(() => {
      settings.classList.remove("disabled");
    }, 400);
  }
}

async function updateCredits(cred = null) {
  const creditsElements = document.querySelectorAll(".credits");

  if (cred) {
    credits = cred;

    creditsElements.forEach((e) => {
      e.innerHTML = cred;
    });
  } else {
    const response = await fetch("./credits", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const res = await response.json();

      credits = res.credits;

      creditsElements.forEach((e) => {
        e.innerHTML = res.credits;
      });
    }
  }
}

async function loadHistory() {
  const response = await fetch("./pictures", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (response.ok) {
    const res = await response.json();
    const imgs = res.images.reverse();

    photoshootsNumber.innerHTML = imgs.length;
    gallery.innerHTML = "";

    imgs.forEach((img) => {
      const imageContainer = document.createElement("div");
      imageContainer.classList.add("image_container");
      imageContainer.id = "img_" + img._id;

      const image = document.createElement("img");
      image.src = "pictures/" + img._id;
      image.setAttribute("loading", "lazy");
      image.addEventListener("click", () => {
        toggleExpandImage(img._id, true, gallery);
      });

      const buttonWrapper = document.createElement("div");
      buttonWrapper.classList.add("button_wrapper");

      const closeButton = document.createElement("div");
      closeButton.classList.add("button", "close_button");
      buttonWrapper.appendChild(closeButton);

      const downloadButton = document.createElement("a");
      downloadButton.classList.add("button", "download_button");
      downloadButton.setAttribute("download", img._id + ".png");
      downloadButton.href = "pictures/" + img._id;
      buttonWrapper.appendChild(downloadButton);

      const heartToggle = document.createElement("div");
      heartToggle.classList.add("button", "heart_toggle", img.liked ? "liked" : "unliked");
      heartToggle.addEventListener("click", () => {
        toggleLiked(img._id);
      });
      buttonWrapper.appendChild(heartToggle);

      imageContainer.appendChild(image);
      imageContainer.appendChild(buttonWrapper);
      gallery.appendChild(imageContainer);
    });
  }
}

async function toggleLiked(id) {
  const containers = document.querySelectorAll("#img_" + id);
  let hearts = [];
  containers.forEach((container) => {
    hearts.push(container.querySelector(".heart_toggle"));
  });

  const response = await fetch("./like-picture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, liked: !hearts[0].classList.contains("liked") }),
  });

  if (response.ok) {
    const res = await response.json();

    if (res.liked) {
      hearts.forEach((heart) => {
        heart.classList.add("liked");
      });
    } else {
      hearts.forEach((heart) => {
        heart.classList.remove("liked");
      });
    }
  }
}

function toggleExpandImage(id, expand = true, location = document) {
  const imageContainer = location.querySelector("#img_" + id);

  if (expand) {
    overlayImage = imageContainer.cloneNode(true);
    overlayImage.style.position = "absolute";
    overlayImage.style.boxShadow = "unset";
    overlayImage.style.zIndex = 99999;
    overlayImage.style.aspectRatio = "unset";

    overlayImage.style.top = imageContainer.getBoundingClientRect().top;
    overlayImage.style.left = imageContainer.getBoundingClientRect().left;
    overlayImage.style.width = imageContainer.offsetWidth;
    overlayImage.style.height = imageContainer.offsetHeight;

    imageContainer.classList.add("hide");

    overlayImage.addEventListener("click", (event) => {
      if (overlayImage !== event.target) return;
      toggleExpandImage(id, false, location);
    });

    overlayImage.querySelector(".button_wrapper > .close_button").addEventListener("click", () => {
      toggleExpandImage(id, false, location);
    });

    overlayImage.querySelector(".button_wrapper > .heart_toggle").addEventListener("click", () => {
      toggleLiked(id);
    });

    document.querySelector("body").appendChild(overlayImage);
    window.getComputedStyle(overlayImage).position;
    overlayImage.classList.add("fullscreen");
  } else {
    imageContainer.scrollIntoView({ behavior: "instant", block: "center" });
    window.getComputedStyle(overlayImage).position;

    overlayImage.style.top = imageContainer.getBoundingClientRect().top;
    overlayImage.style.left = imageContainer.getBoundingClientRect().left;
    overlayImage.style.width = imageContainer.offsetWidth;
    overlayImage.style.height = imageContainer.offsetHeight;

    overlayImage.classList.remove("fullscreen");
    imageContainer.classList.remove("hide");

    setTimeout(() => {
      overlayImage.remove();
    }, 500);
  }
}

function filterLiked() {
  const showLiked = showingLiked;

  if (showLiked) {
    showingLiked = false;
    toggleLikedButton.innerHTML = "Show liked";
  } else {
    showingLiked = true;
    toggleLikedButton.innerHTML = "Show all";
  }

  imgs = document.querySelectorAll(".image_container");
  imgs.forEach((img) => {
    img.classList.add("hide");

    setTimeout(() => {
      img.style.display = "none";
      if (showLiked) {
        img.style.display = "";
        window.getComputedStyle(img).position;
        img.classList.remove("hide");
      } else {
        if (img.querySelector(".button_wrapper > .heart_toggle").classList.contains("liked")) {
          img.style.display = "";
          window.getComputedStyle(img).position;
          img.classList.remove("hide");
        }
      }
    }, 300);
  });
}

async function initialize() {
  const response = await fetch("./create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item: "topup" }),
  });

  const res = await response.json();

  emailAddress = res.email;
  price = res.price;
  payButton.innerHTML = "Pay $" + price;

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

function buyTopUp() {
  payButton.disabled = true;
  payButton.innerHTML = "Processing";

  stripe
    .confirmPayment({
      elements,
      confirmParams: {
        return_url: location.href.split("/").slice(0, -1).join("/") + "/dashboard",
        receipt_email: emailAddress,
      },
    })
    .then((res) => {
      payError.innerHTML = res.error.message;
      payButton.disabled = false;
      payButton.innerHTML = "Pay $" + price;
    });
}
