// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Archivo para persistir comentarios
const COMMENTS_FILE = path.join(__dirname, 'comments.json');

// Función para cargar comentarios desde archivo
function loadComments() {
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error cargando comentarios:', error);
  }
  return [];
}

// Función para guardar comentarios en archivo
function saveComments(comments) {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
  } catch (error) {
    console.error('Error guardando comentarios:', error);
  }
}

// Views y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sesiones
app.use(session({
  secret: 's3cr3t_93hjsdf82hfsd89h2klsdjf82hsdf8jskd82jsd9fhsd8fjksdh2', // en producción cambia esto
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
}));

// Cargar comentarios al iniciar
let comments = loadComments();

// Ruta principal: renderiza tu HTML convertido a EJS (ver views/index.ejs)
app.get('/', (req, res) => {
  res.render('index', { comentarios: comments });
});

// API para obtener comentarios (útil si quieres refrescar desde JS)
app.get('/comentarios', (req, res) => {
  res.json({ comentarios: comments });
});

// API/endpoint para agregar comentario.
// Soporta envío JSON (fetch) y envío normal de formulario (urlencoded).
app.post('/comentarios', (req, res) => {
  const texto = (req.body.comentario || '').trim();

  if (!texto) {
    // Si fue AJAX JSON
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Comentario vacío' });
    }
    // Si fue formulario clásico, redirigimos de vuelta
    return res.redirect('/');
  }

  // Crear nuevo comentario con fecha y hora
  const nuevoComentario = {
    id: Date.now(), // ID único basado en timestamp
    texto: texto,
    fecha: new Date().toLocaleDateString('es-ES'),
    hora: new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    timestamp: new Date().toISOString()
  };

  // Agregar comentario al array
  comments.push(nuevoComentario);
  
  // Guardar en archivo
  saveComments(comments);

  // Si fue petición AJAX JSON, respondemos JSON
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    return res.json({ success: true, comentarios: comments });
  }

  // Si fue submit normal, redirigimos a la página principal
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
