// Usamos la librería oficial de Supabase vía CDN para no instalar nada extra

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://vjnsihiunjfnppsejhhr.supabase.co'
const supabaseKey = 'sb_publishable_9eAGaOv5jGEs0H7Oe-HhCQ_AzQw4_av'
const supabase = createClient(supabaseUrl, supabaseKey)

// Función mejorada para GUARDAR reporte y FOTO
export async function guardarReporteDB(lat, lng, categoria, descripcion, fotoArchivo) {
    let fotoUrl = null;

    // 1. Si el usuario seleccionó una foto, la subimos primero
    if (fotoArchivo) {
        const nombreArchivo = `${Date.now()}_${fotoArchivo.name}`;
        const { data, error: uploadError } = await supabase.storage
            .from('fotos_reportes')
            .upload(nombreArchivo, fotoArchivo);

        if (!uploadError) {
            // Si se subió bien, pedimos el link público
            const { data: linkData } = supabase.storage.from('fotos_reportes').getPublicUrl(nombreArchivo);
            fotoUrl = linkData.publicUrl;
        } else {
            console.error("Error en Storage:", uploadError);
        }
    }

    // 2. Guardamos los datos en la tabla, incluyendo el link de la foto
    const { data, error } = await supabase
        .from('reports')
        .insert([
            { lat, lng, category: categoria, description: descripcion, foto_url: fotoUrl }
        ]);
    
    if (error) console.error("Error en DB:", error);
    return data;
}

export async function obtenerReportesDB() {
    const { data, error } = await supabase.from('reports').select('*');
    if (error) console.error("Error al obtener:", error);
    return data || [];
}


// v2
