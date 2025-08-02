// DOM Elements
const itemsGrid = document.getElementById('itemsGrid');
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('itemModal');
const closeModal = document.querySelector('.close');
const refreshButton = document.getElementById('refreshButton');
const refreshTimer = document.getElementById('refreshTimer');

// Globale Variablen
let items = [];
const REFRESH_INTERVAL = 30; // Sekunden
const BUTTON_TIMEOUT = 15; // Sekunden
let refreshCountdown = REFRESH_INTERVAL;
let refreshTimerId = null;
let buttonTimeoutId = null;

// API Funktionen
async function fetchData(type = 'prices') {
    try {
        const response = await fetch(`data/${type}.json`);
        return await response.json();
    } catch (error) {
        console.error(`Fehler beim Abrufen von ${type}:`, error);
        return null;
    }
}

// UI Funktionen
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => showItemDetails(item);
    
    const textureName = item.material.toLowerCase();
    const iconUrl = `https://mc.nerothe.com/img/1.21.4/minecraft_${textureName}.png`;
    
    card.innerHTML = `
        <img src="${iconUrl}" alt="${item.material}" class="item-icon">
        <div class="item-tooltip">
            ${formatItemName(item.material)}
            <br>
            <span style="color: #4ade80">B ${item.buyPrice.toLocaleString()}$</span>
            <span style="color: #666">|</span>
            <span style="color: #ef4444">S ${item.sellPrice.toLocaleString()}$</span>
        </div>
    `;
    
    return card;
}

function updateItemsGrid(filteredItems = items) {
    const gridContainer = document.getElementById('itemsGrid');
    gridContainer.innerHTML = '';
    
    if (!filteredItems || filteredItems.length === 0) {
        gridContainer.innerHTML += '<div class="loading">Keine Items gefunden</div>';
        return;
    }

    if (categoryFilter.value) {
        // Wenn eine Kategorie ausgewählt ist, zeige Items in einem Grid
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'items-grid';
        
        filteredItems.forEach(item => {
            itemsGrid.appendChild(createItemCard(item));
        });
        
        gridContainer.appendChild(itemsGrid);
    } else {
        // Wenn keine Kategorie ausgewählt ist, gruppiere nach Kategorien
        const itemsByCategory = filteredItems.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});

        Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';

            const categoryTitle = document.createElement('h2');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = category;
            categorySection.appendChild(categoryTitle);

            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'items-grid';
            
            categoryItems.forEach(item => {
                categoryGrid.appendChild(createItemCard(item));
            });

            categorySection.appendChild(categoryGrid);
            gridContainer.appendChild(categorySection);
        });
    }
}

async function showItemDetails(item) {
    const modal = document.getElementById('itemModal');
    const modalItemIcon = document.getElementById('modalItemIcon');
    const modalItemName = document.getElementById('modalItemName');
    const modalItemCategory = document.getElementById('modalItemCategory');
    const modalBuyPrice = document.getElementById('modalBuyPrice');
    const modalBuyOrders = document.getElementById('modalBuyOrders');
    const modalSellPrice = document.getElementById('modalSellPrice');
    const modalSellOrders = document.getElementById('modalSellOrders');
    
    modalItemIcon.src = `https://mc.nerothe.com/img/1.21.4/minecraft_${item.material.toLowerCase()}.png`;
    modalItemName.textContent = formatItemName(item.material);
    modalItemCategory.textContent = item.category;
    modalBuyPrice.textContent = formatPrice(item.buyPrice);
    modalBuyOrders.textContent = `${item.buyOrders} aktive Kaufaufträge`;
    modalSellPrice.textContent = formatPrice(item.sellPrice);
    modalSellOrders.textContent = `${item.sellOrders} aktive Verkaufsaufträge`;
    
    // Preisverlauf laden
    try {
        const history = await fetchData(`history/${item.material}`);
        if (history) {
            displayPriceHistory(history);
        }
    } catch (error) {
        console.error('Fehler beim Laden des Preisverlaufs:', error);
    }
    
    modal.style.display = 'block';
}

function formatItemName(name) {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function formatPrice(price) {
    return price.toLocaleString('de-DE') + ' $';
}

function startButtonTimeout() {
    refreshButton.disabled = true;
    let timeout = BUTTON_TIMEOUT;
    
    const updateButtonText = () => {
        if (timeout > 0) {
            refreshButton.title = `Gesperrt (${timeout}s)`;
            timeout--;
            buttonTimeoutId = setTimeout(updateButtonText, 1000);
        } else {
            refreshButton.disabled = false;
            refreshButton.title = 'Aktualisieren';
            buttonTimeoutId = null;
        }
    };
    
    updateButtonText();
}

// Refresh Funktionen
async function refreshData(manual = false) {
    if (manual) {
        if (refreshButton.disabled) return;
        
        // Visual feedback
        refreshButton.classList.add('refreshing');
        setTimeout(() => refreshButton.classList.remove('refreshing'), 500);
        
        // Start button timeout
        startButtonTimeout();
        
        // Reset timer
        refreshCountdown = REFRESH_INTERVAL;
        updateTimerDisplay();
    }
    
    try {
        const pricesData = await fetchData('prices');
        
        if (pricesData) {
            items = pricesData;
            // Behalte aktuelle Filter bei
            const selectedCategory = categoryFilter.value;
            const searchTerm = searchInput.value.toLowerCase();
            
            let filteredItems = items;
            
            if (selectedCategory) {
                filteredItems = filteredItems.filter(item => item.category === selectedCategory);
            }
            
            if (searchTerm) {
                filteredItems = filteredItems.filter(item => {
                    const itemName = formatItemName(item.material).toLowerCase();
                    const materialName = item.material.toLowerCase();
                    return itemName.includes(searchTerm) || 
                           materialName.includes(searchTerm) ||
                           item.category.toLowerCase().includes(searchTerm) ||
                           item.buyPrice.toString().includes(searchTerm) ||
                           item.sellPrice.toString().includes(searchTerm);
                });
            }
            
            updateItemsGrid(filteredItems);
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren:', error);
    }
}

function updateTimerDisplay() {
    refreshTimer.textContent = refreshCountdown;
}

function startRefreshTimer() {
    // Clear any existing timer
    if (refreshTimerId) {
        clearInterval(refreshTimerId);
    }
    
    refreshCountdown = REFRESH_INTERVAL;
    updateTimerDisplay();
    
    refreshTimerId = setInterval(() => {
        refreshCountdown--;
        updateTimerDisplay();
        
        if (refreshCountdown <= 0) {
            refreshCountdown = REFRESH_INTERVAL;
            refreshData();
        }
    }, 1000);
}

let priceHistoryChart = null;

function displayPriceHistory(history) {
    const ctx = document.getElementById('priceHistoryChart').getContext('2d');
    
    if (priceHistoryChart) {
        priceHistoryChart.destroy();
    }

    const hourlyData = history.HOURLY
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(entry => ({
            x: new Date(entry.timestamp),
            y: entry.avgPrice,
            min: entry.minPrice,
            max: entry.maxPrice,
            items: entry.items,
            volume: entry.volume,
            transactions: entry.transactions
        }));

    Chart.defaults.color = '#b3b3b3';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    
    priceHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Verkaufspreis',
                data: hourlyData,
                borderColor: '#ef4444',
                tension: 0.1,
                fill: false,
                borderWidth: 2
            }, {
                label: 'Kaufpreis',
                data: hourlyData,
                borderColor: '#4ade80',
                tension: 0.1,
                fill: false,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatDate(context[0].raw.x);
                        },
                        label: function(context) {
                            const datapoint = context.raw;
                            if (context.datasetIndex === 0) {
                                const lines = [
                                    'Durchschnittspreis: ' + formatPrice(datapoint.y),
                                    'Min. Preis: ' + formatPrice(datapoint.min),
                                    'Max. Preis: ' + formatPrice(datapoint.max),
                                    'Transaktionen: ' + datapoint.transactions,
                                    'Gehandelte Items: ' + datapoint.items
                                ];
                                return lines;
                            }
                            return null;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b3b3b3'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b3b3b3',
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            }
        }
    });
}

// Event Listeners
closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

categoryFilter.addEventListener('change', () => {
    const selectedCategory = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    let filteredItems = items;
    
    if (selectedCategory) {
        filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => {
            const itemName = formatItemName(item.material).toLowerCase();
            const materialName = item.material.toLowerCase();
            return itemName.includes(searchTerm) || 
                   materialName.includes(searchTerm) ||
                   item.category.toLowerCase().includes(searchTerm) ||
                   item.buyPrice.toString().includes(searchTerm) ||
                   item.sellPrice.toString().includes(searchTerm);
        });
    }
    
    updateItemsGrid(filteredItems);
});

searchInput.addEventListener('input', () => {
    const selectedCategory = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    let filteredItems = items;
    
    if (selectedCategory) {
        filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => {
            const itemName = formatItemName(item.material).toLowerCase();
            const materialName = item.material.toLowerCase();
            return itemName.includes(searchTerm) || 
                   materialName.includes(searchTerm) ||
                   item.category.toLowerCase().includes(searchTerm) ||
                   item.buyPrice.toString().includes(searchTerm) ||
                   item.sellPrice.toString().includes(searchTerm);
        });
    }
    
    updateItemsGrid(filteredItems);
});

refreshButton.addEventListener('click', () => refreshData(true));

// Initialisierung
async function initialize() {
    itemsGrid.innerHTML = '<div class="loading">Lade Daten...</div>';
    
    try {
        const pricesData = await fetchData('prices');
        
        if (pricesData) {
            items = pricesData;
            updateItemsGrid(items);
            startRefreshTimer();
            
            // Kategorien im Dropdown aktualisieren
            const uniqueCategories = [...new Set(items.map(item => item.category))].sort();
            categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>' +
                uniqueCategories.map(category => 
                    `<option value="${category}">${category}</option>`
                ).join('');
        } else {
            itemsGrid.innerHTML = '<div class="error">Fehler beim Laden der Daten</div>';
        }
    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
        itemsGrid.innerHTML = '<div class="error">Fehler beim Laden der Daten</div>';
    }
}

initialize();
