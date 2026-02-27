


// 1. Importamos las herramientas necesarias
import { guardarReporteDB, obtenerReportesDB } from './api.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIGURACIÓN DE SUPABASE (Necesaria para las funciones de admin/denuncia)
const supabaseUrl = 'https://vjnsihiunjfnppsejhhr.supabase.co'
const supabaseKey = 'sb_publishable_9eAGaOv5jGEs0H7Oe-HhCQ_AzQw4_av'
const supabase = createClient(supabaseUrl, supabaseKey);

const map = L.map('map').setView([-31.6333, -60.7000], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);


// Función para abrir/cerrar menú en móvil
window.toggleMenu = function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}





let tempCoords = {};

// 2. Función para asignar color
function getColor(categoria, status) {
    if (status === 'solucionado') return '#95a5a6'; 
    const colores = {
        'Pozos': 'red',
        'Falta de luz': 'yellow',
        'Inundaciones': 'blue',
        'Basura': 'brown',
        'Semaforos': 'orange'
    };
    return colores[categoria] || 'green';
}

// 3. Capturar click en el mapa
map.on('click', function(e) {
    tempCoords = e.latlng;
    document.getElementById('display-coords').innerText = `Lat: ${tempCoords.lat.toFixed(6)}, Lng: ${tempCoords.lng.toFixed(6)}`;
    document.getElementById('report-modal').style.display = 'block';
});

// --- FUNCIONES GLOBALES (Para que el HTML las vea) ---

window.cerrarModal = function() {
    document.getElementById('report-modal').style.display = 'none';
}

window.enviarDatos = async function() {
    const categoria = document.getElementById('category').value;
    const desc = document.getElementById('description').value;
    const inputFoto = document.getElementById('foto');
    const archivo = inputFoto.files[0]; 

    if (archivo) {
        if (!archivo.type.startsWith('image/')) {
            alert("Error: Solo se permiten archivos de imagen.");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            alert("Error: La imagen supera los 5MB.");
            return;
        }
    }

    const btn = document.querySelector('.btn-save');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    await guardarReporteDB(tempCoords.lat, tempCoords.lng, categoria, desc, archivo);
    
    alert("Reporte enviado con éxito.");
    location.reload(); 
}

window.denunciarPost = async function(id) {
    if (confirm("¿Desea reportar este contenido como inadecuado?")) {
        const { error } = await supabase
            .from('reports')
            .update({ status: 'revision' }) //           <- ESTE es el switch que activa blur        <- ESTE es el switch que activa blur
            .eq('id', id);
        if (!error) { alert("Enviado a revisión."); location.reload(); }
    }
}



window.cambiarEstado = async function(id, accion) {

    if (accion === 'aprobar') {
        const { error } = await supabase
            .from('reports')
            .update({ status: 'pendiente' })
            .eq('id', id);

        if (!error) {
            alert("Contenido aprobado.");
            location.reload();
        }
    }

    if (accion === 'borrar') {
        if (!confirm("¿Seguro que querés borrar este contenido?")) return;

        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', id);

        if (!error) {
            alert("Contenido eliminado.");
            location.reload();
        }
    }
}



// --- CARGA DE DATOS (UNIFICADA) ---

async function cargarReportes() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true'; 
    
    // Limpiamos los marcadores existentes para que no se pisen
    map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });

    const reportes = await obtenerReportesDB();

    reportes.forEach(r => {
        let contenidoPopup = "";
        
        // NORMALIZACIÓN: Pasamos el estado a minúsculas por seguridad técnica
        const estadoActual = (r.status || "pendiente").toLowerCase();
        let colorPunto = getColor(r.category, estadoActual);

        // --- 1. FILTRO DE SEGURIDAD (Si es REVISION y NO es ADMIN) ---
        if (estadoActual === 'revision' && !isAdmin) {
            colorPunto = '#000000'; 
            contenidoPopup = `
                <div style="text-align:center; padding:10px; border:2px solid red;">
                    <b style="color:red;">⚠️ FOTO EN REVISIÓN</b><br>
                    <p style="font-size:0.8em; font-weight:bold;">POSIBLE SPAM O CONTENIDO INADECUADO</p>
                    <img src="${r.foto_url}" style="width:100%; filter: blur(30px) grayscale(1); pointer-events: none; border-radius:5px;">
                    <p style="font-size:0.7em; margin-top:5px;">Contenido bloqueado preventivamente.</p>
                </div>`;
        } 
        // --- 2. VISTA ADMIN ---




                else if (isAdmin) {

                    contenidoPopup = `<b>ADMIN - Estado: ${estadoActual}</b><br>${r.description}`;

                    if (r.foto_url) {
                        contenidoPopup += `<br>
                        <img src="${r.foto_url}" 
                            style="width:100%; border:3px solid orange; margin-top:5px;">`;
                    }

                    contenidoPopup += `
                        <div style="margin-top:10px; display:grid; gap:6px;">
                            <button onclick="cambiarEstado(${r.id}, 'aprobar')" 
                                    style="background:green; color:white; border:none; padding:6px;">
                                APROBAR
                            </button>

                            <button onclick="cambiarEstado(${r.id}, 'borrar')" 
                                    style="background:red; color:white; border:none; padding:6px;">
                                BORRAR CONTENIDO
                            </button>
                        </div>`;
                }





        // --- 3. VISTA NORMAL ---
        else {
            contenidoPopup = `<b>${r.category}</b><br>${r.description}`;
            if (r.foto_url) {
                contenidoPopup += `<br><img src="${r.foto_url}" style="width:100%; margin-top:10px; border-radius:5px;">`;
            }
            contenidoPopup += `<br><button onclick="denunciarPost(${r.id})" style="color:red; font-size:0.8em; background:none; border:none; text-decoration:underline;">Reportar contenido</button>`;
        }

        L.circleMarker([r.lat, r.lng], {
            radius: 10,
            fillColor: colorPunto,
            color: "#000",
            weight: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup(contenidoPopup);
    });
}
// Ejecutar al inicio
cargarReportes();
