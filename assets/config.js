// Conexión con la base de datos del panel (Supabase).
// La clave publicable es pública por diseño: solo permite llamar a recibir_solicitud();
// leer leads exige entrar en el panel con un correo autorizado.
window.PIMEN_CONFIG = {
  supabaseUrl: "https://pvcmgwmlluowpylzovax.supabase.co",
  supabaseKey: "sb_publishable_NK6M6CF_AOKrb0iSRmYSEw_wiFc8-xj",
  // Google Analytics 4 (ver assets/medicion.js). Vacío = no se carga.
  analytics: { id: "G-0ZWVTGY5SD" },
  // Google Ads (ver assets/medicion.js). Vacío = no se carga nada de Google ni se muestra el aviso de cookies.
  googleAds: {
    id: "AW-18539765621",    // cuenta de Google Ads de Pimen Reformas
    conversionLead: "4LekCJTFl6sdEPW-uYhF",     // "Envío de formulario" (principal)
    conversionContacto: "m53oCN71o6sdEPW-uYhF"  // "Llamada o WhatsApp"
  }
};
