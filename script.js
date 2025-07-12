let players = [];
let targetValue;
let editIndex = -1;
let db;
let dbVersion = 3; // Incremented version to ensure clean upgrade

// DOM Elements
const addPlayerBtn = document.getElementById('addPlayerBtn');
const resetBtn = document.getElementById('resetBtn');
const targetInput = document.getElementById('targetInput');

// Initialize IndexedDB with proper error handling
function initDB() {
    return new Promise((resolve, reject) => {
        console.log('Initializing database...');
        
        if (!window.indexedDB) {
            const error = "Your browser doesn't support IndexedDB";
            console.error(error);
            reject(new Error(error));
            return;
        }

        const request = indexedDB.open('PlayerManagerDB', dbVersion);
        
        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(new Error("Database error: " + event.target.error.message));
        };
        
        request.onblocked = () => {
            const error = "Database upgrade blocked by other connection";
            console.error(error);
            reject(new Error(error));
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            
            // Add database error handler
            db.onerror = (event) => {
                console.error("Database error:", event.target.error);
            };
            
            console.log('Database opened successfully');
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed');
            const db = event.target.result;
            
            // Delete old stores if they exist (clean upgrade)
            if (db.objectStoreNames.contains('players')) {
                db.deleteObjectStore('players');
            }
            if (db.objectStoreNames.contains('settings')) {
                db.deleteObjectStore('settings');
            }
            
            // Create fresh stores
            console.log('Creating players store');
            const playersStore = db.createObjectStore('players', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            playersStore.createIndex('name', 'name', { unique: false });
            playersStore.createIndex('position', 'position', { unique: false });
            
            console.log('Creating settings store');
            db.createObjectStore('settings');
        };
    });
}

// Improved loadPlayers with error handling
async function loadPlayers() {
    console.log('Loading players...');
    try {
        if (!db) throw new Error("Database not initialized");
        
        const transaction = db.transaction(['players'], 'readonly');
        const store = transaction.objectStore('players');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                players = request.result || [];
                console.log(`Loaded ${players.length} players`);
                resolve(players);
            };
            
            request.onerror = (event) => {
                const error = new Error('Failed to load players: ' + event.target.error);
                console.error(error);
                reject(error);
            };
        });
    } catch (error) {
        console.error('Error in loadPlayers:', error);
        throw error;
    }
}

// Save player with validation
async function savePlayer(player) {
    console.log('Saving player:', player);
    try {
        if (!db) throw new Error("Database not initialized");
        if (!player.name) throw new Error("Player name is required");
        
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
                const error = new Error('Failed to save player: ' + event.target.error);
                console.error(error);
                reject(error);
            };
        });
    } catch (error) {
        console.error('Error in savePlayer:', error);
        throw error;
    }
}

// Delete player with confirmation
async function deletePlayer(id) {
    console.log('Deleting player ID:', id);
    if (!confirm('Are you sure you want to delete this player?')) {
        console.log('Deletion cancelled');
        return;
    }
    
    try {
        if (!db) throw new Error("Database not initialized");
        
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        const request = store.delete(id);
        
        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Player deleted successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                const error = new Error('Failed to delete player: ' + event.target.error);
                console.error(error);
                reject(error);
            };
        });
        
        await loadPlayers();
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error deleting player:", error);
        alert("Failed to delete player: " + error.message);
    }
}

// Update statistics display
function updateStats() {
    const totalValue = players.reduce((sum, player) => sum + (player.value || 0), 0);
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 11;
    const remaining = targetValue ? Math.max(0, targetValue - totalValue) : 0;
    const remainingPlayers = Math.max(0, maxPlayers - players.length);
    const average = remainingPlayers > 0 && targetValue ? Math.round(remaining / remainingPlayers) : 0;
    
    document.getElementById('totalValue').textContent = totalValue;
    document.getElementById('remainingValue').textContent = targetValue ? remaining : '-';
    document.getElementById('averageValue').textContent = targetValue ? (remainingPlayers > 0 ? average : '-') : '-';
}

// Render players table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    
    if (!players || players.length === 0) {
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
    
    tableBody.innerHTML = players.map((player, index) => `
        <tr>
            <td>${player.name || ''}</td>
            <td>${player.position || ''}</td>
            <td>${player.playingStyle || ''}</td>
            <td>${player.value || ''}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editPlayer(${index})">Edit</button>
                <button class="action-btn delete-btn" onclick="deletePlayer(${player.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Edit player function
function editPlayer(index) {
    const player = players[index];
    if (!player) return;
    
    document.getElementById('name').value = player.name || '';
    document.getElementById('position').value = player.position || 'select';
    document.getElementById('playingStyle').value = player.playingStyle || '';
    document.getElementById('value').value = player.value || '';
    
    editIndex = index;
    addPlayerBtn.textContent = 'Update Player';
    console.log('Editing player:', player);
}

// Add/Update player with validation
async function addPlayer() {
    try {
        const name = document.getElementById('name').value.trim();
        const position = document.getElementById('position').value;
        const playingStyle = document.getElementById('playingStyle').value;
        const value = parseInt(document.getElementById('value').value);
        
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
        } else {
            await loadPlayers();
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

// Initialize the application
async function initializeApp() {
    try {
        console.log('Initializing application...');
        
        await initDB();
        await loadPlayers();
        await loadTarget();
        
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