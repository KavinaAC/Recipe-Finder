const apiKey = "your_api_key";  
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const recipeContainer = document.getElementById("recipes");
const spinner = document.getElementById("spinner");
const modal = document.getElementById("recipeModal");
const modalBody = document.getElementById("modal-body");

// ✅ Get selected filters
function getSelectedFilters() {
  return [...document.querySelectorAll(".filter-option:checked")].map(f => f.value);
}
function getCuisineFilters() {
  return [...document.querySelectorAll(".cuisine-option:checked")].map(f => f.value);
}
function getMealFilters() {
  return [...document.querySelectorAll(".meal-option:checked")].map(f => f.value);
}
function getTimeFilter() {
  const selected = document.querySelector(".time-option:checked");
  return selected ? selected.value : "";
}

async function findRecipes() {
  const ingredients = document.getElementById("ingredients").value.trim();
  const diets = getSelectedFilters();
  const meals = getMealFilters();
  const time = getTimeFilter();
  const cuisines = getCuisineFilters();

  if (!ingredients && !diets.length && !meals.length && !time && !cuisines.length) {
    showMessage("⚠️ Please enter ingredients or apply filters.", "error-message");
    return;
  }

  spinner.classList.remove("hidden");
  recipeContainer.innerHTML = "";

  try {
    let url;

    if (ingredients) {
      url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=8&apiKey=${apiKey}`;
    } else {
      url = `https://api.spoonacular.com/recipes/complexSearch?number=8&apiKey=${apiKey}`;
      if (diets.length) url += `&diet=${diets.join(",")}`;
      if (meals.length) url += `&type=${meals.join(",")}`;
      if (time) url += `&maxReadyTime=${time}`;
      if (cuisines.length) url += `&cuisine=${cuisines.join(",")}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load recipes");

    const data = await res.json();
    let recipes = data.results || data;

    if (!recipes || recipes.length === 0) {
      showMessage("❌ No recipes found for your input.", "no-data-message");
      return;
    }

    displayRecipes(recipes, false);
  } catch (error) {
    showMessage(`⚠️ ${error.message}`, "error-message");
  } finally {
    spinner.classList.add("hidden");
  }
}

// Open recipe details in modal
async function showRecipeDetails(id) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "<p>⏳ Loading details...</p>";

  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}`
    );
    if (!res.ok) throw new Error("Failed to load recipe details");

    const recipe = await res.json();

    modalBody.innerHTML = `
      <h2>${recipe.title}</h2>
      <img src="${recipe.image}" alt="${recipe.title}">
      <h3>📝 Ingredients</h3>
      <ul>
        ${recipe.extendedIngredients.map((ing) => `<li>${ing.original}</li>`).join("")}
      </ul>
      <h3>👩‍🍳 Instructions</h3>
      <p>${recipe.instructions || "No instructions available."}</p>
      <button onclick='startCooking(${JSON.stringify(recipe.analyzedInstructions[0]?.steps || [])})'>
        🍳 Start Cooking
      </button>
    `;
  } catch (error) {
    modalBody.innerHTML = `<p style="color:red;">⚠️ ${error.message}</p>`;
  }
}

// Close modal
function closeModal() {
  modal.classList.add("hidden");
}

// Render recipes
function displayRecipes(recipes, isFavView) {
  if (!recipes.length) {
    showMessage("❌ No recipes found", "no-data-message");
    return;
  }

  recipeContainer.innerHTML = recipes
    .map(
      (recipe) => `
      <div class="card">
        <img src="${recipe.image}" alt="${recipe.title}">
        <h3>${recipe.title}</h3>
        ${
          !isFavView && recipe.missedIngredientCount !== undefined
            ? `<p>Missing Ingredients: ${recipe.missedIngredientCount}</p>`
            : ""
        }
        <button onclick="toggleFavorite(${recipe.id}, '${recipe.title.replace(/'/g,"\\'")}', '${recipe.image}')">
          ${isFavorite(recipe.id) ? "❤️ Remove" : "🤍 Save"}
        </button>
        <button onclick="showRecipeDetails(${recipe.id})">📖 View Recipe</button>
      </div>
    `
    )
    .join("");
}

// Add or remove recipe from favorites
function toggleFavorite(id, title, image) {
  const exists = favorites.find((f) => f.id === id);
  if (exists) {
    favorites = favorites.filter((f) => f.id !== id);
  } else {
    favorites.push({ id, title, image });
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));

  const currentView = document.querySelector(".container h1").dataset.view;
  if (currentView === "favorites") {
    showFavorites();
  } else {
    findRecipes();
  }
}

function isFavorite(id) {
  return favorites.some((f) => f.id === id);
}

function showFavorites() {
  document.querySelector(".container h1").dataset.view = "favorites";
  if (!favorites.length) {
    showMessage("⭐ No favorites saved yet.", "no-data-message");
    return;
  }
  displayRecipes(favorites, true);
}

function resetToSearch() {
  document.querySelector(".container h1").dataset.view = "search";
  recipeContainer.innerHTML = "";
}

// Show messages
function showMessage(message, type = "no-data-message", duration = 3000) {
  recipeContainer.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = `message-box ${type}`;
  msg.textContent = message;
  recipeContainer.appendChild(msg);

  setTimeout(() => {
    msg.classList.add("fade-out");
    setTimeout(() => msg.remove(), 1000);
  }, duration);
}

// 🎤 Voice input
function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Sorry, your browser does not support voice search 😔");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onstart = () => {
    document.getElementById("ingredients").placeholder = "🎤 Listening...";
  };

  recognition.onspeechend = () => {
    recognition.stop();
    document.getElementById("ingredients").placeholder = "Enter ingredients...";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("ingredients").value = transcript;
    findRecipes();
  };

  recognition.onerror = (event) => {
    alert("Voice recognition error: " + event.error);
  };
}

/* =======================
   🍳 Start Cooking Mode
======================= */
let currentStep = 0;
let cookingSteps = [];

function startCooking(steps) {
  if (!steps || steps.length === 0) {
    modalBody.innerHTML = "<p>No step-by-step instructions available 😔</p>";
    return;
  }

  cookingSteps = steps;
  currentStep = 0;
  showStep();
}

function showStep() {
  const step = cookingSteps[currentStep];
  modalBody.innerHTML = `
    <h2>Step ${step.number} of ${cookingSteps.length}</h2>
    <p>${step.step}</p>
    <div>
      <button onclick="prevStep()">⬅️ Back</button>
      <button onclick="repeatStep()">🔁 Repeat</button>
      <button onclick="nextStep()">➡️ Next</button>
    </div>
  `;

  speak(step.step);
}

function nextStep() {
  if (currentStep < cookingSteps.length - 1) {
    currentStep++;
    showStep();
  } else {
    modalBody.innerHTML = `<h2>✅ Cooking Complete!</h2><p>Enjoy your meal 🎉</p>`;
    speak("Cooking complete! Enjoy your meal.");
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep();
  }
}

function repeatStep() {
  speak(cookingSteps[currentStep].step);
}

// ✅ Text-to-Speech
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}


