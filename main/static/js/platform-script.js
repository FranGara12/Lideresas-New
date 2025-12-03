// ============================================
// VARIABLES GLOBALES
// ============================================

let documents = [];
let selectedFiles = null;
let categoryToDelete = null;
let previewBox = null;

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄',
        doc: '📋',
        docx: '📋',
        xls: '📊',
        xlsx: '📊',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️'
    };
    return icons[ext] || '📎';
}

// ============================================
// FUNCIONES PARA DOCUMENTOS
// ============================================

async function loadRecentDocuments() {
    try {
        console.log('📂 Cargando documentos recientes...');
        const response = await fetch('/api/documents/recent/');
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.documents) {
            const recentContainer = document.getElementById('recentDocuments');
            if (recentContainer) {
                if (data.documents.length === 0) {
                    recentContainer.innerHTML = '<p class="no-documents">No hay documentos recientes</p>';
                    return;
                }
                
                recentContainer.innerHTML = data.documents.map(doc => `
                    <div class="document-card" data-category="${doc.category_slug || 'otros'}">
                        <div class="document-icon">${doc.icon}</div>
                        <div class="document-name">${doc.name}</div>
                        <div class="document-info">
                            <span>${doc.size}</span>
                            <span>${doc.date}</span>
                        </div>
                        <div class="document-category">${doc.category}</div>
                    </div>
                `).join('');
                
                console.log(`✅ ${data.documents.length} documentos recientes cargados`);
            }
        }
    } catch (error) {
        console.error('Error cargando documentos recientes:', error);
        const recentContainer = document.getElementById('recentDocuments');
        if (recentContainer) {
            recentContainer.innerHTML = '<p class="no-documents">Error cargando documentos</p>';
        }
    }
}

async function loadAllDocuments() {
    try {
        console.log('📂 Cargando todos los documentos...');
        const response = await fetch('/api/documents/');
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.documents) {
            const allContainer = document.getElementById('allDocuments');
            if (allContainer) {
                if (data.documents.length === 0) {
                    allContainer.innerHTML = '<p class="no-documents">No hay documentos subidos aún</p>';
                    return;
                }
                
                allContainer.innerHTML = data.documents.map(doc => `
                    <div class="document-card" data-category="${doc.category_slug || 'otros'}">
                        <div class="document-icon">${doc.icon}</div>
                        <div class="document-name">${doc.name}</div>
                        <div class="document-info">
                            <span>${doc.size}</span>
                            <span>${doc.date}</span>
                        </div>
                        <div class="document-category">${doc.category}</div>
                        <div class="document-actions">
                            <button class="doc-action-btn doc-download" onclick="downloadDocument(${doc.id})">
                                ⬇️ Descargar
                            </button>
                            <button class="doc-action-btn doc-delete" onclick="deleteDocument(${doc.id})">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                `).join('');
                
                // Actualizar la variable local documents
                documents = data.documents.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    category: doc.category_slug || 'otros',
                    date: doc.date,
                    size: doc.size,
                    icon: doc.icon
                }));
                
                console.log(`✅ ${data.documents.length} documentos cargados en total`);
            }
        }
    } catch (error) {
        console.error('Error cargando todos los documentos:', error);
        const allContainer = document.getElementById('allDocuments');
        if (allContainer) {
            allContainer.innerHTML = '<p class="no-documents">Error cargando documentos</p>';
        }
    }
}

async function updateDashboardStats() {
    try {
        console.log('Actualizando estadísticas...');
        // Aquí podrías recargar la página si es necesario
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

async function downloadDocument(id) {
    try {
        const doc = documents.find(d => d.id === id);
        if (doc) {
            alert(`📥 Descargando: ${doc.name}`);
            // window.open(`/api/documents/${id}/download/`, '_blank');
        }
    } catch (error) {
        console.error('Error descargando documento:', error);
        alert('Error al descargar el documento');
    }
}

async function deleteDocument(id) {
    if (confirm('¿Estás segura de eliminar este documento?')) {
        try {
            // Implementar la llamada al backend para eliminar
            // const response = await fetch(`/api/documents/${id}/delete/`, {
            //     method: 'DELETE',
            //     headers: {
            //         'X-CSRFToken': getCookie('csrftoken')
            //     }
            // });
            
            documents = documents.filter(d => d.id !== id);
            loadAllDocuments();
            loadRecentDocuments();
            alert('🗑️ Documento eliminado');
        } catch (error) {
            console.error('Error eliminando documento:', error);
            alert('Error al eliminar el documento');
        }
    }
}

// ============================================
// MANEJO DE ARCHIVOS
// ============================================

function handleFiles(files) {
    if (files.length === 0) return;

    selectedFiles = files;
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) uploadBtn.disabled = false;

    // VISTA PREVIA
    if (previewBox) {
        previewBox.innerHTML = "";

        [...files].forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'preview-item';

            const isImage = file.type.startsWith("image/");
            const sizeKB = (file.size / 1024).toFixed(1);

            if (isImage) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.className = 'preview-thumb';
                fileDiv.appendChild(img);
            } else {
                const icon = document.createElement('div');
                icon.className = 'preview-icon';
                icon.textContent = "📄";
                fileDiv.appendChild(icon);
            }

            const info = document.createElement('div');
            info.className = 'preview-info';
            info.innerHTML = `<strong>${file.name}</strong><br>${sizeKB} KB`;
            fileDiv.appendChild(info);

            previewBox.appendChild(fileDiv);
        });

        const uploadArea = document.getElementById('uploadArea');
        const uploadText = uploadArea?.querySelector('p');
        if (uploadText) {
            uploadText.textContent = "Archivo listo para subir";
        }
    }
}

// ============================================
// SUBIR DOCUMENTOS
// ============================================

async function uploadDocuments() {
    if (!selectedFiles || selectedFiles.length === 0) {
        alert('Por favor, selecciona al menos un archivo');
        return;
    }
    
    console.log('=== INICIANDO SUBIDA ===');
    console.log('Archivos seleccionados:', selectedFiles);
    
    const categorySelect = document.getElementById('categorySelect');
    const category = categorySelect ? categorySelect.value : null;
    const tags = document.getElementById('tagsInput') ? document.getElementById('tagsInput').value : '';
    const notes = document.getElementById('notesInput') ? document.getElementById('notesInput').value : '';
    
    console.log('Datos del formulario:');
    console.log('  - Categoría:', category);
    console.log('  - Tags:', tags);
    console.log('  - Notes:', notes);
    
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = 'Preparando...';
    
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) uploadBtn.disabled = true;
    
    try {
        const formData = new FormData();
        
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files[]', selectedFiles[i]);
            formData.append('files', selectedFiles[i]);
        }
        
        if (category && category !== 'none' && category !== 'undefined') {
            formData.append('category', category);
        }
        if (tags) formData.append('tags', tags);
        if (notes) formData.append('notes', notes);
        
        console.log('=== CONTENIDO DE FORMDATA ===');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ', pair[1]);
        }
        
        const csrftoken = getCookie('csrftoken');
        console.log('CSRF Token:', csrftoken);
        
        if (progressFill) progressFill.style.width = '30%';
        if (progressText) progressText.textContent = 'Enviando...';
        
        const response = await fetch('/api/documents/upload/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData
        });
        
        console.log('Respuesta recibida. Estado:', response.status);
        
        const responseText = await response.text();
        console.log('Respuesta en texto:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            throw new Error('Respuesta inválida del servidor');
        }
        
        console.log('Datos parseados:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }
        
        if (data.success) {
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '¡Completado!';
            
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
                if (uploadBtn) uploadBtn.disabled = false;
                
                resetUploadForm();
                
                alert(data.message || '✅ Documentos subidos exitosamente!');
                
                window.location.reload();
                
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        
        if (progressContainer) progressContainer.style.display = 'none';
        if (uploadBtn) uploadBtn.disabled = false;
        
        alert(`❌ Error al subir: ${error.message}`);
    }
}

function resetUploadForm() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    selectedFiles = null;
    
    const tagsInput = document.getElementById('tagsInput');
    const notesInput = document.getElementById('notesInput');
    if (tagsInput) tagsInput.value = '';
    if (notesInput) notesInput.value = '';
    
    if (previewBox) previewBox.innerHTML = '';
    
    const uploadArea = document.getElementById('uploadArea');
    const uploadText = uploadArea?.querySelector('p');
    if (uploadText) {
        uploadText.textContent = 'o haz clic para seleccionar';
    }
}

// ============================================
// FUNCIONES PARA BÚSQUEDA
// ============================================

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<p class="no-results">No se encontraron resultados</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="documents-grid">
            ${results.map(doc => `
                <div class="document-card">
                    <div class="document-icon">${doc.icon}</div>
                    <div class="document-name">${doc.name}</div>
                    <div class="document-info">
                        <span>${doc.size}</span>
                        <span>${doc.date}</span>
                    </div>
                    <div class="document-category">${doc.category}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// FUNCIONES PARA CATEGORÍAS
// ============================================

async function updateCategorySelect() {
    try {
        console.log('Cargando categorías del usuario...');
        
        const response = await fetch('/api/categories/user/');
        
        if (!response.ok) {
            console.warn('No se pudieron cargar las categorías. Usando opciones por defecto.');
            return;
        }
        
        const data = await response.json();
        console.log('Categorías recibidas:', data);
        
        if (data.success && data.categories && data.categories.length > 0) {
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                let options = '<option value="none">Sin categoría</option>';
                data.categories.forEach(cat => {
                    options += `<option value="${cat.id}">${cat.name} ${cat.icon}</option>`;
                });
                options += '<option value="otros">Otros</option>';
                categorySelect.innerHTML = options;
                console.log('Select de categorías actualizado');
            }
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const categoryModal = document.getElementById('categoryModal');
    const deleteModal = document.getElementById('deleteModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const categoryForm = document.getElementById('categoryForm');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    // ============================================
    // PREVIEW DE ARCHIVOS
    // ============================================
    if (uploadArea && !previewBox) {
        previewBox = document.createElement('div');
        previewBox.className = 'file-preview';
        uploadArea.appendChild(previewBox);
    }

    // ============================================
    // MODALES DE CATEGORÍAS
    // ============================================

    if (openModalBtn) {
        openModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            categoryModal.style.display = 'flex';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            categoryModal.style.display = 'none';
            categoryForm.reset();
        });
    }

    window.addEventListener('click', function(event) {
        if (event.target == categoryModal) {
            categoryModal.style.display = 'none';
            categoryForm.reset();
        }
        if (event.target == deleteModal) {
            deleteModal.style.display = 'none';
            categoryToDelete = null;
        }
    });

    if (categoryForm) {
        categoryForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('categoryName').value;
            const icon = document.getElementById('categoryIcon').value || '📁';
            
            try {
                const response = await fetch('/api/categories/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ name, icon })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const grid = document.getElementById('categoriesGrid');
                    const noCategories = grid.querySelector('.no-categories');
                    if (noCategories) noCategories.remove();
                    
                    const categoryCard = document.createElement('div');
                    categoryCard.className = 'category-card';
                    categoryCard.setAttribute('data-category-id', data.category.id);
                    categoryCard.innerHTML = `
                        <div class="category-icon">${data.category.icon}</div>
                        <h3>${data.category.name}</h3>
                        <p class="category-count">${data.category.document_count} documentos</p>
                        <button class="delete-category-btn" data-id="${data.category.id}" title="Eliminar categoría">❌</button>
                    `;
                    grid.appendChild(categoryCard);
                    
                    const deleteBtn = categoryCard.querySelector('.delete-category-btn');
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        categoryToDelete = this.getAttribute('data-id');
                        deleteModal.style.display = 'flex';
                    });
                    
                    categoryModal.style.display = 'none';
                    categoryForm.reset();
                    
                    alert('¡Categoría creada exitosamente!');
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al crear la categoría: ' + error.message);
            }
        });
    }

    const deleteButtons = document.querySelectorAll('.delete-category-btn');
    
    deleteButtons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            categoryToDelete = this.getAttribute('data-id');
            deleteModal.style.display = 'flex';
        });
    });

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
            categoryToDelete = null;
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            if (!categoryToDelete) return;
            
            try {
                const response = await fetch(`/api/categories/${categoryToDelete}/delete/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const card = document.querySelector(`[data-category-id="${categoryToDelete}"]`);
                    if (card) card.remove();
                    
                    const grid = document.getElementById('categoriesGrid');
                    if (grid.children.length === 0) {
                        grid.innerHTML = '<div class="no-categories"><p>No tienes categorías aún. ¡Crea tu primera categoría!</p></div>';
                    }
                    
                    deleteModal.style.display = 'none';
                    categoryToDelete = null;
                    alert('Categoría eliminada exitosamente');
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al eliminar la categoría');
            }
        });
    }

    // ============================================
    // NAVEGACIÓN
    // ============================================

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.dataset.section;
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');
            
            const titles = {
                dashboard: 'Dashboard',
                documents: 'Mis Documentos',
                upload: 'Subir Archivos',
                categories: 'Categorías',
                search: 'Búsqueda'
            };
            document.querySelector('.page-title').textContent = titles[section];
            
            if (section === 'documents') {
                loadAllDocuments();
            } else if (section === 'dashboard') {
                loadRecentDocuments();
            }
        });
    });

    // ============================================
    // MANEJO DE ARCHIVOS
    // ============================================

    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            handleFiles(files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadDocuments);
    }

    // ============================================
    // FILTROS DE DOCUMENTOS
    // ============================================

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            const cards = document.querySelectorAll('.document-card');
            
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // ============================================
    // BÚSQUEDA
    // ============================================

    const searchInput = document.getElementById('searchInput');
    const mainSearchInput = document.getElementById('mainSearchInput');

    [searchInput, mainSearchInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const results = documents.filter(doc => 
                    doc.name.toLowerCase().includes(term) ||
                    doc.category.toLowerCase().includes(term)
                );
                
                if (input === mainSearchInput) {
                    displaySearchResults(results);
                }
            });
        }
    });

    // ============================================
    // CARGA INICIAL
    // ============================================
    
    loadRecentDocuments();
    loadAllDocuments();
    updateCategorySelect();
});

// Hacer funciones disponibles globalmente
window.downloadDocument = downloadDocument;
window.deleteDocument = deleteDocument;