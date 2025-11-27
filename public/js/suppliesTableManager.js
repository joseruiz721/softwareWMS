// ==============================================
// MÓDULO: SuppliesTableManager - Gestión de tabla de repuestos con edición
// ==============================================

const SuppliesTableManager = {
    /**
     * ✅ OBJETO: Celda actualmente en edición
     */
    editingCell: null,

    /**
     * ✅ MÉTODO: Actualizar tabla de repuestos con campos editables
     */
    updateSuppliesTable: function(supplies) {
        const tableBody = document.getElementById('supplies-table-body');
        if (!tableBody) return;
        
        const filteredSupplies = this.applySupplyFilters(supplies);
        
        if (!filteredSupplies || filteredSupplies.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No hay repuestos registrados</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filteredSupplies.map(supply => {
            const statusClass = this.getSupplyStatusClass(supply);
            
            return `
                <tr data-id="${supply.id}">
                    <td>${supply.nombre || 'No especificado'}</td>
                    <td>${supply.codigo || 'No especificado'}</td>
                    <td class="stock-cell editable-cell" data-field="cantidad" data-id="${supply.id}">
                        ${supply.cantidad || 0}
                    </td>
                    <td class="min-stock-cell editable-cell" data-field="stock_minimo" data-id="${supply.id}">
                        ${supply.stock_minimo || 0}
                    </td>
                    <td class="${statusClass}">${this.getSupplyStatusText(supply)}</td>
                    <td class="action-buttons">
                        <button class="save-btn" style="display:none;">Guardar</button>
                        <button class="cancel-btn" style="display:none;">Cancelar</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Agregar event listeners para las celdas editables
        this.addCellEventListeners();
    },

    /**
     * ✅ MÉTODO: Aplicar filtros a los repuestos
     */
    applySupplyFilters: function(supplies) {
        if (!window.InventoryApp) return supplies;
        
        const filterFn = window.InventoryApp.supplyCategories[window.InventoryApp.currentSupplyCategory]?.filter;
        return filterFn ? supplies.filter(filterFn) : supplies;
    },

    /**
     * ✅ MÉTODO: Obtener clase CSS para el estado del repuesto
     */
    getSupplyStatusClass: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.stock_minimo) || 0;
        
        if (cantidad === 0) return 'status-error';
        if (cantidad <= minimo) return 'status-warning';
        return 'status-active';
    },

    /**
     * ✅ MÉTODO: Obtener texto descriptivo del estado del repuesto
     */
    getSupplyStatusText: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.stock_minimo) || 0;
        
        if (cantidad === 0) return 'Agotado';
        if (cantidad <= minimo) return 'Bajo Stock';
        return 'Disponible';
    },

    /**
     * ✅ MÉTODO: Agregar event listeners a las celdas editables
     */
    addCellEventListeners: function() {
        const editableCells = document.querySelectorAll('.editable-cell');
        
        editableCells.forEach(cell => {
            cell.addEventListener('click', (e) => this.makeCellEditable(e.target));
        });
    },

    /**
     * ✅ MÉTODO: Convierte una celda en editable
     */
    makeCellEditable: function(cell) {
        // Si ya estamos editando una celda, cancelamos esa edición primero
        if (this.editingCell) {
            this.cancelEdit(this.editingCell.cell);
        }
        
        const row = cell.closest('tr');
        const saveBtn = row.querySelector('.save-btn');
        const cancelBtn = row.querySelector('.cancel-btn');
        const originalValue = cell.textContent.trim();
        const field = cell.getAttribute('data-field');
        const supplyId = parseInt(row.getAttribute('data-id'));
        
        if (!saveBtn || !cancelBtn) {
            console.error('❌ Botones de acción no encontrados');
            return;
        }
        
        // Guardar referencia a la celda que estamos editando
        this.editingCell = {
            cell: cell,
            row: row,
            originalValue: originalValue,
            field: field,
            supplyId: supplyId
        };
        
        // Cambiar la celda a modo edición
        cell.classList.add('editing');
        cell.innerHTML = `<input type="number" class="editable-input" value="${originalValue}" min="0">`;
        
        // Mostrar botones de guardar y cancelar
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        
        // Enfocar el input
        const input = cell.querySelector('input');
        input.focus();
        input.select();
        
        // Agregar event listeners a los botones
        saveBtn.onclick = () => this.saveEdit();
        cancelBtn.onclick = () => this.cancelEdit(cell);
        
        // Permitir guardar con Enter y cancelar con Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit();
            } else if (e.key === 'Escape') {
                this.cancelEdit(cell);
            }
        });
    },

    /**
     * ✅ MÉTODO: Guarda los cambios realizados en una celda
     */
    saveEdit: async function() {
        if (!this.editingCell) return;
        
        const { cell, row, supplyId, field } = this.editingCell;
        const input = cell.querySelector('input');
        const newValue = parseInt(input.value);
        
        if (isNaN(newValue) || newValue < 0) {
            Utils.showNotification('Por favor, ingrese un valor válido (número positivo)', 'error');
            return;
        }
        
        try {
            // Actualizar el valor en la base de datos
            const updates = { [field]: newValue };
            
            const response = await fetch(`/api/repuestos/${supplyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Actualizar la celda con el nuevo valor
                cell.textContent = newValue;
                cell.classList.remove('editing');
                
                // Ocultar botones
                this.hideActionButtons(row);
                
                // Actualizar estado del repuesto
                const updatedSupply = { ...result.data };
                this.updateSupplyStatus(row, updatedSupply);
                
                // Limpiar referencia a celda en edición
                this.editingCell = null;
                
                Utils.showNotification('Cambios guardados correctamente', 'success');
                
                // Actualizar datos locales si existe InventoryApp
                if (window.InventoryApp && window.InventoryApp.currentData && window.InventoryApp.currentData.supplies) {
                    const supplyIndex = window.InventoryApp.currentData.supplies.findIndex(s => s.id === supplyId);
                    if (supplyIndex !== -1) {
                        window.InventoryApp.currentData.supplies[supplyIndex][field] = newValue;
                    }
                }
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Error al guardar:', error);
            Utils.showNotification('Error al guardar los cambios: ' + error.message, 'error');
        }
    },

    /**
     * ✅ MÉTODO: Cancela la edición de una celda
     */
    cancelEdit: function(cell) {
        if (!this.editingCell) return;
        
        const row = this.editingCell.row;
        
        // Restaurar valor original
        cell.textContent = this.editingCell.originalValue;
        cell.classList.remove('editing');
        
        // Ocultar botones
        this.hideActionButtons(row);
        
        // Limpiar referencia a celda en edición
        this.editingCell = null;
    },

    /**
     * ✅ MÉTODO: Oculta los botones de acción en una fila
     */
    hideActionButtons: function(row) {
        const saveBtn = row.querySelector('.save-btn');
        const cancelBtn = row.querySelector('.cancel-btn');
        
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    },

    /**
     * ✅ MÉTODO: Actualiza el estado del repuesto en la fila
     */
    updateSupplyStatus: function(row, supply) {
        const statusCell = row.querySelector('td:nth-child(5)');
        if (!statusCell) return;
        
        const statusClass = this.getSupplyStatusClass(supply);
        const statusText = this.getSupplyStatusText(supply);
        
        statusCell.className = statusClass;
        statusCell.textContent = statusText;
    },

    /**
     * ✅ MÉTODO: Inicializar el módulo
     */
    init: function() {
        console.log('✅ SuppliesTableManager inicializado');
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    SuppliesTableManager.init();
});

// Hacer disponible globalmente
window.SuppliesTableManager = SuppliesTableManager;