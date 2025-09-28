document.addEventListener('DOMContentLoaded', function() {
	// Año dinámico del footer
	var yearEl = document.getElementById('year');
	if (yearEl) yearEl.textContent = new Date().getFullYear();

	// --- Lightbox (si existe) ---
	var lightbox = document.getElementById('lightbox');
	if (lightbox) {
		var lightboxImg = lightbox.querySelector('.lightbox__img');
		var lightboxCaption = lightbox.querySelector('.lightbox__caption');
		var closeBtn = lightbox.querySelector('.lightbox__close');
		var prevBtn = lightbox.querySelector('.lightbox__prev');
		var nextBtn = lightbox.querySelector('.lightbox__next');

		var galleryImages = Array.prototype.slice.call(document.querySelectorAll('.grid-galeria img'));
		var currentIndex = -1;

		function getFullSrc(img) {
			return img.getAttribute('data-full') || img.src;
		}

		function updateLightboxByIndex(index) {
			if (index < 0 || index >= galleryImages.length) return;
			var img = galleryImages[index];
			lightboxImg.src = getFullSrc(img);
			lightboxImg.alt = img.alt || '';
			var fig = img.closest('figure');
			var caption = fig ? fig.querySelector('figcaption') : null;
			lightboxCaption.textContent = caption ? caption.textContent : '';
			currentIndex = index;
		}

		function openLightboxAt(index) {
			if (index < 0 || index >= galleryImages.length) return;
			updateLightboxByIndex(index);
			lightbox.classList.add('is-open');
			lightbox.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
		}

		function closeLightbox() {
			lightbox.classList.remove('is-open');
			lightbox.setAttribute('aria-hidden', 'true');
			lightboxImg.src = '';
			document.body.style.overflow = '';
			currentIndex = -1;
		}

		function showNext() {
			if (currentIndex === -1) return;
			var nextIndex = (currentIndex + 1) % galleryImages.length;
			updateLightboxByIndex(nextIndex);
		}

		function showPrev() {
			if (currentIndex === -1) return;
			var prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
			updateLightboxByIndex(prevIndex);
		}

		// Inicializar listeners en miniaturas
		galleryImages.forEach(function(img, idx) {
			img.style.cursor = 'zoom-in';
			img.addEventListener('click', function() { openLightboxAt(idx); });
		});

		// Cerrar al hacer clic fuera (overlay)
		lightbox.addEventListener('click', function(e) {
			if (e.target === lightbox) closeLightbox();
		});

		// Botones
		if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
		if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); showNext(); });
		if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); showPrev(); });

		// Teclado: Esc, flechas
		document.addEventListener('keydown', function(e) {
			if (!lightbox.classList.contains('is-open')) return;
			if (e.key === 'Escape') closeLightbox();
			if (e.key === 'ArrowRight') showNext();
			if (e.key === 'ArrowLeft') showPrev();
		});
	}

	// --- COMENTARIOS: render + envío con fetch ---
	function escapeHtml(str) {
		if (!str) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Función para mostrar notificaciones
	function showNotification(message, isError) {
		// Crear elemento de notificación
		var notification = document.createElement('div');
		notification.className = 'notification' + (isError ? ' error' : '');
		notification.textContent = message;
		
		// Agregar al DOM
		document.body.appendChild(notification);
		
		// Mostrar con animación
		setTimeout(function() {
			notification.classList.add('show');
		}, 100);
		
		// Ocultar después de 3 segundos
		setTimeout(function() {
			notification.classList.remove('show');
			setTimeout(function() {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}, 3000);
	}

	function renderComments(comments) {
		var container = document.getElementById('comments-list');
		if (!container) return;
		if (!comments || comments.length === 0) {
			container.innerHTML = '<p id="no-comments">No hay comentarios todavía.</p>';
			return;
		}
		container.innerHTML = comments.map(function(comment) {
			var isNew = comment.id && comment.id > (Date.now() - 5000); // Comentario nuevo si es de los últimos 5 segundos
			return '<div class="comment' + (isNew ? ' new-comment' : '') + '" data-id="' + (comment.id || '') + '">' +
				'<div class="comment-content">' + escapeHtml(comment.texto || comment) + '</div>' +
				'<div class="comment-meta">' +
					'<span class="comment-date">' + escapeHtml(comment.fecha || '') + '</span>' +
					'<span class="comment-time">' + escapeHtml(comment.hora || '') + '</span>' +
				'</div>' +
			'</div>';
		}).join('');
	}

	// Pintar comentarios iniciales (inyectados desde el servidor en index.ejs)
	if (typeof INITIAL_COMMENTS !== 'undefined') {
		renderComments(INITIAL_COMMENTS);
	} else {
		// alternativa: obtenerlos por fetch
		fetch('/comentarios').then(r => r.json()).then(d => renderComments(d.comentarios || [])).catch(()=>{});
	}

	// Manejar envío del formulario (tanto fetch como fallback HTML)
	var form = document.getElementById('comment-form');
	if (form) {
		form.addEventListener('submit', function(e) {
			// Si el navegador tiene JS, manejamos por fetch (evitamos recarga)
			e.preventDefault();
			var textarea = document.getElementById('comment-text');
			if (!textarea) return;
			var text = textarea.value.trim();
			if (!text) return;

			fetch('/comentarios', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify({ comentario: text })
			})
			.then(function(res) {
				if (!res.ok) return res.json().then(function(err){ throw err; });
				return res.json();
			})
			.then(function(data) {
				if (data && data.comentarios) {
					renderComments(data.comentarios);
					textarea.value = '';
					textarea.focus();
					showNotification('Comentario enviado ✅');
				}
			})
			.catch(function(err) {
				console.error('Error enviando comentario:', err);
				showNotification('Error al enviar comentario', true);
				// en caso de error, podemos intentar submit normal (falla segura)
				// form.submit();
			});
		});
	}
});
