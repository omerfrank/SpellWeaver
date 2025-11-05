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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadInventoryFromServer();
    
    // Show/hide quantity field based on item type
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
});

/**
 * Load inventory data from the server
 */
async function loadInventoryFromServer() {
    try {
        const characterId = localStorage.getItem('selectedCharacterId');
        
        if (!characterId) {
            console.error('No character selected');
            showError('No character selected. Please select a character.');
            return;
        }

        showLoading(true);

        const response = await fetch(`/api/game/loadInventory/${characterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            const serverInventory = result.inventory;
            
            // Merge server data with local structure (to handle missing fields)
            if (serverInventory.currency) {
                inventoryData.currency = { ...inventoryData.currency, ...serverInventory.currency };
            }
            
            if (serverInventory.items) {
                inventoryData.items.equipped = serverInventory.items.equipped || [];
                inventoryData.items.consumables = serverInventory.items.consumables || [];
                inventoryData.items.general = serverInventory.items.general || [];
            }
            
            renderInventory();
        } else {
            throw new Error(result.message || 'Failed to load inventory');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showError(`Failed to load inventory: ${error.message}`);
        // Still render with empty data
        renderInventory();
    } finally {
        showLoading(false);
    }
}

/**
 * Save inventory data to the server
 */
async function saveInventoryToServer() {
    try {
        const characterId = localStorage.getItem('selectedCharacterId');
        
        if (!characterId) {
            console.error('No character selected');
            return false;
        }

        const response = await fetch(`/api/game/saveInventory/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inventoryData)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message || 'Failed to save inventory');
        }
    } catch (error) {
        console.error('Error saving inventory:', error);
        showError(`Failed to save inventory: ${error.message}`);
        return false;
    }
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    if (show) {
        if (!document.getElementById('inventoryLoadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'inventoryLoadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(44, 47, 51, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p style="color: #ffffff; margin-top: 20px;">Loading inventory...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        const overlay = document.getElementById('inventoryLoadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.querySelector('.container.mt-4');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    }
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const container = document.querySelector('.container.mt-4');
    
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.role = 'alert';
    successDiv.innerHTML = `
        <i class="bi bi-check-circle-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
    }
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
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
window.addItem = async function() {
    const name = document.getElementById('itemName').value;
    const type = document.getElementById('itemType').value;
    const description = document.getElementById('itemDescription').value;
    const equipped = document.getElementById('itemEquipped').checked;
    const quantity = document.getElementById('itemQuantity').value;

    if (!name) {
        showError('Item name is required');
        return;
    }

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

    // Save to Firebase
    const success = await saveInventoryToServer();
    
    if (success) {
        renderInventory();
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        document.getElementById('addItemForm').reset();
        showSuccess('Item added successfully');
    }
};

// Delete item
window.deleteItem = async function(itemId) {
    inventoryData.items.equipped = inventoryData.items.equipped.filter(item => item.id !== itemId);
    inventoryData.items.consumables = inventoryData.items.consumables.filter(item => item.id !== itemId);
    inventoryData.items.general = inventoryData.items.general.filter(item => item.id !== itemId);
    
    // Save to Firebase
    await saveInventoryToServer();
    
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
window.saveEditedItem = async function() {
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

        // Save to Firebase
        const success = await saveInventoryToServer();
        
        if (success) {
            renderInventory();
            bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
            showSuccess('Item updated successfully');
        }
    }
};

// Delete item from modal
window.deleteItemFromModal = function() {
    const itemId = document.getElementById('editItemId').value;
    if (confirm('Are you sure you want to delete this item?')) {
        window.deleteItem(itemId);
        bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
        showSuccess('Item deleted successfully');
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
window.adjustCurrency = async function(action) {
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

    // Save to Firebase
    await saveInventoryToServer();
};