let players = [];
let targetValue;
let editIndex = -1;
let db;

// Define position order matching the dropdown
const POSITION_ORDER = [
    "CF", "SS", "RWF", "LWF", "AMF", 
    "RMF", "LMF", "CMF", "DMF", 
    "RB", "LB", "CB", "GK"
];

// DOM Elements
const addPlayerBtn = document.getElementById('addPlayerBtn');
const resetBtn = document.getElementById('resetBtn');
const targetInput = document.getElementById('targetInput');

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        console.log('Initializing database...');
        const request = indexedDB.open('PlayerManagerDB', 2); // Version 2
        
        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(new Error("Database error: " + event.target.error.message));
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed');
            const db = event.target.result;
            
            // Delete old stores if they exist
            if (db.objectStoreNames.contains('players')) {
                db.deleteObjectStore('players');
            }
            if (db.objectStoreNames.contains('settings')) {
                db.deleteObjectStore('settings');
            }
            
            // Create fresh stores
            console.log('Creating players store');
            const store = db.createObjectStore('players', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('position', 'position', { unique: false });
            
            console.log('Creating settings store');
            db.createObjectStore('settings');
        };
    });
}

// Load players from DB and sort them
async function loadPlayers() {
    try {
        console.log('Loading players from DB...');
        const transaction = db.transaction(['players'], 'readonly');
        const store = transaction.objectStore('players');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                players = request.result || [];
                // Sort players by position order
                players.sort((a, b) => {
                    return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
                });
                console.log(`Loaded ${players.length} players`);
                resolve(players);
            };
            
            request.onerror = (event) => {
                console.error('Error loading players:', event.target.error);
                reject(new Error('Failed to load players: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in loadPlayers:', error);
        throw error;
    }
}

// Load target value from DB
async function loadTarget() {
    try {
        console.log('Loading target value...');
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('targetValue');
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                targetValue = request.result;
                console.log('Loaded target value:', targetValue);
                if (targetValue) {
                    targetInput.value = targetValue;
                    document.getElementById('targetValue').textContent = targetValue;
                }
                resolve(targetValue);
            };
            
            request.onerror = () => {
                console.log('No target value found');
                resolve(null);
            };
        });
    } catch (error) {
        console.error('Error in loadTarget:', error);
        return null;
    }
}

// Save player to DB
async function savePlayer(player) {
    try {
        console.log('Saving player:', player);
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        
        const request = editIndex >= 0 
            ? store.put({ ...player, id: players[editIndex].id }) 
            : store.add(player);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Player saved successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error saving player:', event.target.error);
                reject(new Error('Failed to save player: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in savePlayer:', error);
        throw error;
    }
}

// Save target to DB
async function saveTarget(value) {
    try {
        console.log('Saving target value:', value);
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put(value, 'targetValue');
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Target saved successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error saving target:', event.target.error);
                reject(new Error('Failed to save target: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in saveTarget:', error);
        throw error;
    }
}

// Delete player from DB
async function deletePlayerFromDB(id) {
    try {
        console.log('Deleting player ID:', id);
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        const request = store.delete(id);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Player deleted successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error deleting player:', event.target.error);
                reject(new Error('Failed to delete player: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in deletePlayerFromDB:', error);
        throw error;
    }
}

// Reset all data
async function clearDB() {
    try {
        console.log('Clearing all DB data...');
        const transaction = db.transaction(['players', 'settings'], 'readwrite');
        const playersStore = transaction.objectStore('players');
        const settingsStore = transaction.objectStore('settings');
        
        await Promise.all([
            new Promise((resolve, reject) => { 
                playersStore.clear().onsuccess = resolve;
                playersStore.clear().onerror = (event) => {
                    reject(new Error('Failed to clear players: ' + event.target.error));
                };
            }),
            new Promise((resolve, reject) => { 
                settingsStore.clear().onsuccess = resolve;
                settingsStore.clear().onerror = (event) => {
                    reject(new Error('Failed to clear settings: ' + event.target.error));
                };
            })
        ]);
        console.log('DB cleared successfully');
    } catch (error) {
        console.error('Error in clearDB:', error);
        throw error;
    }
}

// Render players table
function renderTable() {
    console.log('Rendering table...');
    const tableBody = document.getElementById('tableBody');
    
    if (players.length === 0) {
        console.log('No players to display');
        tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-state-icon">⚽</div>
                    <div>No players added yet. Add your first player above!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log(`Rendering ${players.length} players`);
    tableBody.innerHTML = players.map((player, index) => `
        <tr>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.playingStyle}</td>
            <td>${player.value}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editPlayer(${index})">Edit</button>
                <button class="action-btn delete-btn" onclick="deletePlayer(${player.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStats() {
    console.log('Updating stats...');
    const totalValue = players.reduce((sum, player) => sum + (player.value || 0), 0);
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 21; // Default to 21
    const remaining = targetValue ? Math.max(0, targetValue - totalValue) : 0;
    const remainingPlayers = Math.max(0, maxPlayers - players.length);
    const average = remainingPlayers > 0 && targetValue ? Math.round(remaining / remainingPlayers) : 0;
    
    document.getElementById('totalValue').textContent = totalValue;
    document.getElementById('remainingValue').textContent = targetValue ? remaining : '-';
    document.getElementById('averageValue').textContent = targetValue ? (remainingPlayers > 0 ? average : '-') : '-';
    
    console.log('Stats updated:', {
        totalValue,
        remaining,
        average,
        remainingPlayers
    });
}

// Add/Update player
async function addPlayer() {
    try {
        console.log('Adding/updating player...');
        const name = document.getElementById('name').value.trim();
        const position = document.getElementById('position').value;
        const playingStyle = document.getElementById('playingStyle').value;
        const value = parseInt(document.getElementById('value').value);
        
        console.log('Form values:', { name, position, playingStyle, value });
        
        // Validation
        if (!name) throw new Error("Please enter player name");
        if (position === "select") throw new Error("Please select player position");
        if (!playingStyle) throw new Error("Please select playing style");
        if (isNaN(value) || value <= 0) throw new Error("Please enter a valid positive value");
        
        const player = { name, position, playingStyle, value };
        
        await savePlayer(player);
        
        if (editIndex >= 0) {
            players[editIndex] = player;
            editIndex = -1;
            addPlayerBtn.textContent = 'Add Player';
            console.log('Player updated successfully');
        } else {
            await loadPlayers();
            console.log('New player added successfully');
        }
        
        // Reset form
        document.getElementById('name').value = '';
        document.getElementById('position').value = 'select';
        document.getElementById('playingStyle').value = '';
        document.getElementById('value').value = '';
        
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error in addPlayer:", error);
        alert(error.message);
    }
}

// Edit player
function editPlayer(index) {
    console.log('Editing player at index:', index);
    const player = players[index];
    document.getElementById('name').value = player.name;
    document.getElementById('position').value = player.position;
    document.getElementById('playingStyle').value = player.playingStyle;
    document.getElementById('value').value = player.value;
    
    editIndex = index;
    addPlayerBtn.textContent = 'Update Player';
    console.log('Player loaded for editing:', player);
}

// Delete player
async function deletePlayer(id) {
    console.log('Deleting player with id:', id);
    if (!confirm('Are you sure you want to delete this player?')) {
        console.log('Deletion cancelled by user');
        return;
    }
    
    try {
        await deletePlayerFromDB(id);
        await loadPlayers();
        renderTable();
        updateStats();
        console.log('Player deleted successfully');
    } catch (error) {
        console.error("Error deleting player:", error);
        alert("Failed to delete player: " + error.message);
    }
}

// Update target value
async function updateTarget() {
    console.log('Updating target value...');
    const newTarget = parseInt(targetInput.value);
    
    if (isNaN(newTarget)) {
        alert("Please enter a valid number");
        return;
    }
    
    try {
        targetValue = newTarget;
        await saveTarget(targetValue);
        document.getElementById('targetValue').textContent = targetValue;
        updateStats();
        console.log('Target updated successfully');
    } catch (error) {
        console.error("Error updating target:", error);
        alert("Failed to update target: " + error.message);
    }
}

// Reset all data
async function resetApp() {
    console.log('Resetting app...');
    if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
        console.log('Reset cancelled by user');
        return;
    }
    
    try {
        await clearDB();
        players = [];
        targetValue = undefined;
        targetInput.value = '';
        document.getElementById('name').value = '';
        document.getElementById('position').value = 'select';
        document.getElementById('playingStyle').value = '';
        document.getElementById('value').value = '';
        document.getElementById('maxPlayers').value = '21'; // Reset to default 21
        addPlayerBtn.textContent = 'Add Player';
        editIndex = -1;
        
        renderTable();
        updateStats();
        console.log('App reset successfully');
    } catch (error) {
        console.error("Error resetting app:", error);
        alert("Failed to reset data: " + error.message);
    }
}

// Initialize the application
async function initializeApp() {
    try {
        console.log('Initializing application...');
        
        await initDB();
        await loadPlayers();
        await loadTarget();
        
        // Set default maxPlayers to 21
        document.getElementById('maxPlayers').value = '21';
        
        // Set up event listeners
        addPlayerBtn.addEventListener('click', addPlayer);
        resetBtn.addEventListener('click', resetApp);
        targetInput.addEventListener('change', updateTarget);
        document.getElementById('maxPlayers').addEventListener('change', updateStats);
        
        // Make functions available globally
        window.editPlayer = editPlayer;
        window.deletePlayer = deletePlayer;
        
        renderTable();
        updateStats();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize application: " + error.message);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);