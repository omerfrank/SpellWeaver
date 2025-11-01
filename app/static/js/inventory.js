// Data structure ready for Firebase integration
const inventoryData = {
    currency: {
        copper: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        emerald: 0
    },
    items: {
        equipped: [],
        consumables: [],
        general: []
    }
};

// Initialize with sample data
function initializeSampleData() {
    inventoryData.currency = { copper: 45, silver: 23, gold: 12, platinum:12, emerald:12  };
    inventoryData.items.equipped = [
        { id: '1', name: 'Longsword', type: 'weapon', description: '+1 magical sword', equipped: true, notes: 'Found in the dragon\'s lair' }
    ];
    inventoryData.items.consumables = [
        { id: '2', name: 'Potion of Healing', type: 'consumable', description: 'Restores 2d4+2 hit points', quantity: 3 }
    ];
    inventoryData.items.general = [
        { id: '3', name: 'Rope', type: 'general', description: '50 feet of hempen rope', equipped: false, notes: '' }
    ];
    renderInventory();
}

// Render all inventory sections
function renderInventory() {
    renderCurrency();
    renderEquippedItems();
    renderConsumables();
    renderGeneralItems();
}

function renderCurrency() {
    document.getElementById('copperAmount').textContent = inventoryData.currency.copper;
    document.getElementById('silverAmount').textContent = inventoryData.currency.silver;
    document.getElementById('goldAmount').textContent = inventoryData.currency.gold;
    document.getElementById('platinumAmount').textContent = inventoryData.currency.platinum;
    document.getElementById('emeraldAmount').textContent = inventoryData.currency.emerald;
}

function renderEquippedItems() {
    const container = document.getElementById('equippedItems');
    if (inventoryData.items.equipped.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-shield"></i><p>No equipped items</p></div>';
        return;
    }
    container.innerHTML = inventoryData.items.equipped.map(item => createItemCard(item, true)).join('');
}

function renderConsumables() {
    const container = document.getElementById('consumableItems');
    if (inventoryData.items.consumables.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-droplet"></i><p>No consumables</p></div>';
        return;
    }
    container.innerHTML = inventoryData.items.consumables.map(item => createItemCard(item, false, true)).join('');
}

function renderGeneralItems() {
    const container = document.getElementById('generalItems');
    if (inventoryData.items.general.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-box"></i><p>No general items</p></div>';
        return;
    }
    container.innerHTML = inventoryData.items.general.map(item => createItemCard(item)).join('');
}

function createItemCard(item, showEquipped = false, isConsumable = false) {
    return `
        <div class="item-card" onclick="window.openEditModal('${item.id}')">
            <div class="item-header">
                <div>
                    ${isConsumable ? `<span class="consumable-count">${item.quantity}</span>` : ''}
                    <span class="item-name">${item.name}</span>
                </div>
                <div>
                    ${showEquipped ? '<span class="equipped-badge">Equipped</span>' : ''}
                    <span class="item-type">${getTypeLabel(item.type)}</span>
                </div>
            </div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
        </div>
    `;
}

function getTypeLabel(type) {
    const labels = {
        weapon: 'Weapon',
        armor: 'Armor',
        consumable: 'Consumable',
        general: 'General'
    };
    return labels[type] || type;
}

// Add new item
window.addItem = function() {
    const name = document.getElementById('itemName').value;
    const type = document.getElementById('itemType').value;
    const description = document.getElementById('itemDescription').value;
    const equipped = document.getElementById('itemEquipped').checked;
    const quantity = document.getElementById('itemQuantity').value;

    const newItem = {
        id: Date.now().toString(),
        name,
        type,
        description,
        equipped: type !== 'consumable' && equipped,
        notes: '',
        ...(type === 'consumable' && { quantity: parseInt(quantity) })
    };

    if (type === 'consumable') {
        inventoryData.items.consumables.push(newItem);
    } else if (equipped) {
        inventoryData.items.equipped.push(newItem);
    } else {
        inventoryData.items.general.push(newItem);
    }

    // Here you would save to Firebase
    // saveToFirebase(inventoryData);

    renderInventory();
    bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
    document.getElementById('addItemForm').reset();
};

// Delete item
window.deleteItem = function(itemId) {
    inventoryData.items.equipped = inventoryData.items.equipped.filter(item => item.id !== itemId);
    inventoryData.items.consumables = inventoryData.items.consumables.filter(item => item.id !== itemId);
    inventoryData.items.general = inventoryData.items.general.filter(item => item.id !== itemId);
    
    // Here you would update Firebase
    // saveToFirebase(inventoryData);
    
    renderInventory();
};

// Open edit modal
window.openEditModal = function(itemId) {
    let item = [...inventoryData.items.equipped, ...inventoryData.items.general, ...inventoryData.items.consumables]
        .find(i => i.id === itemId);
    
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemDescription').value = item.description || '';
    document.getElementById('editItemNotes').value = item.notes || '';
    
    if (item.type === 'consumable') {
        document.getElementById('editEquippedField').style.display = 'none';
        document.getElementById('editQuantityField').style.display = 'block';
        document.getElementById('editItemQuantity').value = item.quantity || 1;
    } else {
        document.getElementById('editEquippedField').style.display = 'block';
        document.getElementById('editQuantityField').style.display = 'none';
        document.getElementById('editItemEquipped').checked = item.equipped || false;
    }

    const editModal = new bootstrap.Modal(document.getElementById('editItemModal'));
    editModal.show();
};

// Adjust quantity in edit modal
window.adjustEditQuantity = function(change) {
    const quantityInput = document.getElementById('editItemQuantity');
    let currentValue = parseInt(quantityInput.value) || 1;
    currentValue += change;
    if (currentValue < 1) currentValue = 1;
    quantityInput.value = currentValue;
};

// Save edited item
window.saveEditedItem = function() {
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value;
    const description = document.getElementById('editItemDescription').value;
    const notes = document.getElementById('editItemNotes').value;

    let item = [...inventoryData.items.equipped, ...inventoryData.items.general, ...inventoryData.items.consumables]
        .find(i => i.id === itemId);
    
    if (item) {
        item.name = name;
        item.description = description;
        item.notes = notes;

        if (item.type === 'consumable') {
            const newQuantity = parseInt(document.getElementById('editItemQuantity').value) || 1;
            item.quantity = newQuantity;
            
            if (newQuantity <= 0) {
                inventoryData.items.consumables = inventoryData.items.consumables.filter(i => i.id !== itemId);
            }
        } else {
            const equipped = document.getElementById('editItemEquipped').checked;
            const wasEquipped = item.equipped;
            item.equipped = equipped;

            if (wasEquipped !== equipped) {
                if (equipped) {
                    inventoryData.items.general = inventoryData.items.general.filter(i => i.id !== itemId);
                    inventoryData.items.equipped.push(item);
                } else {
                    inventoryData.items.equipped = inventoryData.items.equipped.filter(i => i.id !== itemId);
                    inventoryData.items.general.push(item);
                }
            }
        }

        // Here you would update Firebase
        // saveToFirebase(inventoryData);

        renderInventory();
        bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
    }
};

// Delete item from modal
window.deleteItemFromModal = function() {
    const itemId = document.getElementById('editItemId').value;
    if (confirm('Are you sure you want to delete this item?')) {
        window.deleteItem(itemId);
        bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
    }
};

// Open currency modal
window.openCurrencyModal = function(type) {
    document.getElementById('currencyType').value = type;
    document.getElementById('currentCurrencyAmount').textContent = inventoryData.currency[type];
    document.getElementById('currencyChangeAmount').value = 0;
    
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById('currencyModalLabel').textContent = `Manage ${typeCapitalized}`;
    
    const currencyModal = new bootstrap.Modal(document.getElementById('currencyModal'));
    currencyModal.show();
};

// Adjust currency
window.adjustCurrency = function(action) {
    const type = document.getElementById('currencyType').value;
    const amount = parseInt(document.getElementById('currencyChangeAmount').value) || 0;
    
    if (action === 'add') {
        inventoryData.currency[type] += amount;
    } else if (action === 'subtract') {
        inventoryData.currency[type] -= amount;
        if (inventoryData.currency[type] < 0) inventoryData.currency[type] = 0;
    } else if (action === 'set') {
        inventoryData.currency[type] = amount;
        if (inventoryData.currency[type] < 0) inventoryData.currency[type] = 0;
    }

    document.getElementById('currentCurrencyAmount').textContent = inventoryData.currency[type];
    renderCurrency();

    // Here you would update Firebase
    // saveToFirebase(inventoryData);
};

// Show/hide quantity field based on item type
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('itemType').addEventListener('change', function() {
        const quantityField = document.getElementById('quantityField');
        const equippedField = document.getElementById('equippedField');
        
        if (this.value === 'consumable') {
            quantityField.style.display = 'block';
            equippedField.style.display = 'none';
        } else {
            quantityField.style.display = 'none';
            equippedField.style.display = 'block';
        }
    });

    // Initialize with sample data on load
    initializeSampleData();
});