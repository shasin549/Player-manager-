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
        const request = indexedDB.open('PlayerManagerDB', 1);
        
        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(new Error("Database error: " + event.target.error.message));
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('players')) {
                const store = db.createObjectStore('players', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('position', 'position', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        };
    });
}

// Load players from DB and sort them
async function loadPlayers() {
    try {
        const transaction = db.transaction(['players'], 'readonly');
        const store = transaction.objectStore('players');
        const request = store.getAll();
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                players = request.result || [];
                // Sort players by position order
                players.sort((a, b) => {
                    return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
                });
                resolve(players);
            };
        });
    } catch (error) {
        console.error('Error in loadPlayers:', error);
        return [];
    }
}

// Save player to DB
async function savePlayer(player) {
    try {
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        
        const request = editIndex >= 0 
            ? store.put({ ...player, id: players[editIndex].id }) 
            : store.add(player);
        
        await new Promise((resolve) => {
            request.onsuccess = resolve;
        });
    } catch (error) {
        console.error('Error in savePlayer:', error);
        throw error;
    }
}

// Render table with sorted players
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    
    if (players.length === 0) {
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
    const totalValue = players.reduce((sum, player) => sum + player.value, 0);
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 11;
    const remaining = targetValue ? Math.max(0, targetValue - totalValue) : 0;
    const remainingPlayers = Math.max(0, maxPlayers - players.length);
    const average = remainingPlayers > 0 && targetValue ? Math.round(remaining / remainingPlayers) : 0;
    
    document.getElementById('totalValue').textContent = totalValue;
    document.getElementById('remainingValue').textContent = targetValue ? remaining : '-';
    document.getElementById('averageValue').textContent = targetValue ? (remainingPlayers > 0 ? average : '-') : '-';
}

// Add/Update player
async function addPlayer() {
    try {
        const name = document.getElementById('name').value.trim();
        const position = document.getElementById('position').value;
        const playingStyle = document.getElementById('playingStyle').value;
        const value = parseInt(document.getElementById('value').value);
        
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

// Edit player
function editPlayer(index) {
    const player = players[index];
    document.getElementById('name').value = player.name;
    document.getElementById('position').value = player.position;
    document.getElementById('playingStyle').value = player.playingStyle;
    document.getElementById('value').value = player.value;
    
    editIndex = index;
    addPlayerBtn.textContent = 'Update Player';
}

// Delete player
async function deletePlayer(id) {
    if (!confirm('Are you sure you want to delete this player?')) return;
    
    try {
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        const request = store.delete(id);
        
        await new Promise((resolve) => {
            request.onsuccess = resolve;
        });
        
        await loadPlayers();
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error deleting player:", error);
        alert("Failed to delete player: " + error.message);
    }
}

// Initialize the application
async function initializeApp() {
    try {
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
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize application: " + error.message);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);