// Conexión con la base de datos del panel (Supabase).
// La clave publicable es pública por diseño: solo permite llamar a recibir_solicitud();
// leer leads exige entrar en el panel con un correo autorizado.
// Mientras estén vacías, los formularios solo envían a Formspree.
window.PIMEN_CONFIG = {
  supabaseUrl: "",
  supabaseKey: ""
};
