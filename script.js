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
    } catch (error)