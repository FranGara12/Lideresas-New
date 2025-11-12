// Estado de la aplicación
let documents = [
    {
        id: 1,
        name: "Factura_enero_2024.pdf",
        category: "facturas",
        date: "2024-01-15",
        size: "245 KB",
        icon: "📄"
    },
    {
        id: 2,
        name: "Contrato_servicios.docx",
        category: "contratos",
        date: "2024-01-10",
        size: "180 KB",
        icon: "📋"
    },
    {
        id: 3,
        name: "Reporte_mensual.xlsx",
        category: "otros",
        date: "2024-01-20",
        size: "320 KB",
        icon: "📊"
    }
];

let selectedFiles = null;

// Navegación entre secciones
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Actualizar nav activo
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Mostrar sección correspondiente
        const section = item.dataset.section;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        // Actualizar título del header
        const titles = {
            dashboard: 'Dashboard',
            documents: 'Mis Documentos',
            upload: 'Subir Archivos',
            categories: 'Categorías',
            search: 'Búsqueda'
        };
        document.querySelector('.page-title').textContent = titles[section];
        
        // Renderizar documentos si es necesario
        if (section === 'documents' || section === 'dashboard') {
            renderDocuments();
        }
    });
});

// Renderizar documentos
function renderDocuments() {
    const recentContainer = document.getElementById('recentDocuments');
    const allContainer = document.getElementById('allDocuments');
    
    const documentHTML = documents.map(doc => `
        <div class="document-card" data-category="${doc.category}">
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
    
    if (recentContainer) {
        recentContainer.innerHTML = documentHTML;
    }
    if (allContainer) {
        allContainer.innerHTML = documentHTML;
    }
}

// Filtros de documentos
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

// Manejo de archivos - Drag and Drop
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

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

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        selectedFiles = files;
        uploadBtn.disabled = false;
        
        // Actualizar UI para mostrar archivos seleccionados
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        uploadArea.querySelector('p').textContent = `Archivos seleccionados: ${fileNames}`;
    }
}

// Subir documento
uploadBtn.addEventListener('click', async () => {
    if (!selectedFiles) return;
    
    const category = document.getElementById('categorySelect').value;
    const tags = document.getElementById('tagsInput').value;
    const notes = document.getElementById('notesInput').value;
    
    // Mostrar progreso
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'block';
    uploadBtn.disabled = true;
    
    // Simular upload
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + '%';
        progressText.textContent = `Subiendo... ${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // Agregar documento a la lista
            Array.from(selectedFiles).forEach(file => {
                const newDoc = {
                    id: documents.length + 1,
                    name: file.name,
                    category: category,
                    date: new Date().toISOString().split('T')[0],
                    size: formatFileSize(file.size),
                    icon: getFileIcon(file.name)
                };
                documents.unshift(newDoc);
            });
            
            // Resetear form
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressFill.style.width = '0%';
                uploadBtn.disabled = true;
                fileInput.value = '';
                selectedFiles = null;
                document.getElementById('tagsInput').value = '';
                document.getElementById('notesInput').value = '';
                uploadArea.querySelector('p').textContent = 'o haz clic para seleccionar';
                
                // Mostrar mensaje de éxito
                alert('✅ Documento subido exitosamente!');
                
                // Renderizar documentos actualizados
                renderDocuments();
            }, 500);
        }
    }, 200);
});

// Funciones auxiliares
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

function downloadDocument(id) {
    const doc = documents.find(d => d.id === id);
    alert(`📥 Descargando: ${doc.name}`);
}

function deleteDocument(id) {
    if (confirm('¿Estás segura de eliminar este documento?')) {
        documents = documents.filter(d => d.id !== id);
        renderDocuments();
        alert('🗑️ Documento eliminado');
    }
}

// Búsqueda
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

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    
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

// Inicializar
renderDocuments();