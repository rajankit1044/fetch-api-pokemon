// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const randomBtn = document.getElementById('randomBtn');
const pokemonInput = document.getElementById('pokemonInput');
const pokemonList = document.getElementById('pokemonList');
const pokemonCard = document.getElementById('pokemonCard');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMsg = document.getElementById('errorMsg');
const pokeName = document.getElementById('pokeName');
const pokeTypes = document.getElementById('pokeTypes');
const pokeImg = document.getElementById('pokeImg');
const shinyToggle = document.getElementById('shinyToggle');
const pokeHeight = document.getElementById('pokeHeight');
const pokeWeight = document.getElementById('pokeWeight');
const pokeId = document.getElementById('pokeId');
const pokeDescription = document.getElementById('pokeDescription');
const pokeAbilities = document.getElementById('pokeAbilities');
const evolutionContainer = document.getElementById('evolutionContainer');
const favoriteBtn = document.getElementById('favoriteBtn');
const favoritesSection = document.getElementById('favoritesSection');
const favoritesList = document.getElementById('favoritesList');

// Constants
const types = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC'
};

// State
let pokemonNames = [];
let currentPokemon = null;
let isShiny = false;
let favorites = JSON.parse(localStorage.getItem('pokemonFavorites')) || [];

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showLoading() {
  loading.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  pokemonCard.classList.add('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showError(message) {
  errorMsg.textContent = message;
  errorDiv.classList.remove('hidden');
  pokemonCard.classList.add('hidden');
  hideLoading();
}

function hideError() {
  errorDiv.classList.add('hidden');
}

// Data Fetching Functions
async function fetchPokemonNames() {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const data = await res.json();
    pokemonNames = data.results.map(p => p.name);
    pokemonNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      pokemonList.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching Pokémon names:', error);
  }
}

async function fetchPokemonData(nameOrId) {
  showLoading();
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId.toLowerCase()}`);
    if (!res.ok) throw new Error('Pokémon not found');
    const data = await res.json();
    currentPokemon = data;
    renderPokemon(data);
    await fetchEvolutionChain(data.id);
    await fetchDescription(data.id);
    hideError();
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

async function fetchEvolutionChain(pokemonId) {
  try {
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const speciesData = await speciesRes.json();
    const evolutionRes = await fetch(speciesData.evolution_chain.url);
    const evolutionData = await evolutionRes.json();
    renderEvolutionChain(evolutionData.chain);
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
  }
}

async function fetchDescription(pokemonId) {
  try {
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const speciesData = await speciesRes.json();
    const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    pokeDescription.textContent = englishEntry ? englishEntry.flavor_text.replace(/\f/g, ' ') : 'No description available.';
  } catch (error) {
    console.error('Error fetching description:', error);
  }
}

// Rendering Functions
function renderPokemon(data) {
  pokeName.textContent = data.name;
  pokeId.textContent = data.id;
  pokeHeight.textContent = (data.height / 10).toFixed(1);
  pokeWeight.textContent = (data.weight / 10).toFixed(1);

  // Types
  pokeTypes.innerHTML = '';
  data.types.forEach(type => {
    const typeSpan = document.createElement('span');
    typeSpan.className = 'poke-type';
    typeSpan.textContent = type.type.name;
    typeSpan.style.backgroundColor = types[type.type.name];
    pokeTypes.appendChild(typeSpan);
  });

  // Image
  updateImage();

  // Stats
  const statIds = ['statHP', 'statAttack', 'statDefense', 'statSpAtk', 'statSpDef', 'statSpeed'];
  const statValueIds = ['statHPValue', 'statAttackValue', 'statDefenseValue', 'statSpAtkValue', 'statSpDefValue', 'statSpeedValue'];
  data.stats.forEach((stat, index) => {
    const percentage = Math.min((stat.base_stat / 255) * 100, 100);
    const bar = document.getElementById(statIds[index]);
    const value = document.getElementById(statValueIds[index]);
    bar.style.setProperty('--fill-width', `${percentage}%`);
    value.textContent = stat.base_stat;
  });

  // Abilities
  pokeAbilities.innerHTML = '';
  data.abilities.forEach(ability => {
    const li = document.createElement('li');
    li.textContent = ability.ability.name.replace('-', ' ');
    if (ability.is_hidden) li.textContent += ' (Hidden)';
    pokeAbilities.appendChild(li);
  });

  // Favorite button
  updateFavoriteButton();

  pokemonCard.classList.remove('hidden');
  pokemonCard.scrollIntoView({ behavior: 'smooth' });
}

function updateImage() {
  if (currentPokemon) {
    pokeImg.src = isShiny ? currentPokemon.sprites.front_shiny : currentPokemon.sprites.front_default;
  }
}

function renderEvolutionChain(chain) {
  evolutionContainer.innerHTML = '';
  const evolutions = [];
  let current = chain;
  while (current) {
    evolutions.push(current.species.name);
    current = current.evolves_to[0];
  }

  evolutions.forEach(async (name) => {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      const data = await res.json();
      const item = document.createElement('div');
      item.className = 'evolution-item';
      item.innerHTML = `
        <img src="${data.sprites.front_default}" alt="${data.name}" loading="lazy">
        <p>${data.name}</p>
      `;
      item.addEventListener('click', () => fetchPokemonData(data.name));
      evolutionContainer.appendChild(item);
    } catch (error) {
      console.error('Error rendering evolution:', error);
    }
  });
}

// Favorites Functions
function updateFavoriteButton() {
  if (currentPokemon) {
    const isFavorited = favorites.includes(currentPokemon.name);
    favoriteBtn.classList.toggle('favorited', isFavorited);
  }
}

function toggleFavorite() {
  if (currentPokemon) {
    const index = favorites.indexOf(currentPokemon.name);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(currentPokemon.name);
    }
    localStorage.setItem('pokemonFavorites', JSON.stringify(favorites));
    updateFavoriteButton();
    renderFavorites();
  }
}

function renderFavorites() {
  favoritesList.innerHTML = '';
  if (favorites.length > 0) {
    favoritesSection.classList.remove('hidden');
    favorites.forEach(async (name) => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const data = await res.json();
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
          <img src="${data.sprites.front_default}" alt="${data.name}" loading="lazy">
          <p>${data.name}</p>
        `;
        item.addEventListener('click', () => fetchPokemonData(data.name));
        favoritesList.appendChild(item);
      } catch (error) {
        console.error('Error rendering favorite:', error);
      }
    });
  } else {
    favoritesSection.classList.add('hidden');
  }
}

// Event Listeners
searchBtn.addEventListener('click', () => {
  const query = pokemonInput.value.trim();
  if (query) {
    fetchPokemonData(query);
  } else {
    showError('Please enter a Pokémon name or ID');
  }
});

randomBtn.addEventListener('click', () => {
  const randomName = pokemonNames[Math.floor(Math.random() * pokemonNames.length)];
  if (randomName) {
    pokemonInput.value = randomName;
    fetchPokemonData(randomName);
  }
});

shinyToggle.addEventListener('click', () => {
  isShiny = !isShiny;
  shinyToggle.textContent = isShiny ? 'Normal' : 'Shiny';
  updateImage();
});

favoriteBtn.addEventListener('click', toggleFavorite);

// Debounced search on input
const debouncedSearch = debounce(() => {
  const query = pokemonInput.value.trim();
  if (query && pokemonNames.includes(query.toLowerCase())) {
    fetchPokemonData(query);
  }
}, 500);

pokemonInput.addEventListener('input', debouncedSearch);

// Initialize
fetchPokemonNames();
renderFavorites();


const cards = document.querySelectorAll('.pokemon-card');
cards.forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * 10; // max 10deg
    const rotateY = ((x - centerX) / centerX) * 10; // max 10deg

    card.querySelector('.pokemon-card-inner').style.transform = `rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.querySelector('.pokemon-card-inner').style.transform = `rotateX(0deg) rotateY(0deg)`;
  });
});
